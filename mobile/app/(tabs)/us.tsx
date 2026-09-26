import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function UsScreen() {
  const { pair, displayName, partnerName, logout } = useDino();
  return (
    <Screen title="Nosotros" subtitle="El espacio privado de tu DinoDúo.">
      <View style={common.card}>
        <Text style={common.label}>DINODÚO</Text>
        <Text style={common.strong}>{pair ? displayName + ' + ' + partnerName : 'Sin vínculo activo'}</Text>
        <Text style={common.body}>
          {pair
            ? 'Cupones, mensajes, mural y widgets comparten este mismo vínculo.'
            : 'La creación y aceptación de códigos se añadirá en el siguiente bloque móvil.'}
        </Text>
      </View>
      <View style={common.card}>
        <Text style={common.label}>WIDGETS</Text>
        <Text style={common.strong}>DinoRecuerdos · Cupones · DinoMensajes</Text>
        <Text style={common.body}>Los widgets se sincronizan con este DinoDúo cuando cambian sus datos.</Text>
      </View>
      <Pressable style={styles.logout} onPress={logout}><Text style={styles.logoutText}>Cerrar sesión</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logout: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  logoutText: { color: colors.danger, fontWeight: '900' },
});
