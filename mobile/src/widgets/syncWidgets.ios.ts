import * as FileSystem from 'expo-file-system/legacy';
import { widgetsDirectory } from 'expo-widgets';
import DinoMemoriesWidget from '@/widgets/DinoMemoriesWidget';
import DinoCouponsWidget from '@/widgets/DinoCouponsWidget';
import DinoMessagesWidget from '@/widgets/DinoMessagesWidget';
import type { WidgetSnapshot } from './syncWidgets';

async function cacheMemoryPhotos(snapshot: WidgetSnapshot) {
  if (!widgetsDirectory) return [];

  const memories = snapshot.mural
    .filter((item) => item.type === 'image' && item.mediaUrl)
    .slice(0, 4);

  const root = widgetsDirectory.replace(/\/$/, '');
  const cached = [];

  for (let index = 0; index < memories.length; index += 1) {
    const memory = memories[index];
    const destination = root + '/dinomemory-' + index + '.jpg';
    try {
      const file = await FileSystem.downloadAsync(memory.mediaUrl!, destination);
      cached.push({
        path: file.uri,
        caption: memory.caption || 'Un recuerdo de ustedes 💜',
      });
    } catch (error) {
      console.warn('No se pudo preparar una foto para DinoRecuerdos.', error);
    }
  }

  return cached;
}

export async function syncWidgets(snapshot: WidgetSnapshot) {
  const active = snapshot.coupons.filter((item) => item.status === 'active');
  const latestMessage = snapshot.messages.at(-1);
  const unread = snapshot.messages.filter(
    (item) => item.targetUid === snapshot.currentUid && !item.readAt
  ).length;

  const cachedMemories = await cacheMemoryPhotos(snapshot);
  if (cachedMemories.length) {
    DinoMemoriesWidget.updateTimeline(
      cachedMemories.map((memory, index) => ({
        date: new Date(Date.now() + index * 2 * 60 * 60 * 1000),
        props: {
          caption: memory.caption,
          partnerName: snapshot.partnerName || 'DinoDúo',
          photoPath: memory.path,
        },
      }))
    );
  } else {
    DinoMemoriesWidget.updateSnapshot({
      caption: 'Un recuerdo de ustedes 💜',
      partnerName: snapshot.partnerName || 'DinoDúo',
      photoPath: '',
    });
  }

  DinoCouponsWidget.updateSnapshot({
    count: active.length,
    firstTitle: active[0]?.title || 'Sin cupones activos',
    secondTitle: active[1]?.title || '',
    thirdTitle: active[2]?.title || '',
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
