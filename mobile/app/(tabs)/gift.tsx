import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function GiftScreen() {
  const { pair, partnerName, sendCoupon } = useDino();
  const [title, setTitle] = useState('');
  const [activity, setActivity] = useState('');
  const [status, setStatus] = useState('');

  if (!pair) {
    return <Screen title="Regalar"><Text style={common.empty}>Conecta un DinoDúo para regalar cupones.</Text></Screen>;
  }

  const submit = async () => {
    if (!title.trim() || !activity.trim()) return;
    await sendCoupon({
      title,
      activity,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    });
    setTitle('');
    setActivity('');
    setStatus('DinoCupón enviado a ' + partnerName + ' 💜');
  };

  return (
    <Screen title="Regalar" subtitle={'Crea un DinoCupón para ' + partnerName + '.'}>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Nombre del cupón" />
      <TextInput style={[styles.input, styles.textarea]} value={activity} onChangeText={setActivity} placeholder="¿Qué incluye este plan?" multiline />
      <Pressable style={styles.button} onPress={submit}><Text style={styles.buttonText}>Enviar DinoCupón 🎟️</Text></Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, backgroundColor: '#fff', marginBottom: 10, color: colors.ink },
  textarea: { minHeight: 120, paddingTop: 14, textAlignVertical: 'top' },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '900' },
  status: { color: colors.green, textAlign: 'center', marginTop: 14, fontWeight: '800' },
});
