import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const service = fs.readFileSync('js/firebase-service.js', 'utf8');
const intro = fs.readFileSync('js/intro-bootstrap.js', 'utf8');

const errors = [];
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length) errors.push('IDs duplicados: ' + [...new Set(duplicates)].join(', '));

const interactiveIds = [...html.matchAll(/<(button|form)[^>]*\sid="([^"]+)"/g)].map(match => match[2]);
for (const id of interactiveIds) {
  if (!app.includes('#' + id) && !intro.includes('#' + id)) {
    errors.push('Control sin referencia JS: #' + id);
  }
}

const appRefs = [...app.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
for (const id of [...new Set(appRefs)]) {
  if (!ids.includes(id)) errors.push('app.js referencia un ID inexistente: #' + id);
}

const introRefs = [...intro.matchAll(/\$\('#([^']+)'\)/g)].map(match => match[1]);
for (const id of [...new Set(introRefs)]) {
  if (!ids.includes(id)) errors.push('intro-bootstrap.js referencia un ID inexistente: #' + id);
}

for (const match of html.matchAll(/data-tab="([^"]+)"/g)) {
  const panelId = match[1] + 'Tab';
  if (!html.includes('id="' + panelId + '"')) errors.push('Pestaña sin panel: ' + match[1]);
}

const singleSelectorForEach = app
  .split('\n')
  .filter(line => /^\s*\$\([^\n]+\)\.forEach/.test(line));
if (singleSelectorForEach.length) {
  errors.push('Se usó $() con .forEach; debe usarse $$(): ' + singleSelectorForEach.join(' | '));
}

if (/\${3,}\(/.test(app)) errors.push('Selector helper inválido: hay $$$ o más.');
if (app.includes('$document') || app.includes('$window')) {
  errors.push('Referencia global inválida: $document/$window.');
}

if (!app.includes('registerAccount')) errors.push('El flujo de registro no está conectado en app.js.');
if (!service.includes('export async function registerAccount')) errors.push('Falta registerAccount en firebase-service.js.');
if (!service.includes('export function subscribePairForUser')) errors.push('Falta sincronización en vivo del DinoDúo.');
if (!service.includes('export function subscribePairMessages')) errors.push('Falta sincronización en vivo de DinoMensajes.');
if (!app.includes('startPairRealtime')) errors.push('app.js no inicia la sincronización en vivo del DinoDúo.');
if (!html.includes('id="pairRealtimeStatus"')) errors.push('Falta indicador visual de sincronización del DinoDúo.');
if (!html.includes('id="unlinkPairDialog"')) errors.push('Falta confirmación propia para desvincular DinoDúo.');
if (!html.includes('id="pairReplyPreview"')) errors.push('Falta vista previa para responder DinoMensajes.');
if (!html.includes('class="hero-dashboard"')) errors.push('Falta el dashboard principal restaurado.');
if (!html.includes('mural-widget-badge')) errors.push('Falta la identidad completa del DinoWidget.');
if (!html.includes('data-open-tab="gift"')) errors.push('Falta acceso rápido a Regalar desde Nosotros.');
if (!html.includes('data-open-tab="chat"')) errors.push('Falta acceso rápido al Chat desde Nosotros.');
if (!html.includes('id="chatResolvingView"')) errors.push('Falta estado de resolución de DinoChat.');
if (!html.includes('id="giftResolvingView"')) errors.push('Falta estado de resolución de Regalar.');
if (!styles.includes('[hidden]{display:none!important}')) errors.push('Los estados hidden pueden ser anulados por CSS.');
if (!app.includes('pairStateResolved')) errors.push('Falta distinguir estado DinoDúo pendiente de estado sin vínculo.');
if (!app.includes('resizePairMessageInput')) errors.push('Falta autoajuste del compositor de DinoChat.');
if (!app.includes('beginPairReply')) errors.push('Falta lógica para responder DinoMensajes.');
if (!app.includes('replyToId')) errors.push('Los DinoMensajes no guardan referencia de respuesta.');
if (!html.includes('id="chatTab"')) errors.push('Falta pestaña independiente de Chat.');
if (!html.includes('id="giftTab"')) errors.push('Falta pestaña independiente para regalar cupones.');
if (!html.includes('id="chatTabBadge"')) errors.push('Falta contador de mensajes no leídos en Chat.');
if (!app.includes("'chat','gift','pair'")) errors.push('La navegación no sincroniza las áreas privadas separadas.');
if (!service.includes('readByUid')) errors.push('Falta persistencia de lectura para mensajes del DinoDúo.');
if (!html.includes('intro-bootstrap.js')) errors.push('Falta cargar intro-bootstrap.js en index.html.');
if (!intro.includes('window.DinoIntro')) errors.push('El bootstrap de la intro no expone DinoIntro.');
if (!html.includes('id="unlinkPairBtn"')) errors.push('Falta el botón para desvincular DinoDúo.');
if (!html.includes('id="pairSetupStatus"')) errors.push('Falta confirmación visual al cerrar DinoDúo.');
if (!html.includes('id="pushSubscriptionStatus"')) errors.push('Falta diagnóstico de suscripción OneSignal.');
if (!service.includes('export async function getPushStatus')) errors.push('Falta getPushStatus para validar OneSignal.');
if (!service.includes('subscription.optIn')) errors.push('Falta reparar suscripciones OneSignal con optIn().');
if (!service.includes('export async function sendPushTest')) errors.push('Falta prueba directa de notificación push.');
if (!service.includes('export function getKeepSessionPreference')) errors.push('Falta preferencia de sesión persistente.');
if (!html.includes('id="muralWidget"')) errors.push('Falta DinoWidget rotativo del mural.');
if (!html.includes('brand-mark-image')) errors.push('Falta la identidad visual del triceratops en el login.');
if (!html.includes('brand-mini-logo')) errors.push('Falta la identidad visual del triceratops en el header.');
if (!html.includes('triceratops-deliver.png')) errors.push('La app no está usando el triceratops como logo.');
if (!intro.includes('updateViaCache')) errors.push('La PWA no fuerza actualización sin caché del service worker.');

const beforeEnsure = service.split('async function ensureFirebase')[0] || '';
if (/await import\('https:\/\/www\.gstatic\.com/.test(beforeEnsure)) {
  errors.push('Firebase vuelve a bloquear el arranque con imports remotos top-level.');
}

const required = [
  'skipIntroBtn','openLetterBtn','continueToLoginBtn',
  'loginForm','registerForm','showLoginBtn','showRegisterBtn','demoAccessBtn',
  'logoutBtn','notificationBtn','openUploadBtn','generatePairCodeBtn','unlinkPairBtn','confirmUnlinkPairBtn','cancelUnlinkPairBtn','keepPairLinkedBtn','updateAppBtn','testPushBtn','keepSessionCheckbox','muralWidgetOpenBtn',
  'pairCouponForm','pairMessageForm','cancelPairReplyBtn','couponForm','messageForm'
];
for (const id of required) {
  if (!ids.includes(id)) errors.push('Falta control obligatorio: #' + id);
}

if (errors.length) {
  console.error('\nUI contract FAILED\n- ' + errors.join('\n- '));
  process.exit(1);
}

console.log(
  'UI contract OK:',
  interactiveIds.length,
  'controles revisados,',
  ids.length,
  'IDs únicos y arranque desacoplado de Firebase.'
);
