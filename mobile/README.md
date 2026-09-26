# DinoCupones Mobile — Fase 3

La app móvil vive en esta carpeta y no reemplaza la versión web/PWA.

## Stack

- Expo SDK 57 / React Native 0.86.
- Expo Router para navegación nativa.
- Firebase Auth + Firestore, usando el mismo proyecto `dinocupones`.
- `expo-widgets` para widgets iOS.
- Jetpack Glance 1.2.0 mediante un módulo Expo local para widgets Android.
- `expo-notifications` preparado para la siguiente etapa de notificaciones nativas.

## Widgets definidos

1. **DinoRecuerdos** — último recuerdo del DinoMural.
2. **DinoCupones activos** — cantidad y próximo cupón activo.
3. **DinoMensajes** — último mensaje y contador de no leídos.

Los snapshots se sincronizan desde la app cuando Firestore cambia.

## Ejecutar

Requiere Node 22.13+ con Expo SDK 57.

```bash
cd mobile
npm install
npx expo prebuild --clean
npx expo run:android
```

Para iOS se necesita macOS/Xcode o EAS Build:

```bash
npx eas build --profile development --platform ios
```

Esta app necesita **development build**. Expo Go no puede ejecutar los widgets nativos.

## Estado de este bloque

- Login nativo conectado al Firebase actual.
- Lectura en vivo de DinoDúo, cupones, chat y mural.
- Envío básico de DinoMensajes.
- Envío básico de DinoCupones.
- Navegación nativa en cinco pestañas.
- Tres widgets iOS registrados.
- Tres AppWidgets Android con Glance registrados.
- Puente Android para actualizar widgets desde React Native.

Siguiente bloque: fotografías reales en DinoRecuerdos, rotación, deep links, DinoDúo móvil y push nativo.
