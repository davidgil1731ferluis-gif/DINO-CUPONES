import DinoMemoriesWidget from '@/widgets/DinoMemoriesWidget';
import DinoCouponsWidget from '@/widgets/DinoCouponsWidget';
import DinoMessagesWidget from '@/widgets/DinoMessagesWidget';
import type { WidgetSnapshot } from './syncWidgets';

export async function syncWidgets(snapshot: WidgetSnapshot) {
  const active = snapshot.coupons.filter((item) => item.status === 'active');
  const latestMessage = snapshot.messages.at(-1);
  const unread = snapshot.messages.filter(
    (item) => item.targetUid === snapshot.currentUid && !item.readAt
  ).length;
  const latestMemory = snapshot.mural.find((item) => item.type === 'image') ?? snapshot.mural[0];

  DinoMemoriesWidget.updateSnapshot({
    caption: latestMemory?.caption || 'Un recuerdo de ustedes 💜',
    partnerName: snapshot.partnerName || 'DinoDúo',
    photoPath: '',
  });

  DinoCouponsWidget.updateSnapshot({
    count: active.length,
    nextTitle: active[0]?.title || 'Sin cupones activos',
    emoji: active[0]?.emoji || '🎟️',
  });

  DinoMessagesWidget.updateSnapshot({
    sender: latestMessage?.senderUid === snapshot.currentUid
      ? 'Tú'
      : (latestMessage?.senderName || snapshot.partnerName || 'Tu persona'),
    body: latestMessage?.body || 'Sin mensajes todavía',
    unread,
  });
}
