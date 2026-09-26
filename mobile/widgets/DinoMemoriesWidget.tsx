import { Image, Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = {
  caption: string;
  partnerName: string;
  photoPath: string;
  deepLink: string;
};

function DinoMemoriesWidget(props: Props, environment: WidgetEnvironment) {
  'widget';
  const compact=environment.widgetFamily==='systemSmall';
  return (
    <VStack
      spacing={6}
      modifiers={[
        padding({all:12}),
        widgetURL(props.deepLink),
      ]}
    >
      {props.photoPath
        ? <Image uiImage={props.photoPath} />
        : <Image systemName="photo.on.rectangle.angled" color="#7350A7" />}
      <Text modifiers={[font({weight:'bold',size:compact?13:15}),foregroundStyle('#4B2D67')]}>
        {compact?'DinoRecuerdo':props.partnerName}
      </Text>
      <Text modifiers={[font({size:11}),foregroundStyle('#77677D')]}>
        {props.caption}
      </Text>
    </VStack>
  );
}

export default createWidget<Props>('DinoMemoriesWidget',DinoMemoriesWidget);
