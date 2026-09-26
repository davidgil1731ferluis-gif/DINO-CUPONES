import { Text, View } from 'react-native';
import { Screen, common } from '@/src/components/Screen';
import { useDino } from '@/src/providers/DinoProvider';

export default function CouponsScreen() {
  const { coupons, partnerName } = useDino();
  return (
    <Screen title="Cupones" subtitle={partnerName ? 'Tus aventuras con ' + partnerName + '.' : 'Tus aventuras.'}>
      {coupons.length ? coupons.map((coupon) => (
        <View key={coupon.id} style={common.card}>
          <Text style={common.label}>{coupon.status === 'active' ? 'ACTIVO' : (coupon.status || 'CUPÓN').toUpperCase()}</Text>
          <Text style={common.strong}>{coupon.emoji || '💜'} {coupon.title}</Text>
          <Text style={common.body}>{coupon.activity || 'Un plan para disfrutar juntos.'}</Text>
        </View>
      )) : <Text style={common.empty}>No tienes cupones en este DinoDúo.</Text>}
    </Screen>
  );
}
