import { requireNativeModule } from 'expo-modules-core';

type DinoWidgetBridgeModule = {
  setWidgetData(json: string): Promise<boolean>;
};

export default requireNativeModule<DinoWidgetBridgeModule>('DinoWidgetBridge');
