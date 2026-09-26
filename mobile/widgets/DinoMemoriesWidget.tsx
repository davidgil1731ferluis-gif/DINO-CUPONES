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
  caption: string;
  partnerName: string;
  photoPath: string;
};

function DinoMemoriesWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact = environment.widgetFamily === 'systemSmall';
  return (
    <VStack
      spacing={7}
      modifiers={[
        padding({ all: 12 }),
        background('#FFF8FC'),
        cornerRadius(20),
        widgetURL('dinocupones://mural'),
      ]}
    >
      {props.photoPath
        ? <Image uiImage={props.photoPath} />
        : <Image systemName="photo.on.rectangle.angled" color="#7350A7" />}
      <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle('#4B2D67')]}>
        {compact ? 'DinoRecuerdo' : props.partnerName}
      </Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle('#806D84')]}>
        {props.caption}
      </Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMemoriesWidget', DinoMemoriesWidget);
