import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  }=useDino();
  const [inviteCode,setInviteCode]=useState('');
  const [joinCode,setJoinCode]=useState('');
  const [busy,setBusy]=useState(false);

  const generate=async()=>{
    setBusy(true);
    try {
      setInviteCode(await createPairInvite());
    } catch (error) {
      Alert.alert('DinoDúo',error instanceof Error?error.message:'No se pudo generar el código.');
    } finally {
      setBusy(false);
    }
  };

  const accept=async()=>{
    setBusy(true);
    try {
      await acceptPairInvite(joinCode);
      setJoinCode('');
      Alert.alert('DinoDúo','Las dos cuentas ya están conectadas 💞');
    } catch (error) {
      Alert.alert('DinoDúo',error instanceof Error?error.message:'No se pudo aceptar el código.');
    } finally {
      setBusy(false);
    }
  };

  const unlink=()=>Alert.alert(
    'Desvincular DinoDúo',
    'Los recuerdos, mensajes y cupones anteriores no se borrarán.',
    [
      {text:'Cancelar',style:'cancel'},
      {
        text:'Desvincular',
        style:'destructive',
        onPress:async()=>{
          try {
            await unlinkPair();
          } catch (error) {
            Alert.alert('DinoDúo',error instanceof Error?error.message:'No se pudo cerrar el vínculo.');
          }
        },
      },
    ]
  );

  return (
    <Screen title="Nosotros" subtitle="El espacio privado de tu DinoDúo.">
      {pair ? (
        <>
          <View style={common.card}>
            <Text style={common.label}>DINODÚO CONECTADO</Text>
            <Text style={common.strong}>{displayName+' + '+partnerName}</Text>
            <Text style={common.body}>Cupones, mensajes, mural y widgets comparten este mismo vínculo.</Text>
          </View>
          <View style={common.card}>
            <Text style={common.label}>WIDGETS</Text>
            <Text style={common.strong}>DinoRecuerdos · Cupones · DinoMensajes</Text>
            <Text style={common.body}>Tócalos desde la pantalla de inicio para abrir directamente Mural, Cupones o Chat.</Text>
          </View>
          <Pressable style={styles.unlink} onPress={unlink}>
            <Text style={styles.unlinkText}>💔 Desvincular DinoDúo</Text>
          </Pressable>
        </>
      ) : (
        <>
          <View style={common.card}>
            <Text style={common.label}>CREAR INVITACIÓN</Text>
            <Text style={common.strong}>Invita a tu persona favorita.</Text>
            <Text style={common.body}>Genera un código privado válido durante 7 días.</Text>
            <Pressable style={styles.primary} onPress={generate} disabled={busy}>
              <Text style={styles.primaryText}>{busy?'Preparando…':'Generar código'}</Text>
            </Pressable>
            {inviteCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>TU CÓDIGO</Text>
                <Text style={styles.code}>{inviteCode}</Text>
              </View>
            ) : null}
          </View>

          <View style={common.card}>
            <Text style={common.label}>USAR UN CÓDIGO</Text>
            <Text style={common.strong}>Conecta las dos cuentas.</Text>
            <TextInput
              value={joinCode}
              onChangeText={(value)=>setJoinCode(value.toUpperCase().slice(0,6))}
              placeholder="ABC123"
              autoCapitalize="characters"
              maxLength={6}
              style={styles.input}
            />
            <Pressable style={styles.secondary} onPress={accept} disabled={busy || joinCode.length!==6}>
              <Text style={styles.secondaryText}>Vincular nuestras cuentas</Text>
            </Pressable>
          </View>
        </>
      )}

      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </Pressable>
    </Screen>
  );
}

const styles=StyleSheet.create({
  primary:{minHeight:48,borderRadius:15,backgroundColor:colors.purple,alignItems:'center',justifyContent:'center',marginTop:16},
  primaryText:{color:'#fff',fontWeight:'900'},
  secondary:{minHeight:48,borderRadius:15,borderWidth:1,borderColor:colors.purple,alignItems:'center',justifyContent:'center',marginTop:10},
  secondaryText:{color:colors.purple,fontWeight:'900'},
  input:{minHeight:52,borderWidth:1,borderColor:colors.border,borderRadius:16,paddingHorizontal:14,backgroundColor:'#fff',marginTop:16,color:colors.ink,fontSize:20,fontWeight:'900',letterSpacing:4,textAlign:'center'},
  codeBox:{marginTop:14,padding:16,borderRadius:17,backgroundColor:'#F5EAF9',alignItems:'center'},
  codeLabel:{fontSize:10,fontWeight:'900',color:colors.muted,letterSpacing:1.5},
  code:{marginTop:5,fontSize:27,fontWeight:'900',letterSpacing:5,color:colors.purpleDeep},
  unlink:{minHeight:48,borderRadius:15,borderWidth:1,borderColor:'#E8CBD4',backgroundColor:'#FFF5F7',alignItems:'center',justifyContent:'center',marginBottom:12},
  unlinkText:{color:colors.danger,fontWeight:'900'},
  logout:{minHeight:50,borderRadius:16,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center',backgroundColor:'#fff'},
  logoutText:{color:colors.danger,fontWeight:'900'},
});
