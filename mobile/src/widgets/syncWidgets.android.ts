import DinoWidgetBridge from '@/modules/dino-widget-bridge';
import type { WidgetSnapshot } from './syncWidgets';

export async function syncWidgets(snapshot: WidgetSnapshot) {
  const active=snapshot.coupons.filter((item)=>item.status==='active');
  const latestMessage=snapshot.messages.at(-1);
  const memories=snapshot.mural
    .filter((item)=>item.type==='image' && item.mediaUrl)
    .slice(0,6);
  const unread=snapshot.messages.filter(
    (item)=>item.targetUid===snapshot.currentUid && !item.readAt
  ).length;

  await DinoWidgetBridge.setWidgetData(JSON.stringify({
    partnerName:snapshot.partnerName || 'DinoDúo',
    memories:memories.map((item)=>({
      caption:item.caption || 'Un recuerdo de ustedes 💜',
      mediaUrl:item.mediaUrl || '',
    })),
    coupons:{
      count:active.length,
      nextTitle:active[0]?.title || 'Sin cupones activos',
      secondTitle:active[1]?.title || '',
      emoji:active[0]?.emoji || '🎟️',
    },
    messages:{
      sender:latestMessage?.senderUid===snapshot.currentUid
        ? 'Tú'
        : (latestMessage?.senderName || snapshot.partnerName || 'Tu persona'),
      body:latestMessage?.body || 'Sin mensajes todavía',
      unread,
    },
  }));
}
