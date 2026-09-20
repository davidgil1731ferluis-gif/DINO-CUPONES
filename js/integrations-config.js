export const integrationsConfig = {
  // URL pública del Cloudflare Worker, sin barra final.
  apiBaseUrl: 'https://dinocupones-api.davidgil1731ferluis.workers.dev',

  // Datos públicos de Cloudinary.
  cloudinary: {
    cloudName: 'kyeuesop',
    uploadPreset: 'dinocupones_signed'
  },

  // El App ID de OneSignal es público y puede vivir en el frontend.
  oneSignal: {
    appId: 'e5ad39b8-8cfe-40e9-848c-cdaf86078df6',
    serviceWorkerPath: 'onesignal/OneSignalSDKWorker.js',
    serviceWorkerScope: '/DINO-CUPONES/onesignal/'
  }
};

export const cloudinaryReady =
  integrationsConfig.apiBaseUrl &&
  !integrationsConfig.apiBaseUrl.startsWith('TU_') &&
  integrationsConfig.cloudinary.cloudName &&
  !integrationsConfig.cloudinary.cloudName.startsWith('TU_');

export const oneSignalReady =
  integrationsConfig.oneSignal.appId &&
  !integrationsConfig.oneSignal.appId.startsWith('TU_');

export const workerReady =
  integrationsConfig.apiBaseUrl &&
  !integrationsConfig.apiBaseUrl.startsWith('TU_');
