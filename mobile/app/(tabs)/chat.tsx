import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function ChatScreen() {
  const { pair, partnerName, messages, user, sendMessage, markIncomingMessagesRead } = useDino();
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!pair) return;
    markIncomingMessagesRead().catch((error) =>
      console.warn('No se pudieron marcar los DinoMensajes como leídos.', error)
    );
  }, [pair?.id, messages.length]);

  if (!pair) {
    return <Screen title="DinoChat"><Text style={common.empty}>Conecta un DinoDúo para activar el chat.</Text></Screen>;
  }

  const submit = async () => {
    const text = body.trim();
    if (!text) return;
    setBody('');
    await sendMessage(text);
  };

  return (
    <Screen title="DinoChat" subtitle={'Conversación privada con ' + partnerName + '.'}>
      <View style={styles.chat}>
        {messages.length ? messages.map((message) => {
          const mine = message.senderUid === user?.uid;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.body, mine && styles.mineText]}>{message.body || message.title}</Text>
            </View>
          );
        }) : <Text style={common.empty}>Todavía no hay mensajes.</Text>}
      </View>
      <View style={styles.composer}>
        <TextInput value={body} onChangeText={setBody} placeholder="Escribe un mensaje..." multiline style={styles.input} />
        <Pressable style={styles.send} onPress={submit}><Text style={styles.sendText}>➤</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chat: { gap: 8 },
  bubble: { maxWidth: '84%', padding: 12, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.purple },
  theirs: { alignSelf: 'flex-start', backgroundColor: '#F3EAF6' },
  body: { color: colors.ink, lineHeight: 20 },
  mineText: { color: '#fff' },
  composer: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderWidth: 1, borderColor: colors.border, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff', color: colors.ink },
  send: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
