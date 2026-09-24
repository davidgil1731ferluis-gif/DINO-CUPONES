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
if (!intro.includes('updateViaCache')) errors.push('La PWA no fuerza actualización sin caché del service worker.');

const beforeEnsure = service.split('async function ensureFirebase')[0] || '';
if (/await import\('https:\/\/www\.gstatic\.com/.test(beforeEnsure)) {
  errors.push('Firebase vuelve a bloquear el arranque con imports remotos top-level.');
}

const required = [
  'skipIntroBtn','openLetterBtn','continueToLoginBtn',
  'loginForm','registerForm','showLoginBtn','showRegisterBtn','demoAccessBtn',
  'logoutBtn','notificationBtn','openUploadBtn','generatePairCodeBtn','unlinkPairBtn','updateAppBtn','testPushBtn','keepSessionCheckbox','muralWidgetOpenBtn',
  'pairCouponForm','pairMessageForm','couponForm','messageForm'
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
