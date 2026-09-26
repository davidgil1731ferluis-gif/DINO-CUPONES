import DinoWidgetBridge from '@/modules/dino-widget-bridge';
import type { WidgetSnapshot } from './syncWidgets';

export async function syncWidgets(snapshot: WidgetSnapshot) {
  const active = snapshot.coupons.filter((item) => item.status === 'active');
  const latestMessage = snapshot.messages.at(-1);
  const latestMemory = snapshot.mural.find((item) => item.type === 'image') ?? snapshot.mural[0];
  const unread = snapshot.messages.filter(
    (item) => item.targetUid === snapshot.currentUid && !item.readAt
  ).length;

  await DinoWidgetBridge.setWidgetData(JSON.stringify({
    partnerName: snapshot.partnerName || 'DinoDúo',
    memory: {
      caption: latestMemory?.caption || 'Un recuerdo de ustedes 💜',
      mediaUrl: latestMemory?.mediaUrl || '',
    },
    coupons: {
      count: active.length,
      firstTitle: active[0]?.title || 'Sin cupones activos',
      secondTitle: active[1]?.title || '',
      thirdTitle: active[2]?.title || '',
      emoji: active[0]?.emoji || '🎟️',
    },
    messages: {
      sender: latestMessage?.senderUid === snapshot.currentUid
        ? 'Tú'
        : (latestMessage?.senderName || snapshot.partnerName || 'Tu persona'),
      body: latestMessage?.body || 'Sin mensajes todavía',
      unread,
    },
  }));
}
