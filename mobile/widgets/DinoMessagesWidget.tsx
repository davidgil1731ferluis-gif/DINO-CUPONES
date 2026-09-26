import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { createWidget } from 'expo-widgets';

type Props = {
  sender: string;
  body: string;
  unread: number;
};

function DinoMessagesWidget(props: Props) {
  'widget';
  return (
    <VStack spacing={6}>
      <Image systemName={props.unread > 0 ? 'message.badge.filled.fill' : 'message.fill'} color="#D86B9F" />
      <Text>{props.sender}</Text>
      <Text>{props.body}</Text>
      <Text>{props.unread > 0 ? String(props.unread) + ' nuevos' : 'Al día'}</Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMessagesWidget', DinoMessagesWidget);
