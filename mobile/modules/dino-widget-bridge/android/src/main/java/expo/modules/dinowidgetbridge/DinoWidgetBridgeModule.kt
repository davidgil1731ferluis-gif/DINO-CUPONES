package expo.modules.dinowidgetbridge

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.ImageProvider
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
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URL

private const val PREFS="dinocupones_widgets"
private const val SNAPSHOT="snapshot"

private fun snapshot(context: Context): JSONObject {
  val raw=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
    .getString(SNAPSHOT,"{}") ?: "{}"
  return runCatching { JSONObject(raw) }.getOrDefault(JSONObject())
}

private val titleStyle=TextStyle(
  color=ColorProvider(Color(0xFF4B2D67)),
  fontWeight=FontWeight.Bold
)
private val bodyStyle=TextStyle(color=ColorProvider(Color(0xFF77677D)))
private val accentStyle=TextStyle(
  color=ColorProvider(Color(0xFFD86B9F)),
  fontWeight=FontWeight.Bold
)

private fun openApp(context: Context, deepLink: String) =
  actionStartActivity(
    Intent(Intent.ACTION_VIEW,Uri.parse(deepLink)).apply {
      component=ComponentName(context.packageName,context.packageName+".MainActivity")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
  )

@Composable
private fun Frame(
  context: Context,
  title: String,
  body: String,
  footer: String,
  deepLink: String,
  imagePath: String?=null
) {
  Column(
    modifier=GlanceModifier
      .fillMaxSize()
      .background(ColorProvider(Color(0xFFFFF9FC)))
      .clickable(openApp(context,deepLink))
      .padding(14.dp)
  ) {
    if (!imagePath.isNullOrBlank()) {
      val imageFile=File(imagePath)
      if (imageFile.exists()) {
        Image(
          provider=ImageProvider(Uri.fromFile(imageFile)),
          contentDescription="DinoRecuerdo",
          modifier=GlanceModifier.fillMaxWidth().height(72.dp),
          contentScale=ContentScale.Crop
        )
        Spacer(GlanceModifier.height(7.dp))
      }
    }
    Text(title,style=titleStyle)
    Spacer(GlanceModifier.height(5.dp))
    Text(body,style=bodyStyle)
    Spacer(GlanceModifier.height(6.dp))
    Text(footer,style=accentStyle)
  }
}

private fun cacheMemories(context: Context, payload: JSONObject): JSONObject {
  val incoming=payload.optJSONArray("memories") ?: JSONArray()
  val output=JSONArray()
  val directory=File(context.filesDir,"dino-widget-memories").apply { mkdirs() }

  for (index in 0 until minOf(incoming.length(),6)) {
    val memory=incoming.optJSONObject(index) ?: continue
    val mediaUrl=memory.optString("mediaUrl")
    if (mediaUrl.isNotBlank()) {
      val target=File(directory,"memory-$index.img")
      runCatching {
        URL(mediaUrl).openStream().use { input ->
          target.outputStream().use { outputStream ->
            input.copyTo(outputStream)
          }
        }
        memory.put("localPath",target.absolutePath)
      }
    }
    output.put(memory)
  }

  payload.put("memories",output)
  return payload
}

class DinoMemoriesWidget: GlanceAppWidget() {
  override suspend fun provideGlance(context: Context,id: androidx.glance.GlanceId) {
    val data=snapshot(context)
    val memories=data.optJSONArray("memories") ?: JSONArray()
    val count=memories.length()
    val index=if (count>0) ((System.currentTimeMillis()/3_600_000L)%count).toInt() else 0
    val memory=memories.optJSONObject(index) ?: JSONObject()
    val partner=data.optString("partnerName","DinoDúo")
    val caption=memory.optString("caption","Un recuerdo de ustedes 💜")
    val localPath=memory.optString("localPath","")
    provideContent {
      Frame(
        context=context,
        title="📸 $partner",
        body=caption,
        footer=if (count>1) (index+1).toString()+" de "+count+" recuerdos" else "DinoRecuerdos",
        deepLink="dinocupones://mural",
        imagePath=localPath
      )
    }
  }
}

class DinoCouponsWidget: GlanceAppWidget() {
  override suspend fun provideGlance(context: Context,id: androidx.glance.GlanceId) {
    val data=snapshot(context).optJSONObject("coupons") ?: JSONObject()
    val count=data.optInt("count",0)
    val title=data.optString("nextTitle","Sin cupones activos")
    val second=data.optString("secondTitle","")
    val emoji=data.optString("emoji","🎟️")
    provideContent {
      Frame(
        context=context,
        title="$emoji $count activos",
        body=title,
        footer=if (second.isNotBlank()) "Después: $second" else "DinoCupones",
        deepLink="dinocupones://coupons"
      )
    }
  }
}

class DinoMessagesWidget: GlanceAppWidget() {
  override suspend fun provideGlance(context: Context,id: androidx.glance.GlanceId) {
    val data=snapshot(context).optJSONObject("messages") ?: JSONObject()
    val sender=data.optString("sender","Tu persona")
    val body=data.optString("body","Sin mensajes todavía")
    val unread=data.optInt("unread",0)
    provideContent {
      Frame(
        context=context,
        title="💬 $sender",
        body=body,
        footer=if (unread>0) "$unread nuevos" else "Al día",
        deepLink="dinocupones://chat"
      )
    }
  }
}

class DinoMemoriesWidgetReceiver: GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget=DinoMemoriesWidget()
}
class DinoCouponsWidgetReceiver: GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget=DinoCouponsWidget()
}
class DinoMessagesWidgetReceiver: GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget=DinoMessagesWidget()
}

class DinoWidgetBridgeModule: Module() {
  override fun definition()=ModuleDefinition {
    Name("DinoWidgetBridge")

    AsyncFunction("setWidgetData") { json: String ->
      val context=appContext.reactContext ?: return@AsyncFunction false
      val parsed=runCatching { JSONObject(json) }.getOrDefault(JSONObject())
      val enriched=runBlocking(Dispatchers.IO) { cacheMemories(context,parsed) }

      context.getSharedPreferences(PREFS,Context.MODE_PRIVATE)
        .edit()
        .putString(SNAPSHOT,enriched.toString())
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
