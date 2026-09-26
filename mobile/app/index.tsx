import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useDino } from '@/src/providers/DinoProvider';
import { colors } from '@/src/theme';

export default function Index() {
  const { loading, user } = useDino();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.purple} size="large" />
      </View>
    );
  }
  return <Redirect href={user ? '/(tabs)/coupons' : '/login'} />;
}
