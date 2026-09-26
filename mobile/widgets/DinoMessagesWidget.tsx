import { Image, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  cornerRadius,
  font,
  foregroundStyle,
  padding,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type Props = {
  sender: string;
  body: string;
  unread: number;
};

function DinoMessagesWidget(props: Props) {
  'widget';
  return (
    <VStack
      spacing={6}
      modifiers={[
        padding({ all: 12 }),
        background('#FFF5FA'),
        cornerRadius(20),
        widgetURL('dinocupones://chat'),
      ]}
    >
      <Image systemName={props.unread > 0 ? 'message.badge.filled.fill' : 'message.fill'} color="#D86B9F" />
      <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#5B365D')]}>
        {props.sender}
      </Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#806D84')]}>
        {props.body}
      </Text>
      <Text modifiers={[font({ weight: 'bold', size: 10 }), foregroundStyle('#D86B9F')]}>
        {props.unread > 0 ? String(props.unread) + ' nuevos' : 'Al día'}
      </Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMessagesWidget', DinoMessagesWidget);
