import fs from 'node:fs';

const required = [
  'package.json',
  'app.json',
  'app/_layout.tsx',
  'app/login.tsx',
  'app/(tabs)/_layout.tsx',
  'app/(tabs)/coupons.tsx',
  'app/(tabs)/chat.tsx',
  'app/(tabs)/gift.tsx',
  'app/(tabs)/mural.tsx',
  'app/(tabs)/us.tsx',
  'widgets/DinoMemoriesWidget.tsx',
  'widgets/DinoCouponsWidget.tsx',
  'widgets/DinoMessagesWidget.tsx',
  'modules/dino-widget-bridge/android/src/main/java/expo/modules/dinowidgetbridge/DinoWidgetBridgeModule.kt'
];

const root = new URL('../', import.meta.url);
const missing = required.filter((file) => !fs.existsSync(new URL(file, root)));
if (missing.length) {
  console.error('Faltan archivos móviles:', missing.join(', '));
  process.exit(1);
}

const app = fs.readFileSync(new URL('app.json', root), 'utf8');
for (const name of ['DinoMemoriesWidget', 'DinoCouponsWidget', 'DinoMessagesWidget']) {
  if (!app.includes(name)) {
    console.error('Falta configurar widget:', name);
    process.exit(1);
  }
}

console.log('Mobile foundation OK: Expo app + iOS widgets + Android Glance widgets.');
