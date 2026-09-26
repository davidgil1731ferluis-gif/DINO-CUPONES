import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function UsScreen() {
  const {
    pair,
    displayName,
    partnerName,
    logout,
    createPairInvite,
    acceptPairInvite,
    unlinkPair,
  } = useDino();

  const [inviteCode, setInviteCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const createInvite = async () => {
    setBusy(true);
    setStatus('');
    try {
      const code = await createPairInvite();
      setInviteCode(code);
      setStatus('Comparte este código con tu persona. Es válido durante 7 días.');
    } catch (error: any) {
      setStatus(error?.message || 'No se pudo crear la invitación.');
    } finally {
      setBusy(false);
    }
  };

  const acceptInvite = async () => {
    setBusy(true);
    setStatus('');
    try {
      await acceptPairInvite(codeInput);
      setCodeInput('');
      setStatus('DinoDúo conectado 💞');
    } catch (error: any) {
      setStatus(error?.message || 'No se pudo aceptar la invitación.');
    } finally {
      setBusy(false);
    }
  };

  const unlink = async () => {
    setBusy(true);
    setStatus('');
    try {
      await unlinkPair();
      setInviteCode('');
      setStatus('DinoDúo desvinculado. Tus datos históricos no se borraron.');
    } catch (error: any) {
      setStatus(error?.message || 'No se pudo cerrar el vínculo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Nosotros" subtitle="El espacio privado de tu DinoDúo.">
      {pair ? (
        <>
          <View style={[common.card, styles.connectedCard]}>
            <Text style={common.label}>DINODÚO CONECTADO</Text>
            <Text style={common.strong}>{displayName} + {partnerName}</Text>
            <Text style={common.body}>Cupones, mensajes, mural y widgets comparten este mismo vínculo.</Text>
          </View>
          <Pressable style={styles.dangerButton} onPress={unlink} disabled={busy}>
            <Text style={styles.dangerText}>💔 Desvincular DinoDúo</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={common.card}>
            <Text style={common.label}>CREAR INVITACIÓN</Text>
            <Text style={common.strong}>Conecta a tu persona favorita</Text>
            <Text style={common.body}>Genera un código de 6 caracteres y compártelo con la otra cuenta.</Text>
            <Pressable style={styles.primaryButton} onPress={createInvite} disabled={busy}>
              <Text style={styles.primaryText}>Generar código</Text>
            </Pressable>
            {inviteCode ? (
              <View style={styles.codeBox}>
                <Text selectable style={styles.code}>{inviteCode}</Text>
                <Text style={styles.codeHint}>Mantén pulsado para copiarlo.</Text>
              </View>
            ) : null}
          </View>

          <View style={common.card}>
            <Text style={common.label}>USAR UN CÓDIGO</Text>
            <Text style={common.strong}>Aceptar invitación</Text>
            <TextInput
              value={codeInput}
              onChangeText={(value) => setCodeInput(value.toUpperCase())}
              autoCapitalize="characters"
              maxLength={6}
              placeholder="ABC123"
              style={styles.input}
            />
            <Pressable style={styles.secondaryButton} onPress={acceptInvite} disabled={busy}>
              <Text style={styles.secondaryText}>Vincular nuestras cuentas</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={common.card}>
        <Text style={common.label}>WIDGETS</Text>
        <Text style={common.strong}>DinoRecuerdos · Cupones · DinoMensajes</Text>
        <Text style={common.body}>Se actualizan con la información de este DinoDúo y abren directamente la sección correspondiente.</Text>
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  connectedCard: { backgroundColor: '#FBF4FF' },
  primaryButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#F1E7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.purpleDeep, fontWeight: '900' },
  dangerButton: {
    minHeight: 48,
    marginBottom: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#EBC7D1',
    backgroundColor: '#FFF6F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { color: colors.danger, fontWeight: '900' },
  input: {
    minHeight: 50,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    color: colors.ink,
    fontWeight: '800',
    letterSpacing: 2,
  },
  codeBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 17,
    backgroundColor: '#F6ECFA',
    alignItems: 'center',
  },
  code: {
    color: colors.purpleDeep,
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 5,
  },
  codeHint: { color: colors.muted, marginTop: 5, fontSize: 11 },
  status: { color: colors.green, textAlign: 'center', marginBottom: 14, fontWeight: '800' },
  logout: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logoutText: { color: colors.danger, fontWeight: '900' },
});
