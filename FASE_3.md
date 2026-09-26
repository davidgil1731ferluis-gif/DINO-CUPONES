# DinoCupones — Fase 3: aplicación móvil y widgets

## Objetivo

Crear una aplicación nativa Android/iOS sin retirar la web/PWA existente y habilitar widgets reales de pantalla de inicio.

## Arquitectura

- `/mobile`: nueva app Expo/React Native.
- Misma autenticación y base Firestore de DinoCupones.
- iOS: `expo-widgets`.
- Android: módulo local Expo + Jetpack Glance.
- La web/PWA existente permanece intacta.

## Widgets

- DinoRecuerdos.
- DinoCupones activos.
- DinoMensajes.

## Bloque 1

Se creó la base móvil, navegación, conexión Firebase en tiempo real y la infraestructura de widgets para iOS/Android.

## Próximo bloque

- Foto real del DinoMural dentro del widget.
- Rotación de recuerdos.
- Widget de cupones con más información.
- Deep links desde widgets.
- Crear/aceptar DinoDúo desde móvil.
- Notificaciones push nativas.
- Primer development build instalable en Android.
