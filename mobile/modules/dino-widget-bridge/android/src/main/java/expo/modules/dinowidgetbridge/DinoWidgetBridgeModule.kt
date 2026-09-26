package expo.modules.dinowidgetbridge

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
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

private const val PREFS = "dinocupones_widgets"
private const val SNAPSHOT = "snapshot"

private fun snapshot(context: Context): JSONObject {
  val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    .getString(SNAPSHOT, "{}") ?: "{}"
  return runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
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
private fun Frame(title: String, body: String, footer: String) {
  Column(
    modifier = GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFFFF9FC)))
      .padding(16.dp)
  ) {
    Text(title, style = titleStyle)
    Spacer(GlanceModifier.height(8.dp))
    Text(body, style = bodyStyle)
    Spacer(GlanceModifier.height(8.dp))
    Text(footer, style = accentStyle)
  }
}

class DinoMemoriesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
    val data = snapshot(context)
    val memory = data.optJSONObject("memory") ?: JSONObject()
    val partner = data.optString("partnerName", "DinoDúo")
    val caption = memory.optString("caption", "Un recuerdo de ustedes 💜")
    provideContent { Frame("📸 " + partner, caption, "DinoRecuerdos") }
  }
}

class DinoCouponsWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
    val data = snapshot(context).optJSONObject("coupons") ?: JSONObject()
    val count = data.optInt("count", 0)
    val title = data.optString("nextTitle", "Sin cupones activos")
    val emoji = data.optString("emoji", "🎟️")
    provideContent { Frame(emoji + " " + count + " activos", title, "DinoCupones") }
  }
}

class DinoMessagesWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: androidx.glance.GlanceId) {
    val data = snapshot(context).optJSONObject("messages") ?: JSONObject()
    val sender = data.optString("sender", "Tu persona")
    val body = data.optString("body", "Sin mensajes todavía")
    val unread = data.optInt("unread", 0)
    provideContent { Frame("💬 " + sender, body, if (unread > 0) "$unread nuevos" else "Al día") }
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
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT, json)
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
