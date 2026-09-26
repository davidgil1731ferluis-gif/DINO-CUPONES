import { Directory, File } from 'expo-file-system';
import { widgetsDirectory } from 'expo-widgets';
import DinoMemoriesWidget from '@/widgets/DinoMemoriesWidget';
import DinoCouponsWidget from '@/widgets/DinoCouponsWidget';
import DinoMessagesWidget from '@/widgets/DinoMessagesWidget';
import type { DinoMemory } from '@/src/types';
import type { WidgetSnapshot } from './syncWidgets';

const MAX_MEMORIES=6;
const ROTATION_MS=60*60*1000;

function extensionFor(url: string) {
  const match=url.match(/\.(png|jpe?g|webp)(?:\?|$)/i);
  return match?.[1]?.toLowerCase() || 'jpg';
}

async function cacheMemory(memory: DinoMemory, index: number) {
  if (!widgetsDirectory || !memory.mediaUrl || memory.type !== 'image') return '';
  const directory=new Directory(widgetsDirectory);
  const file=new File(directory,'dino-memory-'+index+'.'+extensionFor(memory.mediaUrl));
  await File.downloadFileAsync(memory.mediaUrl,file,{idempotent:true});
  return file.uri;
}

export async function syncWidgets(snapshot: WidgetSnapshot) {
  const active=snapshot.coupons.filter((item)=>item.status==='active');
  const latestMessage=snapshot.messages.at(-1);
  const unread=snapshot.messages.filter(
    (item)=>item.targetUid===snapshot.currentUid && !item.readAt
  ).length;

  const memories=snapshot.mural
    .filter((item)=>item.type==='image' && item.mediaUrl)
    .slice(0,MAX_MEMORIES);

  const cached=await Promise.all(memories.map(async (memory,index)=>({
    memory,
    photoPath:await cacheMemory(memory,index).catch(()=> ''),
  })));

  if (cached.length) {
    const now=Date.now();
    DinoMemoriesWidget.updateTimeline(cached.map((item,index)=>({
      date:new Date(now+index*ROTATION_MS),
      props:{
        caption:item.memory.caption || 'Un recuerdo de ustedes 💜',
        partnerName:snapshot.partnerName || 'DinoDúo',
        photoPath:item.photoPath,
        deepLink:'dinocupones://mural',
      },
    })));
  } else {
    DinoMemoriesWidget.updateSnapshot({
      caption:'Un recuerdo de ustedes 💜',
      partnerName:snapshot.partnerName || 'DinoDúo',
      photoPath:'',
      deepLink:'dinocupones://mural',
    });
  }

  DinoCouponsWidget.updateSnapshot({
    count:active.length,
    nextTitle:active[0]?.title || 'Sin cupones activos',
    secondTitle:active[1]?.title || '',
    emoji:active[0]?.emoji || '🎟️',
    deepLink:'dinocupones://coupons',
  });

  DinoMessagesWidget.updateSnapshot({
    sender:latestMessage?.senderUid===snapshot.currentUid
      ? 'Tú'
      : (latestMessage?.senderName || snapshot.partnerName || 'Tu persona'),
    body:latestMessage?.body || 'Sin mensajes todavía',
    unread,
    deepLink:'dinocupones://chat',
  });
}
