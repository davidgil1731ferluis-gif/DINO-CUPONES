import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget } from 'expo-widgets';

type Props = {
  sender: string;
  body: string;
  unread: number;
  deepLink: string;
};

function DinoMessagesWidget(props: Props) {
  'widget';
  return (
    <VStack spacing={6} modifiers={[padding({all:12}),widgetURL(props.deepLink)]}>
      <Image systemName={props.unread>0?'message.badge.filled.fill':'message.fill'} color="#D86B9F" />
      <Text modifiers={[font({weight:'bold',size:14}),foregroundStyle('#4B2D67')]}>
        {props.sender}
      </Text>
      <Text modifiers={[font({size:11}),foregroundStyle('#77677D')]}>
        {props.body}
      </Text>
      <Text modifiers={[font({weight:'bold',size:10}),foregroundStyle('#D86B9F')]}>
        {props.unread>0?String(props.unread)+' nuevos':'Al día'}
      </Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMessagesWidget',DinoMessagesWidget);
