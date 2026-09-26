# DinoCupones — Fase 1

Versión estabilizada el 26-09-2026.

## Cambios aplicados

- Reparación de los recursos gráficos corruptos de la PWA.
- Regeneración de los iconos 180, 192 y 512 px desde el triceratops válido.
- Fallback visual estable para la intro cuando el fondo original no puede cargarse.
- Ajustes de capas de la intro para mantener visibles texto, dinosaurio, carta y controles.
- Mejoras responsive para evitar textos, botones, tickets y encabezados cortados.
- Soporte de `safe-area-inset` para iPhone y dispositivos con notch.
- Nueva versión de caché del Service Worker para forzar la actualización de los recursos reparados.
- Conservación de Firebase, Firestore, OneSignal, DinoDúo, DinoMural, cupones y mensajes existentes.

## Validaciones ejecutadas

- `node --check js/intro-bootstrap.js`
- `node --check js/app.js`
- `node --check js/firebase-service.js`
- `node tests/ui-contract.mjs`

Resultado del contrato UI: 41 controles revisados y 146 IDs únicos.

## Importante

El archivo original `assets/romantic-jungle-bg.webp` incluido en el ZIP recibido estaba truncado y no podía decodificarse. En esta versión se reemplaza por un recurso WEBP válido y la escena visual del inicio queda respaldada por CSS, por lo que ya no queda una pantalla vacía si falta la ilustración original.
