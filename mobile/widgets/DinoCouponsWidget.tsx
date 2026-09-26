import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = {
  count: number;
  nextTitle: string;
  secondTitle: string;
  emoji: string;
  deepLink: string;
};

function DinoCouponsWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact=environment.widgetFamily==='systemSmall';
  return (
    <VStack spacing={6} modifiers={[padding({all:12}),widgetURL(props.deepLink)]}>
      <Image systemName="ticket.fill" color="#7350A7" />
      <Text modifiers={[font({weight:'bold',size:16}),foregroundStyle('#4B2D67')]}>
        {props.count} activos
      </Text>
      <Text modifiers={[font({size:11}),foregroundStyle('#77677D')]}>
        {props.emoji+' '+props.nextTitle}
      </Text>
      {!compact && props.secondTitle
        ? <Text modifiers={[font({size:10}),foregroundStyle('#9B879E')]}>Después: {props.secondTitle}</Text>
        : null}
    </VStack>
  );
}

export default createWidget<Props>('DinoCouponsWidget',DinoCouponsWidget);
