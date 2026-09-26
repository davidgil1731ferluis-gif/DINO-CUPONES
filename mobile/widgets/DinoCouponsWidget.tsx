import { Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = {
  count: number;
  firstTitle: string;
  secondTitle: string;
  thirdTitle: string;
  emoji: string;
};

function DinoCouponsWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact = environment.widgetFamily === 'systemSmall';
  return (
    <VStack
      spacing={6}
      modifiers={[
        padding({ all: 12 }),
        background('#FBF5FF'),
        cornerRadius(20),
        widgetURL('dinocupones://coupons'),
      ]}
    >
      <Image systemName="ticket.fill" color="#7350A7" />
      <Text modifiers={[font({ weight: 'bold', size: 14 }), foregroundStyle('#4B2D67')]}>
        {props.count} activos
      </Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#7D6983')]}>
        {props.emoji} {props.firstTitle}
      </Text>
      {!compact && props.secondTitle ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#9A829E')]}>{props.secondTitle}</Text> : null}
      {!compact && props.thirdTitle ? <Text modifiers={[font({ size: 10 }), foregroundStyle('#9A829E')]}>{props.thirdTitle}</Text> : null}
    </VStack>
  );
}

export default createWidget<Props>('DinoCouponsWidget', DinoCouponsWidget);
