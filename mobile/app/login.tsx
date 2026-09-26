import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function Login() {
  const { user, login } = useDino();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Redirect href="/(tabs)/coupons" />;

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await login(email, password);
    } catch {
      setError('No pudimos iniciar sesión. Revisa correo y contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.logo}><Text style={styles.logoEmoji}>🦖💌</Text></View>
      <Text style={styles.brand}>DinoCupones</Text>
      <Text style={styles.lead}>Tus cupones, mensajes y recuerdos también en una app nativa.</Text>
      <View style={styles.card}>
        <TextInput value={email} onChangeText={setEmail} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Contraseña" secureTextEntry style={styles.input} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  logo: { width: 86, height: 86, alignSelf: 'center', borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0E2FB' },
  logoEmoji: { fontSize: 40 },
  brand: { marginTop: 18, color: colors.ink, fontSize: 36, fontWeight: '900', textAlign: 'center' },
  lead: { color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8, marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 28, padding: 18, borderWidth: 1, borderColor: colors.border },
  input: { minHeight: 52, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 14, backgroundColor: '#fff', marginBottom: 10, color: colors.ink },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.purple, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  error: { color: colors.danger, marginBottom: 8, fontSize: 13 },
});
