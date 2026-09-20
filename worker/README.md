# DinoCupones API (Cloudflare Worker)

Este Worker reemplaza Firebase Cloud Functions y protege las claves privadas de Cloudinary y OneSignal.

## Variables públicas del Worker

Configura:
- `FIREBASE_PROJECT_ID`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_UPLOAD_PRESET=dinocupones_signed`
- `ONESIGNAL_APP_ID`
- `ALLOWED_ORIGIN=https://davidgil1731ferluis-gif.github.io`
- `APP_URL=https://davidgil1731ferluis-gif.github.io/DINO-CUPONES/`

## Secrets

Nunca los subas a GitHub:

```bash
npx wrangler secret put CLOUDINARY_API_SECRET
npx wrangler secret put ONESIGNAL_API_KEY
```

## Endpoints

- `GET /health`: confirma configuración.
- `POST /cloudinary/sign`: genera firma temporal para subir un archivo.
- `POST /notify`: envía una notificación OneSignal al usuario destino.

Los endpoints privados exigen un Firebase ID token válido en `Authorization: Bearer ...`.
