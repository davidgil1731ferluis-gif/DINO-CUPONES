package expo.modules.dinowidgetbridge

import android.content.Context
import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.ContentScale
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.net.URL

private const val PREFS = "dinocupones_widgets"
private const val SNAPSHOT = "snapshot"
private const val MEMORY_FILE = "dinocupones_widget_memory.jpg"

private fun snapshot(context: Context): JSONObject {
  val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    .getString(SNAPSHOT, "{}") ?: "{}"
  return runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
}

private fun deepLink(context: Context, route: String): Intent =
  Intent(Intent.ACTION_VIEW, Uri.parse("dinocupones://$route")).apply {
    setPackage(context.packageName)
    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  }

private val titleStyle = TextStyle(
  color = ColorProvider(Color(0xFF4B2D67)),
  fontWeight = FontWeight.Bold
)
private val bodyStyle = TextStyle(color = ColorProvider(Color(0xFF77677D)))
private val accentStyle = TextStyle(
  color = ColorProvider(Color(0xFFD86B9F)),
  fontWeight = FontWeight.Bold
)

@Composable
private fun Frame(
  context: Context,
  route: String,
  title: String,
  body: String,
  footer: String,
  imagePath: String? = null
) {
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFFFF9FC)))
      .clickable(actionStartActivity(deepLink(context, route)))
      .padding(16.dp)
  ) {
    if (!imagePath.isNullOrBlank()) {
      val bitmap = BitmapFactory.decodeFile(imagePath)
      if (bitmap != null) {
        Image(
          provider = ImageProvider(bitmap),
          contentDescription = "DinoRecuerdo",
          modifier = GlanceModifier.fillMaxWidth().height(72.dp),
          contentScale = ContentScale.Crop
        )
        Spacer(GlanceModifier.height(8.dp))
      }
    }
    Text(title, style = titleStyle)
    Spacer(GlanceModifier.height(6.dp))
    Text(body, style = bodyStyle)
    Spacer(GlanceModifier.height(6.dp))
    Text(footer, style = accentStyle)
  }
}

class DinoMemoriesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val data = snapshot(context)
    val memory = data.optJSONObject("memory") ?: JSONObject()
    val partner = data.optString("partnerName", "DinoDúo")
    val caption = memory.optString("caption", "Un recuerdo de ustedes 💜")
    val localPath = memory.optString("localPath", "")
    provideContent {
      Frame(context, "mural", "📸 $partner", caption, "DinoRecuerdos", localPath)
    }
  }
}

class DinoCouponsWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val data = snapshot(context).optJSONObject("coupons") ?: JSONObject()
    val count = data.optInt("count", 0)
    val first = data.optString("firstTitle", "Sin cupones activos")
    val second = data.optString("secondTitle", "")
    val emoji = data.optString("emoji", "🎟️")
    val body = if (second.isBlank()) first else "$first\n• $second"
    provideContent {
      Frame(context, "coupons", "$emoji $count activos", body, "Toca para abrir Cupones")
    }
  }
}

class DinoMessagesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val data = snapshot(context).optJSONObject("messages") ?: JSONObject()
    val sender = data.optString("sender", "Tu persona")
    val body = data.optString("body", "Sin mensajes todavía")
    val unread = data.optInt("unread", 0)
    provideContent {
      Frame(
        context,
        "chat",
        "💬 $sender",
        body,
        if (unread > 0) "$unread nuevos" else "Al día"
      )
    }
  }
}

class DinoMemoriesWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = DinoMemoriesWidget()
}
class DinoCouponsWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = DinoCouponsWidget()
}
class DinoMessagesWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = DinoMessagesWidget()
}

class DinoWidgetBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DinoWidgetBridge")

    AsyncFunction("setWidgetData") { json: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val payload = runCatching { JSONObject(json) }.getOrDefault(JSONObject())

      val memory = payload.optJSONObject("memory")
      val mediaUrl = memory?.optString("mediaUrl", "").orEmpty()
      if (mediaUrl.isNotBlank()) {
        runCatching {
          val target = File(context.filesDir, MEMORY_FILE)
          URL(mediaUrl).openStream().use { input ->
            target.outputStream().use { output -> input.copyTo(output) }
          }
          memory?.put("localPath", target.absolutePath)
        }
      }

      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT, payload.toString())
        .apply()

      CoroutineScope(Dispatchers.IO).launch {
        DinoMemoriesWidget().updateAll(context)
        DinoCouponsWidget().updateAll(context)
        DinoMessagesWidget().updateAll(context)
      }
      true
    }
  }
}
