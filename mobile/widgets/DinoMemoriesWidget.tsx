import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = {
  caption: string;
  partnerName: string;
  photoPath: string;
};

function DinoMemoriesWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact = environment.widgetFamily === 'systemSmall';
  return (
    <VStack spacing={6}>
      {props.photoPath ? <Image uiImage={props.photoPath} /> : <Image systemName="photo.on.rectangle.angled" />}
      <Text>{compact ? 'DinoRecuerdo' : props.partnerName}</Text>
      <Text>{props.caption}</Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMemoriesWidget', DinoMemoriesWidget);
