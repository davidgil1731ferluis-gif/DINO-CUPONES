import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [busy, setBusy] = useState<'create' | 'accept' | 'unlink' | ''>('');
  const [status, setStatus] = useState('');

  const generate = async () => {
    setBusy('create');
    setStatus('');
    try {
      const code = await createPairInvite();
      setInviteCode(code);
      setStatus('Código listo. Compártelo con tu persona.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo generar el código.');
    } finally {
      setBusy('');
    }
  };

  const copy = async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteCode);
    setStatus('Código copiado 💜');
  };

  const accept = async () => {
    setBusy('accept');
    setStatus('');
    try {
      await acceptPairInvite(codeInput);
      setCodeInput('');
      setStatus('DinoDúo conectado 💞');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'No se pudo conectar el DinoDúo.');
    } finally {
      setBusy('');
    }
  };

  const confirmUnlink = () => {
    Alert.alert(
      '¿Desvincular DinoDúo?',
      'Los recuerdos, mensajes y cupones anteriores no se borrarán.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            setBusy('unlink');
            try {
              await unlinkPair();
              setInviteCode('');
              setStatus('DinoDúo cerrado correctamente.');
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'No se pudo cerrar el vínculo.');
            } finally {
              setBusy('');
            }
          },
        },
      ]
    );
  };

  return (
    <Screen title="Nosotros" subtitle="El espacio privado de tu DinoDúo.">
      {pair ? (
        <>
          <View style={[common.card, styles.connected]}>
            <Text style={styles.heart}>💞</Text>
            <Text style={common.label}>DINODÚO CONECTADO</Text>
            <Text style={styles.names}>{displayName} + {partnerName}</Text>
            <Text style={common.body}>
              Chat, cupones, mural y widgets comparten este mismo vínculo privado.
            </Text>
          </View>

          <View style={common.card}>
            <Text style={common.strong}>Administrar vínculo</Text>
            <Text style={common.body}>
              Puedes cerrar este DinoDúo y volver a vincular tu cuenta después.
            </Text>
            <Pressable
              style={[styles.outlineButton, styles.dangerButton]}
              onPress={confirmUnlink}
              disabled={busy === 'unlink'}
            >
              <Text style={styles.dangerText}>
                {busy === 'unlink' ? 'Desvinculando…' : '💔 Desvincular DinoDúo'}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={common.card}>
            <Text style={common.label}>CREAR INVITACIÓN</Text>
            <Text style={common.strong}>Invita a tu persona favorita</Text>
            <Text style={common.body}>
              Genera un código de 6 caracteres. Será válido durante 7 días.
            </Text>
            <Pressable style={styles.primaryButton} onPress={generate} disabled={busy === 'create'}>
              <Text style={styles.primaryText}>
                {busy === 'create' ? 'Generando…' : 'Generar código'}
              </Text>
            </Pressable>

            {inviteCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.code}>{inviteCode}</Text>
                <Pressable style={styles.copyButton} onPress={copy}>
                  <Text style={styles.copyText}>Copiar código</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={common.card}>
            <Text style={common.label}>USAR UN CÓDIGO</Text>
            <Text style={common.strong}>Conectar nuestras cuentas</Text>
            <TextInput
              value={codeInput}
              onChangeText={(value) => setCodeInput(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              maxLength={6}
              style={styles.codeInput}
            />
            <Pressable
              style={[styles.primaryButton, !codeInput && styles.disabled]}
              onPress={accept}
              disabled={!codeInput || busy === 'accept'}
            >
              <Text style={styles.primaryText}>
                {busy === 'accept' ? 'Conectando…' : 'Vincular DinoDúo'}
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {status ? <Text style={styles.status}>{status}</Text> : null}

      <View style={common.card}>
        <Text style={common.label}>WIDGETS</Text>
        <Text style={common.strong}>DinoRecuerdos · Cupones · DinoMensajes</Text>
        <Text style={common.body}>
          Se actualizan con la información de este DinoDúo y abren directamente la sección correspondiente.
        </Text>
      </View>

      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  connected: { alignItems: 'center', paddingVertical: 26 },
  heart: { fontSize: 34, marginBottom: 8 },
  names: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.45 },
  codeBox: {
    marginTop: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
    alignItems: 'center',
  },
  code: {
    color: colors.purpleDeep,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
  },
  copyButton: { paddingVertical: 8, paddingHorizontal: 14, marginTop: 8 },
  copyText: { color: colors.purple, fontWeight: '900' },
  codeInput: {
    minHeight: 58,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: '#fff',
    color: colors.ink,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 5,
  },
  outlineButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerButton: { borderColor: '#E9C9D1', backgroundColor: '#FFF8FA' },
  dangerText: { color: colors.danger, fontWeight: '900' },
  status: {
    marginBottom: 12,
    paddingHorizontal: 4,
    color: colors.purple,
    fontWeight: '800',
    textAlign: 'center',
  },
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
