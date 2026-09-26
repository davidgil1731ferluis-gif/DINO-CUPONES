import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';

export default function MuralScreen() {
  const { mural } = useDino();
  return (
    <Screen title="DinoMural" subtitle="Sus recuerdos, ahora también en la app móvil.">
      {mural.length ? mural.map((memory) => (
        <View key={memory.id} style={common.card}>
          {memory.type === 'image' && memory.mediaUrl ? (
            <Image source={memory.mediaUrl} style={{ width: '100%', aspectRatio: 1.2, borderRadius: 16, marginBottom: 12 }} contentFit="cover" />
          ) : null}
          <Text style={common.strong}>{memory.caption || 'Un recuerdo de ustedes 💜'}</Text>
          {memory.uploaderName ? <Text style={common.body}>Subido por {memory.uploaderName}</Text> : null}
        </View>
      )) : <Text style={common.empty}>Todavía no hay recuerdos en este DinoDúo.</Text>}
    </Screen>
  );
}
