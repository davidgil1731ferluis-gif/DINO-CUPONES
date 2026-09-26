import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = {
  count: number;
  nextTitle: string;
  emoji: string;
};

function DinoCouponsWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact = environment.widgetFamily === 'systemSmall';
  return (
    <VStack spacing={6}>
      <Image systemName="ticket.fill" color="#7350A7" />
      <Text>{props.count} activos</Text>
      <Text>{compact ? props.nextTitle : props.emoji + ' ' + props.nextTitle}</Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoCouponsWidget', DinoCouponsWidget);
