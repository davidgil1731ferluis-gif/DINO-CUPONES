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

type AuthMode='login'|'register';

function humanAuthError(error: unknown) {
  const code=(error as {code?:string})?.code || '';
  if (code==='auth/invalid-credential' || code==='auth/user-not-found' || code==='auth/wrong-password') {
    return 'Correo o contraseña incorrectos.';
  }
  if (code==='auth/invalid-email') return 'El correo no es válido.';
  if (code==='auth/missing-email') return 'Escribe tu correo.';
  if (code==='auth/missing-password') return 'Escribe tu contraseña.';
  if (code==='auth/email-already-in-use') return 'Ese correo ya está registrado.';
  if (code==='auth/weak-password') return 'La contraseña debe tener al menos 6 caracteres.';
  if (code==='auth/network-request-failed') return 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo otra vez.';
  if (code==='auth/too-many-requests') return 'Hubo demasiados intentos. Espera un momento antes de volver a intentar.';
  if (code==='auth/user-disabled') return 'Esta cuenta está deshabilitada.';
  if (code==='auth/operation-not-allowed') return 'El acceso por correo y contraseña no está habilitado en Firebase.';
  return (error as Error)?.message || 'No se pudo completar el acceso.';
}

export default function Login() {
  const {user,login,registerAccount,resetPassword}=useDino();
  const [mode,setMode]=useState<AuthMode>('login');
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  if (user) return <Redirect href="/(tabs)/coupons" />;

  const submit=async ()=>{
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode==='register') {
        await registerAccount(name,email,password);
      } else {
        await login(email,password);
      }
    } catch (authError) {
      setError(humanAuthError(authError));
    } finally {
      setBusy(false);
    }
  };

  const recover=async ()=>{
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await resetPassword(email);
      setNotice('Te enviamos un correo para restablecer la contraseña.');
    } catch (authError) {
      setError(humanAuthError(authError));
    } finally {
      setBusy(false);
    }
  };

  const changeMode=(next:AuthMode)=>{
    setMode(next);
    setError('');
    setNotice('');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.logo}><Text style={styles.logoEmoji}>🦖💌</Text></View>
      <Text style={styles.brand}>DinoCupones</Text>
      <Text style={styles.lead}>
        {mode==='login'
          ? 'Entra con la misma cuenta que utilizas en DinoCupones web.'
          : 'Crea tu cuenta y empieza a construir tu DinoDúo.'}
      </Text>

      <View style={styles.modeSwitch}>
        <Pressable
          style={[styles.modeButton,mode==='login'&&styles.modeButtonActive]}
          onPress={()=>changeMode('login')}
        >
          <Text style={[styles.modeText,mode==='login'&&styles.modeTextActive]}>Entrar</Text>
        </Pressable>
        <Pressable
          style={[styles.modeButton,mode==='register'&&styles.modeButtonActive]}
          onPress={()=>changeMode('register')}
        >
          <Text style={[styles.modeText,mode==='register'&&styles.modeTextActive]}>Crear cuenta</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {mode==='register'?(
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            autoCapitalize="words"
            style={styles.input}
          />
        ):null}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Correo"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          textContentType={mode==='login'?'password':'newPassword'}
          style={styles.input}
          onSubmitEditing={submit}
        />

        {error?<Text style={styles.error}>{error}</Text>:null}
        {notice?<Text style={styles.notice}>{notice}</Text>:null}

        <Pressable style={[styles.button,busy&&styles.disabled]} onPress={submit} disabled={busy}>
          {busy?<ActivityIndicator color="#fff"/>:<Text style={styles.buttonText}>
            {mode==='login'?'Entrar':'Crear mi cuenta'}
          </Text>}
        </Pressable>

        {mode==='login'?(
          <Pressable style={styles.recoverButton} onPress={recover} disabled={busy}>
            <Text style={styles.recoverText}>Olvidé mi contraseña</Text>
          </Pressable>
        ):null}
      </View>

      <Text style={styles.help}>La cuenta móvil usa el mismo Firebase y los mismos datos de la versión web.</Text>
    </KeyboardAvoidingView>
  );
}

const styles=StyleSheet.create({
  screen:{flex:1,justifyContent:'center',padding:24,backgroundColor:colors.background},
  logo:{width:86,height:86,alignSelf:'center',borderRadius:28,alignItems:'center',justifyContent:'center',backgroundColor:'#F0E2FB'},
  logoEmoji:{fontSize:40},
  brand:{marginTop:18,color:colors.ink,fontSize:36,fontWeight:'900',textAlign:'center'},
  lead:{color:colors.muted,textAlign:'center',lineHeight:21,marginTop:8,marginBottom:18},
  modeSwitch:{flexDirection:'row',alignSelf:'center',padding:4,borderRadius:16,backgroundColor:'#F0E7F4',marginBottom:12},
  modeButton:{paddingVertical:9,paddingHorizontal:18,borderRadius:12},
  modeButtonActive:{backgroundColor:'#fff'},
  modeText:{color:colors.muted,fontWeight:'800'},
  modeTextActive:{color:colors.purple},
  card:{backgroundColor:colors.surface,borderRadius:28,padding:18,borderWidth:1,borderColor:colors.border},
  input:{minHeight:52,borderWidth:1,borderColor:colors.border,borderRadius:16,paddingHorizontal:14,backgroundColor:'#fff',marginBottom:10,color:colors.ink},
  button:{minHeight:52,borderRadius:16,backgroundColor:colors.purple,alignItems:'center',justifyContent:'center',marginTop:4},
  buttonText:{color:'#fff',fontWeight:'900',fontSize:16},
  disabled:{opacity:.65},
  recoverButton:{alignItems:'center',paddingVertical:12},
  recoverText:{color:colors.purple,fontWeight:'800',fontSize:13},
  error:{color:colors.danger,marginBottom:9,fontSize:13,lineHeight:18},
  notice:{color:colors.green,marginBottom:9,fontSize:13,lineHeight:18},
  help:{marginTop:14,color:colors.muted,textAlign:'center',fontSize:12,lineHeight:18},
});
