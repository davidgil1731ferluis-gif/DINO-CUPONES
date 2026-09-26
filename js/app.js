import {
  firebaseReady,
  mediaReady,
  pushReady,
  onAuth,
  login,
  getKeepSessionPreference,
  registerAccount,
  logout,
  resetPassword,
  deleteCurrentAccount,
  getProfile,
  getPairForUser,
  createPairInvite,
  acceptPairInvite,
  unlinkPair,
  listCoupons,
  listSentCoupons,
  listAllCoupons,
  createCoupon,
  setCouponProgress,
  deleteCoupon,
  resetCoupon,
  listMural,
  listAllMural,
  uploadMural,
  deleteMural,
  listMessages,
  listPairMessages,
  sendMessage,
  markMessageRead,
  listUsers,
  requestPushPermission,
  sendPushTest,
  getPushStatus,
  identifyPushUser,
  clearPushUser,
  onForegroundMessage
} from './firebase-service.js?v=20260926-phase1';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

let currentUser = null;
let profile = null;
let coupons = [];
let mural = [];
let messages = [];
let pairMessages = [];
let sentCoupons = [];
let adminCoupons = [];
let adminMural = [];
let users = [];
let currentPair = null;
let partnerUid = null;
let partnerName = '';
let pairSyncInFlight = false;
let filter = 'active';
let couponView = 'received';
let localDemoMedia = [];
let muralWidgetTimer = null;
let muralWidgetIndex = 0;
let muralWidgetCurrentId = null;
let enterAppPromise = null;
let enteredUserUid = null;
const screens = ['#introScreen', '#letterScreen', '#authScreen', '#appScreen'];

let soundEnabled = false;
let audioContext = null;

function playTone({frequency=520,duration=.14,type='sine',gain=.05,delay=0}={}) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const volume = audioContext.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    volume.gain.setValueAtTime(0, audioContext.currentTime + delay);
    volume.gain.linearRampToValueAtTime(gain, audioContext.currentTime + delay + .015);
    volume.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
    osc.connect(volume);
    volume.connect(audioContext.destination);
    osc.start(audioContext.currentTime + delay);
    osc.stop(audioContext.currentTime + delay + duration + .02);
  } catch (error) {
    console.debug('Audio no disponible', error);
  }
}

function playChime(kind='soft') {
  if (!soundEnabled) return;
  if (kind === 'complete') {
    playTone({frequency:523,duration:.16,gain:.045});
    playTone({frequency:659,duration:.18,gain:.045,delay:.08});
    playTone({frequency:784,duration:.22,gain:.04,delay:.16});
    return;
  }
  playTone({frequency:587,duration:.14,gain:.04});
  playTone({frequency:740,duration:.18,gain:.035,delay:.09});
}

function celebrateFrom(element) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rect = element?.getBoundingClientRect?.() || {left:window.innerWidth/2,top:window.innerHeight/2,width:0,height:0};
  const emojis=['💜','💗','✨','🌸'];
  for (let i=0;i<12;i++) {
    const particle=document.createElement('span');
    particle.className='celebration-particle';
    particle.textContent=emojis[i%emojis.length];
    particle.style.left=`${rect.left+rect.width/2}px`;
    particle.style.top=`${rect.top+rect.height/2}px`;
    particle.style.setProperty('--tx',`${(Math.random()-.5)*180}px`);
    particle.style.setProperty('--ty',`${-40-Math.random()*120}px`);
    particle.style.setProperty('--rot',`${(Math.random()-.5)*90}deg`);
    document.body.appendChild(particle);
    setTimeout(()=>particle.remove(),950);
  }
}

function observeReveals() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    $$('.reveal-item').forEach(el=>el.classList.add('is-revealed'));
    return;
  }
  const observer=new IntersectionObserver((entries,obs)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  },{rootMargin:'80px 0px',threshold:.08});
  $$('.reveal-item:not(.is-revealed)').forEach(el=>observer.observe(el));
}

function showScreen(id) {
  screens.forEach((screenId) => $(screenId).classList.toggle('is-visible', screenId === id));
}

function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function fmtDate(date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(date));
}

function fmtDateTime(date) {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date));
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'ahora';
  if (sec < 3600) return `hace ${Math.floor(sec / 60)} min`;
  if (sec < 86400) return `hace ${Math.floor(sec / 3600)} h`;
  return fmtDate(date);
}

function escapeHtml(text = '') {
  return String(text).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function safeConfirm(message) {
  return window.confirm(message);
}

function submitButton(event) {
  return event.submitter || event.currentTarget.querySelector('button[type="submit"]');
}

function setButtonBusy(button, busy, busyText = 'Procesando...') {
  if (!button) return;
  if (busy) {
    button.dataset.originalText ||= button.textContent;
    button.disabled = true;
    button.textContent = busyText;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
}

let deferredInstallPrompt = null;

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function renderInstallAvailability() {
  const installed = isStandaloneApp();
  const mobile = isIosDevice() || isAndroidDevice();
  document.querySelectorAll('[data-install-app]').forEach((button) => {
    button.hidden = installed || (!mobile && !deferredInstallPrompt);
  });
  $('#installAppBtn')?.setAttribute('aria-hidden', String(installed));
}

function renderInstallInstructions() {
  const text = $('#installDialogText');
  const steps = $('#installSteps');
  const action = $('#installDialogActionBtn');
  if (!text || !steps || !action) return;

  action.hidden = true;
  action.onclick = null;

  if (deferredInstallPrompt) {
    text.textContent = 'DinoCupones puede instalarse como una aplicación independiente en este dispositivo.';
    steps.innerHTML = '<div><b>1</b><span>Pulsa “Instalar ahora”.</span></div><div><b>2</b><span>Confirma la instalación del navegador.</span></div><div><b>3</b><span>Abre DinoCupones desde su nuevo ícono.</span></div>';
    action.hidden = false;
    action.onclick = triggerNativeInstall;
    return;
  }

  if (isIosDevice()) {
    text.textContent = 'En iPhone o iPad debes agregar DinoCupones a la pantalla de inicio antes de activar las notificaciones.';
    steps.innerHTML = '<div><b>1</b><span>Pulsa el botón Compartir del navegador.</span></div><div><b>2</b><span>Elige “Agregar a pantalla de inicio”.</span></div><div><b>3</b><span>Abre DinoCupones desde el ícono instalado y activa las notificaciones.</span></div>';
    return;
  }

  if (isAndroidDevice()) {
    text.textContent = 'Puedes instalar DinoCupones desde Chrome como una aplicación.';
    steps.innerHTML = '<div><b>1</b><span>Abre el menú ⋮ de Chrome.</span></div><div><b>2</b><span>Elige “Instalar aplicación” o “Agregar a pantalla principal”.</span></div><div><b>3</b><span>Abre DinoCupones desde el nuevo ícono.</span></div>';
    return;
  }

  text.textContent = 'Tu navegador permite instalar aplicaciones web desde su menú o desde el icono de instalación en la barra de direcciones.';
  steps.innerHTML = '<div><b>1</b><span>Busca “Instalar aplicación” en el navegador.</span></div><div><b>2</b><span>Confirma la instalación.</span></div>';
}

async function triggerNativeInstall() {
  if (!deferredInstallPrompt) return;
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice.catch(() => null);
  if (choice?.outcome === 'accepted') {
    $('#installDialog')?.close();
    toast('DinoCupones se está instalando 💜');
  }
  renderInstallAvailability();
}

function openInstallDialog() {
  if (isStandaloneApp()) {
    toast('DinoCupones ya está instalada en este dispositivo.');
    return;
  }
  renderInstallInstructions();
  $('#installDialog').showModal();
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  renderInstallAvailability();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  renderInstallAvailability();
  $('#installDialog')?.open && $('#installDialog').close();
  toast('DinoCupones instalada correctamente 🦖💜');
});

document.querySelectorAll('[data-install-app]').forEach((button) => {
  button.onclick = openInstallDialog;
});
$('#closeInstallDialogBtn').onclick = () => $('#installDialog').close();

renderInstallAvailability();

function setAuthMode(mode = 'login') {
  const loginMode = mode === 'login';
  $('#loginForm').hidden = !loginMode;
  $('#registerForm').hidden = loginMode;
  $('#loginHelpArea').hidden = !loginMode;
  $('#demoAccessBtn').hidden = !loginMode || firebaseReady;
  $('#showLoginBtn').classList.toggle('is-active', loginMode);
  $('#showRegisterBtn').classList.toggle('is-active', !loginMode);
  $('#showLoginBtn').setAttribute('aria-selected', String(loginMode));
  $('#showRegisterBtn').setAttribute('aria-selected', String(!loginMode));
}

function resetSessionState() {
  currentUser = null;
  profile = null;
  coupons = [];
  mural = [];
  messages = [];
  pairMessages = [];
  sentCoupons = [];
  adminCoupons = [];
  adminMural = [];
  users = [];
  currentPair = null;
  partnerUid = null;
  partnerName = '';
  filter = 'active';
  couponView = 'received';
  $$('.chip').forEach((item) => item.classList.toggle('is-active', item.dataset.filter === 'active'));
  $$('[data-coupon-view]').forEach((item) => item.classList.toggle('is-active', item.dataset.couponView === 'received'));
  ['#couponDialog','#uploadDialog','#muralViewerDialog','#installDialog','#accountDialog'].forEach((selector) => {
    const dialog = $(selector);
    if (dialog?.open) dialog.close();
  });
  toggleDrawer(false);
  $('.tabbar')?.classList.remove('has-admin');
  setAuthMode('login');
}

const introTimers = [];
let introStarted = false;

function introLater(delay, callback) {
  const timer = window.setTimeout(callback, delay);
  introTimers.push(timer);
  return timer;
}

function clearIntroTimers() {
  while (introTimers.length) window.clearTimeout(introTimers.pop());
}

function revealIntroLetter() {
  const letter = $('#letterDelivery');
  if (!letter) return;
  letter.hidden = false;
  requestAnimationFrame(() => letter.classList.add('is-visible'));
  playChime('soft');
}

function resetPngDinoStage() {
  const intro = $('#introScreen');
  const stage = $('#dinoStage');
  const run = $('#dinoRun');
  const deliver = $('#dinoDeliver');
  const exit = $('#dinoExit');
  clearIntroTimers();
  intro?.classList.remove('is-letter-mode');
  stage?.classList.remove('is-arrived', 'is-leaving');
  [run, deliver, exit].forEach((img) => img?.classList.remove('is-visible', 'is-running', 'is-delivering', 'is-exiting'));
  const letter = $('#letterDelivery');
  if (letter) {
    letter.hidden = true;
    letter.classList.remove('is-visible');
  }
}

function startPngIntro() {
  if (introStarted) return;
  introStarted = true;

  const stage = $('#dinoStage');
  const run = $('#dinoRun');
  const deliver = $('#dinoDeliver');
  const exit = $('#dinoExit');
  if (!stage || !run || !deliver || !exit) {
    revealIntroLetter();
    return;
  }

  resetPngDinoStage();

  run.classList.add('is-visible', 'is-running');

  introLater(3750, () => {
    run.classList.remove('is-visible', 'is-running');
    $('#introScreen')?.classList.add('is-letter-mode');
    stage.classList.add('is-arrived');
    deliver.classList.add('is-visible', 'is-delivering');
  });

  // La carta permanece oculta hasta que la pose de entrega ya está en pantalla.
  introLater(4750, () => {
    revealIntroLetter();
  });

  introLater(6250, () => {
    deliver.classList.remove('is-visible', 'is-delivering');
    stage.classList.remove('is-arrived');
    stage.classList.add('is-leaving');
    exit.classList.add('is-visible', 'is-exiting');
  });

  introLater(9050, () => {
    exit.classList.remove('is-visible', 'is-exiting');
    stage.classList.remove('is-leaving');
  });
}

function setupPngIntro() {
  const assets = [
    $('.intro-bg-image'),
    $('#dinoRun'),
    $('#dinoDeliver'),
    $('#dinoExit')
  ].filter(Boolean);

  const ready = Promise.all(assets.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    if (typeof img.decode === 'function') {
      return img.decode().catch(() => new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      }));
    }
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  }));

  Promise.race([
    ready,
    new Promise((resolve) => window.setTimeout(resolve, 1400))
  ]).then(() => introLater(180, startPngIntro));
}

if (!window.DinoIntro) setupPngIntro();

$('#skipIntroBtn').onclick = () => {
  if (window.DinoIntro) {
    window.DinoIntro.skip();
    return;
  }
  clearIntroTimers();
  introStarted = true;
  const stage = $('#dinoStage');
  $('#introScreen')?.classList.add('is-letter-mode');
  stage?.classList.remove('is-arrived');
  stage?.classList.add('is-leaving');
  [$('#dinoRun'), $('#dinoDeliver'), $('#dinoExit')].forEach((img) => {
    img?.classList.remove('is-visible', 'is-running', 'is-delivering', 'is-exiting');
  });
  revealIntroLetter();
};
$('#openLetterBtn').onclick = () => {
  playChime('soft');
  if (window.DinoIntro) window.DinoIntro.showScreen('#letterScreen');
  else showScreen('#letterScreen');
};
$('#continueToLoginBtn').onclick = () => {
  playChime('soft');
  if (window.DinoIntro) window.DinoIntro.showScreen('#authScreen');
  else showScreen('#authScreen');
};
$('#soundToggleBtn').onclick = () => {
  soundEnabled = !soundEnabled;
  $('#soundToggleBtn').setAttribute('aria-pressed', String(soundEnabled));
  $('#soundToggleBtn').setAttribute('aria-label', soundEnabled ? 'Desactivar sonidos' : 'Activar sonidos');
  toast(soundEnabled ? 'Sonidos suaves activados ♪' : 'Sonidos desactivados');
  if (soundEnabled) playChime('soft');
};

$('#showLoginBtn').onclick = () => setAuthMode('login');
$('#showRegisterBtn').onclick = () => setAuthMode('register');

$('#togglePasswordBtn').onclick = () => {
  const input = $('#loginPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
};

$('#toggleRegisterPasswordBtn').onclick = () => {
  const password = $('#registerPassword');
  const confirm = $('#registerPasswordConfirm');
  const nextType = password.type === 'password' ? 'text' : 'password';
  password.type = nextType;
  confirm.type = nextType;
};

$('#forgotPasswordBtn').onclick = async () => {
  const email = $('#loginEmail').value.trim();
  if (!email) return toast('Escribe primero tu correo.');
  try {
    await resetPassword(email);
    toast(firebaseReady ? 'Se envió el enlace de restablecimiento.' : 'Modo demo: el restablecimiento se habilita al conectar Firebase.');
  } catch (error) {
    console.error(error);
    toast('No fue posible enviar el enlace.');
  }
};

$('#demoAccessBtn').onclick = async () => {
  const button = $('#demoAccessBtn');
  setButtonBusy(button, true, 'Entrando...');
  try {
    await enterApp({uid:'demo-user',email:'demo@dinocupones.app'});
    toast('Administrador demo activo.');
  } catch (error) {
    console.error(error);
    toast('No se pudo abrir el modo demo.');
  } finally {
    setButtonBusy(button, false);
  }
};

$('#loginForm').onsubmit = async (event) => {
  event.preventDefault();
  const button = submitButton(event);
  setButtonBusy(button, true, 'Ingresando...');
  try {
    const credential = await login(
      $('#loginEmail').value.trim(),
      $('#loginPassword').value,
      $('#keepSessionCheckbox').checked
    );
    await enterApp(credential.user);
    if (!firebaseReady) {
      toast(credential.user.uid === 'demo-user'
        ? 'Administrador demo activo.'
        : 'Cuenta demo local iniciada.');
    }
  } catch (error) {
    console.error(error);
    toast(humanAuthError(error));
  } finally {
    setButtonBusy(button, false);
  }
};

$('#registerForm').onsubmit = async (event) => {
  event.preventDefault();
  const password = $('#registerPassword').value;
  const confirm = $('#registerPasswordConfirm').value;
  if (password !== confirm) return toast('Las contraseñas no coinciden.');

  const button = submitButton(event);
  setButtonBusy(button, true, 'Creando cuenta...');
  try {
    const credential = await registerAccount({
      displayName: $('#registerName').value.trim(),
      email: $('#registerEmail').value.trim(),
      password
    });
    event.currentTarget.reset();

    await enterApp(credential.user);
    toast(firebaseReady
      ? 'Cuenta creada correctamente 💜'
      : 'Cuenta demo creada. Ya puedes probarla y volver a iniciar sesión con ella.');
  } catch (error) {
    console.error(error);
    toast(humanAuthError(error));
  } finally {
    setButtonBusy(button, false);
  }
};

$('#logoutBtn').onclick = async () => {
  try {
    await clearPushUser();
    await logout();
  } finally {
    resetSessionState();
    showScreen('#authScreen');
  }
};

$('#accountSettingsBtn').onclick = () => {
  $('#deleteAccountPassword').value = '';
  $('#currentAccountEmail').textContent = profile?.email || currentUser?.email || 'Sin correo';
  $('#accountDialog').showModal();
};

$('#closeAccountDialogBtn').onclick = () => $('#accountDialog').close();

$('#updateAppBtn').onclick = async () => {
  const button = $('#updateAppBtn');
  setButtonBusy(button,true,'Buscando actualización...');
  try {
    if (window.DinoIntro?.checkForUpdate) {
      await window.DinoIntro.checkForUpdate(true);
    } else {
      const registration = await navigator.serviceWorker?.getRegistration('./');
      if (registration) await registration.update();
      window.location.reload();
    }
  } catch (error) {
    console.error(error);
    toast('No se pudo comprobar la actualización.');
    setButtonBusy(button,false);
  }
};

$('#sendMyResetBtn').onclick = async () => {
  const email = profile?.email || currentUser?.email;
  if (!email) return toast('No se encontró el correo de la cuenta.');
  const button = $('#sendMyResetBtn');
  setButtonBusy(button, true, 'Enviando...');
  try {
    await resetPassword(email);
    toast('Enlace de cambio de contraseña enviado.');
  } catch (error) {
    console.error(error);
    toast(humanAuthError(error));
  } finally {
    setButtonBusy(button, false);
  }
};

$('#deleteMyAccountBtn').onclick = async () => {
  const password = $('#deleteAccountPassword').value;
  if (!password) return toast('Escribe tu contraseña actual para confirmar.');
  const confirmed = safeConfirm(
    '¿Eliminar definitivamente tu cuenta?\n\n' +
    'Se cerrará tu DinoDúo activo y perderás el acceso a esta cuenta. Esta acción no se puede deshacer.'
  );
  if (!confirmed) return;

  const button = $('#deleteMyAccountBtn');
  setButtonBusy(button, true, 'Eliminando...');
  try {
    await clearPushUser();
    await deleteCurrentAccount(password);
    $('#accountDialog').close();
    resetSessionState();
    showScreen('#authScreen');
    toast('Tu cuenta fue eliminada.');
  } catch (error) {
    console.error(error);
    toast(humanAuthError(error));
  } finally {
    setButtonBusy(button, false);
    $('#deleteAccountPassword').value = '';
  }
};

function humanAuthError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Usuario o contraseña incorrectos.';
  if (code.includes('email-already-in-use')) return 'Ese correo ya tiene una cuenta.';
  if (code.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (code.includes('invalid-email')) return 'Escribe un correo válido.';
  if (code.includes('invalid-display-name')) return 'Escribe un nombre válido.';
  if (code.includes('too-many-requests')) return 'Demasiados intentos. Intenta más tarde.';
  if (code.includes('requires-recent-login')) return 'Por seguridad, vuelve a iniciar sesión antes de eliminar tu cuenta.';
  if (code.includes('operation-not-allowed')) return 'Activa Correo/Contraseña en Firebase Authentication.';
  if (code.includes('permission-denied')) return 'Firestore rechazó la operación. Revisa que la base de datos y sus reglas estén publicadas.';
  if (code.includes('failed-precondition')) return 'Firebase todavía necesita una configuración adicional en este proyecto.';
  if (code.includes('network-request-failed')) return 'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.';
  return error?.message || 'No se pudo completar la operación.';
}

setAuthMode('login');
$('#keepSessionCheckbox').checked = getKeepSessionPreference();

onAuth(async (user) => {
  if (firebaseReady && user) {
    await enterApp(user);
  } else if (firebaseReady && !user && !$('#introScreen').classList.contains('is-visible')) {
    showScreen('#authScreen');
  }
});

async function enterApp(user) {
  if (!user?.uid) return;
  if (enteredUserUid === user.uid && currentUser?.uid === user.uid && profile) return;
  if (enterAppPromise && currentUser?.uid === user.uid) return enterAppPromise;

  currentUser = user;

  // Muestra la aplicación inmediatamente; los datos llegan después.
  const provisionalName = user.displayName || user.email?.split('@')[0] || 'Dino';
  $('#userName').textContent = provisionalName;
  $('#userRole').textContent = 'Cargando...';
  $('#userAvatar').textContent = provisionalName[0]?.toUpperCase() || 'D';
  $('#currentAccountEmail').textContent = user.email || 'Cargando...';
  $('#adminTabBtn').hidden = true;
  $('.tabbar').classList.remove('has-admin');
  $('#nextCouponTitle').textContent = 'Cargando tus aventuras...';
  showScreen('#appScreen');

  enterAppPromise = (async () => {
    const [resolvedProfile, resolvedPair] = await Promise.all([
      getProfile(user.uid),
      getPairForUser(user.uid)
    ]);

    profile = resolvedProfile;
    $('#userName').textContent = profile.displayName || provisionalName;
    $('#userRole').textContent = profile.role === 'admin' ? 'Administrador' : 'Invitado especial';
    $('#userAvatar').textContent = (profile.displayName || provisionalName || 'D')[0].toUpperCase();
    $('#currentAccountEmail').textContent = profile.email || user.email || 'Sin correo';

    const isAdmin = profile.role === 'admin';
    $('#adminTabBtn').hidden = !isAdmin;
    $('.tabbar').classList.toggle('has-admin', isAdmin);

    await refreshAll(resolvedPair);
    enteredUserUid = user.uid;
    openRequestedTab();

    if (pushReady) {
      identifyPushUser(user.uid).catch((error) => {
        console.warn('OneSignal todavía no pudo identificar al usuario.', error);
      });
    }
    renderNotificationPermissionState();
    renderInstallAvailability();
  })();

  try {
    await enterAppPromise;
  } finally {
    enterAppPromise = null;
  }
}

async function refreshAll(pairOverride = undefined) {
  currentPair = pairOverride !== undefined
    ? pairOverride
    : await getPairForUser(currentUser.uid);

  partnerUid = currentPair?.memberUids?.find((uid) => uid !== currentUser.uid) || null;
  partnerName = partnerUid
    ? (currentPair?.memberNames?.[partnerUid] || 'Tu persona favorita')
    : '';

  // El estado del DinoDúo es prioritario: se pinta antes de cualquier
  // consulta secundaria para que el usuario nunca quede atrapado en
  // "Crear invitación" si el vínculo ya existe.
  renderPairWorkspace();

  const [couponsResult, muralResult, messagesResult, sentResult, pairMessagesResult] =
    await Promise.allSettled([
      listCoupons(currentUser.uid, currentPair?.id || null),
      listMural(currentUser.uid, currentPair?.id || null),
      listMessages(currentUser.uid, currentPair?.id || null),
      currentPair ? listSentCoupons(currentUser.uid, currentPair.id) : Promise.resolve([]),
      currentPair ? listPairMessages(currentPair.id,currentUser.uid) : Promise.resolve([])
    ]);

  if (couponsResult.status === 'fulfilled') coupons = couponsResult.value;
  else console.warn('No se pudieron cargar los cupones.', couponsResult.reason);

  if (muralResult.status === 'fulfilled') mural = muralResult.value;
  else console.warn('No se pudo cargar el DinoMural.', muralResult.reason);

  if (messagesResult.status === 'fulfilled') messages = messagesResult.value;
  else console.warn('No se pudieron cargar los mensajes.', messagesResult.reason);

  if (sentResult.status === 'fulfilled') sentCoupons = sentResult.value;
  else console.warn('No se pudieron cargar los cupones enviados.', sentResult.reason);

  if (pairMessagesResult.status === 'fulfilled') pairMessages = pairMessagesResult.value;
  else console.warn('No se pudo cargar la conversación del DinoDúo.', pairMessagesResult.reason);

  if (localDemoMedia.length) {
    const visibleDemoMedia = localDemoMedia.filter((item) => item.pairId
      ? item.pairId === currentPair?.id
      : !currentPair && item.userId === currentUser.uid);
    mural.unshift(...visibleDemoMedia);
  }

  renderCoupons();
  renderMural();
  renderMessages();
  renderHero();
  renderSummary();
  renderPairWorkspace();

  if (profile.role === 'admin') {
    const [usersResult, adminCouponsResult, adminMuralResult] = await Promise.allSettled([
      listUsers(),
      listAllCoupons(),
      listAllMural()
    ]);

    users = usersResult.status === 'fulfilled' ? usersResult.value : users;
    adminCoupons = adminCouponsResult.status === 'fulfilled' ? adminCouponsResult.value : adminCoupons;
    adminMural = adminMuralResult.status === 'fulfilled' ? adminMuralResult.value : adminMural;

    if (usersResult.status === 'rejected') console.warn('No se pudo cargar la lista de usuarios.', usersResult.reason);
    if (adminCouponsResult.status === 'rejected') console.warn('No se pudo cargar el consolidado de cupones.', adminCouponsResult.reason);
    if (adminMuralResult.status === 'rejected') console.warn('No se pudo cargar el consolidado del mural.', adminMuralResult.reason);

    renderAdminUsers();
    renderRecipients();
    renderAdminMedia();
    renderAdminCoupons();
    renderAdminSummary();
  }
}

function renderSummary() {
  $('#statActive').textContent = coupons.filter(c=>c.status==='active').length;
  $('#statPending').textContent = coupons.filter(c=>c.status==='pending').length;
  $('#statCompleted').textContent = coupons.filter(c=>c.status==='completed').length;
}

function renderAdminSummary() {
  if (profile?.role !== 'admin') return;
  $('#adminTotalCoupons').textContent = adminCoupons.length;
  $('#adminUnreadMessages').textContent = messages.filter(m=>!m.read).length;
  $('#adminTotalMemories').textContent = adminMural.length;
}

function renderHero() {
  const active = coupons
    .filter((coupon) => coupon.status === 'active')
    .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
  $('#nextCouponTitle').textContent = active[0]?.title || 'Crear un nuevo recuerdo';
}


function showPairSuccess(message) {
  const banner = $('#pairSuccessBanner');
  const text = $('#pairSuccessText');
  if (!banner || !text) return;
  text.textContent = message || ('Ahora tú y ' + (partnerName || 'tu persona favorita') + ' están conectados.');
  banner.hidden = false;
  banner.classList.remove('is-popping');
  requestAnimationFrame(() => banner.classList.add('is-popping'));
}

$('#dismissPairSuccessBtn').onclick = () => {
  $('#pairSuccessBanner').hidden = true;
};

function showPairSetupStatus(message) {
  const box = $('#pairSetupStatus');
  if (!box) return;
  const paragraph = box.querySelector('p');
  if (paragraph && message) paragraph.textContent = message;
  box.hidden = false;
}

function hidePairSetupStatus() {
  const box = $('#pairSetupStatus');
  if (box) box.hidden = true;
}

async function syncPairState({announce=false,full=false}={}) {
  if (!currentUser?.uid || pairSyncInFlight) return;
  pairSyncInFlight = true;
  try {
    const pair = await getPairForUser(currentUser.uid);
    const previousId = currentPair?.id || null;
    const nextId = pair?.id || null;

    if (previousId !== nextId) {
      currentPair = pair;
      partnerUid = currentPair?.memberUids?.find((uid) => uid !== currentUser.uid) || null;
      partnerName = partnerUid
        ? (currentPair?.memberNames?.[partnerUid] || 'Tu persona favorita')
        : '';
      renderPairWorkspace();

      if (pair) {
        hidePairSetupStatus();
        if (announce) {
          showPairSuccess('Tu vínculo con ' + partnerName + ' ya está activo.');
          playChime('complete');
        }
      } else if (previousId && announce) {
        showPairSetupStatus('El DinoDúo anterior fue cerrado. Ya puedes generar o aceptar un nuevo código.');
        toast('Tu DinoDúo anterior fue cerrado.');
      }
    }

    if (full && pair) {
      await refreshAll(pair);
    }
  } catch (error) {
    console.warn('No se pudo sincronizar el DinoDúo todavía.', error);
  } finally {
    pairSyncInFlight = false;
  }
}

function renderPairWorkspace() {
  const setup = $('#pairSetupView');
  const connected = $('#pairConnectedView');
  if (!setup || !connected) return;

  const hasPair = Boolean(currentPair && partnerUid);
  setup.hidden = hasPair;
  connected.hidden = !hasPair;

  if (!hasPair) return;

  hidePairSetupStatus();
  const myName = profile?.displayName || 'Tú';
  $('#pairMeName').textContent = myName;
  $('#pairPartnerName').textContent = partnerName;
  $('#pairCouponRecipientName').textContent = partnerName;
  $('#pairSentRecipientName').textContent = partnerName;
  $('#pairAvatarMe').textContent = myName.charAt(0).toUpperCase();
  $('#pairAvatarPartner').textContent = partnerName.charAt(0).toUpperCase();

  renderPairConversation();
  renderSentCoupons();
}

function renderPairConversation() {
  const box = $('#pairConversation');
  if (!box) return;

  if (!pairMessages.length) {
    box.innerHTML = '<div class="pair-empty"><strong>Aún no hay mensajes.</strong><span>El primero puede ser algo pequeño y bonito. 💌</span></div>';
    return;
  }

  box.innerHTML = pairMessages.map((message) => {
    const mine = message.senderUid === currentUser.uid;
    const sender = mine ? 'Tú' : (message.senderName || partnerName || 'Tu persona');
    return '<article class="pair-message ' + (mine ? 'is-mine' : 'is-theirs') + '">' +
      '<small>' + escapeHtml(sender) + '</small>' +
      '<strong>' + escapeHtml(message.title || 'Un mensaje para ti') + '</strong>' +
      '<p>' + escapeHtml(message.body || '') + '</p>' +
      '<time>' + timeAgo(message.createdAt || new Date()) + '</time>' +
    '</article>';
  }).join('');

  requestAnimationFrame(() => {
    box.scrollTop = box.scrollHeight;
  });
}

function renderSentCoupons() {
  const box = $('#pairSentCoupons');
  if (!box) return;

  if (!sentCoupons.length) {
    box.innerHTML = '<div class="pair-empty compact"><strong>Todavía no has enviado cupones.</strong><span>Cuando regales uno aparecerá aquí.</span></div>';
    return;
  }

  box.innerHTML = sentCoupons.slice(0, 8).map((coupon) => {
    const expiry = new Date(coupon.expiresAt);
    const derivedStatus = coupon.status !== 'completed' && expiry < new Date() ? 'expired' : coupon.status;
    return '<article class="sent-coupon-row">' +
      '<span class="sent-coupon-emoji">' + (coupon.emoji || '💜') + '</span>' +
      '<div><strong>' + escapeHtml(coupon.title) + '</strong>' +
      '<small>' + labelStatus(derivedStatus) + ' · vence ' + fmtDate(coupon.expiresAt) + '</small></div>' +
      '<span class="status-dot ' + derivedStatus + '"></span>' +
    '</article>';
  }).join('');
}

$('#generatePairCodeBtn').onclick = async () => {
  const button = $('#generatePairCodeBtn');
  button.disabled = true;
  try {
    const code = await createPairInvite({
      uid: currentUser.uid,
      displayName: profile?.displayName || 'Dino'
    });
    $('#pairInviteCode').textContent = code;
    $('#pairInviteCodeBox').hidden = false;
    playChime('soft');
    toast('Código de vínculo generado.');
  } catch (error) {
    console.error(error);
    const message = error?.message || 'No se pudo generar el código.';
    if (message.includes('cerrar tu DinoDúo actual')) {
      toast('Detectamos que ya tienes un DinoDúo activo. Sincronizando…');
      await syncPairState({announce:true,full:false});
    } else {
      toast(message);
    }
  } finally {
    button.disabled = false;
  }
};

$('#copyPairCodeBtn').onclick = async () => {
  const code = $('#pairInviteCode').textContent.trim();
  if (!code || code === '------') return;
  try {
    await navigator.clipboard.writeText(code);
    toast('Código copiado 💜');
  } catch {
    toast('Código: ' + code);
  }
};

$('#pairCodeInput').addEventListener('input', (event) => {
  event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
});

$('#pairAcceptForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitter = submitButton(event);
  setButtonBusy(submitter, true);
  try {
    const pair = await acceptPairInvite({
      uid: currentUser.uid,
      displayName: profile?.displayName || 'Dino',
      code: $('#pairCodeInput').value
    });

    currentPair = pair;
    hidePairSetupStatus();
    partnerUid = pair.memberUids?.find((uid) => uid !== currentUser.uid) || null;
    partnerName = partnerUid
      ? (pair.memberNames?.[partnerUid] || 'Tu persona favorita')
      : 'Tu persona favorita';

    event.target.reset();
    renderPairWorkspace();
    showPairSuccess('Ahora tú y ' + partnerName + ' están conectados. Ya pueden enviarse mensajes y DinoCupones.');
    playChime('complete');
    toast('DinoDúo enlazado con éxito 💞');

    // Cargamos el resto después de mostrar el éxito, para que una lectura secundaria
    // nunca oculte que el vínculo sí se creó.
    await refreshAll(pair);
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo completar el vínculo.');
  } finally {
    setButtonBusy(submitter, false);
  }
};

$('#pairCouponForm').onsubmit = async (event) => {
  event.preventDefault();
  if (!currentPair || !partnerUid) return toast('Primero vincula las dos cuentas.');

  const submitter = submitButton(event);
  setButtonBusy(submitter, true);
  try {
    const created = await createCoupon({
      pairId: currentPair.id,
      createdByUid: currentUser.uid,
      createdByName: profile?.displayName || 'Dino',
      assignedToUid: partnerUid,
      assignedToName: partnerName,
      title: $('#pairCouponTitle').value.trim(),
      activity: $('#pairCouponActivity').value.trim(),
      expiresAt: new Date($('#pairCouponExpiry').value)
    });
    event.target.reset();
    await refreshAll();
    playChime('complete');
    if (created?.push?.ok === false && created?.push?.reason === 'NO_SUBSCRIBED_DEVICE') {
      toast('DinoCupón guardado, pero ' + partnerName + ' todavía no tiene un dispositivo suscrito a notificaciones.');
    } else if (created?.push?.ok === false) {
      toast('DinoCupón guardado. La notificación push no pudo confirmarse.');
    } else {
      toast('DinoCupón enviado a ' + partnerName + ' 🎟️');
    }
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el cupón.');
  } finally {
    setButtonBusy(submitter, false);
  }
};

$('#unlinkPairBtn').onclick = async () => {
  if (!currentPair) return toast('No hay un DinoDúo activo.');

  const partner = partnerName || 'tu persona';
  const pairId = currentPair.id;
  const confirmed = safeConfirm(
    '¿Desvincular tu DinoDúo con ' + partner + '?\n\n' +
    'Ambas cuentas quedarán libres para vincularse de nuevo. Los cupones, mensajes y recuerdos del vínculo anterior permanecerán archivados y no se mezclarán con uno nuevo.'
  );
  if (!confirmed) return;

  const button = $('#unlinkPairBtn');
  button.disabled = true;
  button.textContent = 'Desvinculando...';

  try {
    await unlinkPair({ pairId, uid: currentUser.uid });

    currentPair = null;
    partnerUid = null;
    partnerName = '';
    pairMessages = [];
    sentCoupons = [];
    couponView = 'received';

    document.querySelectorAll('[data-coupon-view]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.couponView === 'received');
    });

    renderPairWorkspace();
    showPairSetupStatus('El vínculo se cerró correctamente. Puedes generar un código nuevo o aceptar el de otra persona.');
    await refreshAll(null);

    playChime('soft');
    toast('DinoDúo desvinculado correctamente 💔');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo desvincular el DinoDúo.');
  } finally {
    button.disabled = false;
    button.textContent = '💔 Desvincular DinoDúo';
  }
};

$('#pairMessageForm').onsubmit = async (event) => {
  event.preventDefault();
  if (!currentPair || !partnerUid) return toast('Primero vincula las dos cuentas.');

  const submitter = submitButton(event);
  setButtonBusy(submitter, true);
  try {
    const sent = await sendMessage({
      pairId: currentPair.id,
      senderUid: currentUser.uid,
      senderName: profile?.displayName || 'Dino',
      targetUid: partnerUid,
      title: $('#pairMessageTitle').value.trim() || 'Un mensaje para ti 💜',
      body: $('#pairMessageBody').value.trim()
    });

    event.target.reset();

    try {
      pairMessages = await listPairMessages(currentPair.id,currentUser.uid);
      renderPairConversation();
    } catch (refreshError) {
      console.warn('El mensaje se envió, pero la conversación todavía no pudo refrescarse.',refreshError);
    }

    playChime('soft');
    if (sent?.push?.ok === false && sent?.push?.reason === 'NO_SUBSCRIBED_DEVICE') {
      toast('Mensaje guardado, pero ' + partnerName + ' todavía no tiene un dispositivo suscrito a notificaciones.');
    } else if (sent?.push?.ok === false) {
      toast('Mensaje guardado. La notificación push no pudo confirmarse.');
    } else {
      toast('Mensaje enviado a ' + partnerName + ' con notificación 💌');
    }
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el mensaje.');
  } finally {
    setButtonBusy(submitter, false);
  }
};

document.querySelectorAll('[data-scroll-pair]').forEach((button) => {
  button.onclick = () => {
    const target = $(button.dataset.scrollPair);
    if (!target) return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
    target.classList.add('pair-focus-card');
    window.setTimeout(() => target.classList.remove('pair-focus-card'), 900);
  };
});

function activateMainTab(tab, { sync = true } = {}) {
  const button = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  const panel = $(`#${tab}Tab`);
  if (!button || !panel || button.hidden) return false;

  document.querySelectorAll('.tab-btn').forEach((item) => {
    item.classList.toggle('is-active', item === button);
  });
  document.querySelectorAll('.tab-panel').forEach((item) => item.classList.remove('is-active'));
  panel.classList.add('is-active');

  if (tab === 'pair' && sync) {
    syncPairState({announce:true,full:true});
  }
  return true;
}

function openRequestedTab() {
  const requested = new URL(window.location.href).searchParams.get('tab');
  if (['coupons','mural','pair','admin'].includes(requested || '')) {
    activateMainTab(requested, { sync: requested === 'pair' });
  }
}

document.querySelectorAll('.tab-btn').forEach((button) => {
  button.onclick = () => activateMainTab(button.dataset.tab);
});

$$('[data-coupon-view]').forEach((button) => {
  button.onclick = () => {
    couponView = button.dataset.couponView;
    $$('[data-coupon-view]').forEach((item) => item.classList.toggle('is-active', item === button));
    renderCoupons();
  };
});

$$('.chip').forEach((button) => {
  button.onclick = () => {
    filter = button.dataset.filter;
    $$('.chip').forEach((item) => item.classList.toggle('is-active', item === button));
    renderCoupons();
  };
});

function labelStatus(status) {
  return ({
    active: 'Activo',
    pending: 'Por completar',
    completed: 'Canjeado',
    expired: 'Vencido'
  })[status] || status;
}

function couponAccent(status) {
  return ({
    active: 'Activo ahora',
    pending: 'A mitad de aventura',
    completed: 'Recuerdo cumplido',
    expired: 'Tiempo agotado'
  })[status] || 'Cupón';
}

function couponCode(coupon) {
  const source = String(coupon?.id || coupon?.title || 'DINO');
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(i)) | 0;
  }
  return `DC-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

function renderCoupons() {
  const source = couponView === 'sent' ? sentCoupons : coupons;
  const data = source.filter((coupon) => couponView === 'sent' || coupon.status === filter);
  $('#couponFilters').hidden = couponView === 'sent';

  $('#couponGrid').innerHTML = data.length
    ? data.map((coupon) => {
      const code = couponCode(coupon);
      const relationLabel = couponView === 'sent' ? 'Enviado a' : 'Regalado por';
      const relationName = couponView === 'sent'
        ? (coupon.assignedToName || partnerName || 'Tu persona')
        : (coupon.createdByName || 'DinoCupones');
      const actionText = couponView === 'sent' ? 'Ver estado' : 'Abrir';
      return `
      <article class="coupon-card ticket-coupon ${coupon.status} reveal-item" data-id="${coupon.id}">
        <div class="ticket-main">
          <div class="ticket-ribbon">
            <span class="coupon-series">DinoCupones</span>
            <span class="status-pill ${coupon.status}">${labelStatus(coupon.status)}</span>
          </div>
          <div class="ticket-content">
            <div class="ticket-icon-wrap">
              <div class="coupon-icon">${coupon.emoji || '💜'}</div>
              <small>Vale por</small>
            </div>
            <div class="ticket-copy">
              <small class="coupon-accent">${couponAccent(coupon.status)}</small>
              <h4>${escapeHtml(coupon.title)}</h4>
              <p>${escapeHtml(coupon.activity || '')}</p>
            </div>
          </div>
          <div class="ticket-meta">
            <div>
              <small>Válido hasta</small>
              <strong>${fmtDate(coupon.expiresAt)}</strong>
            </div>
            <div class="ticket-issued">
              <small>${relationLabel}</small>
              <strong>${escapeHtml(relationName)}</strong>
            </div>
          </div>
        </div>
        <aside class="ticket-stub" aria-label="Talón del cupón">
          <span class="stub-label">ADMIT ONE</span>
          <div class="stub-heart">♥</div>
          <div class="ticket-barcode" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <code>${code}</code>
          <button class="mini-btn ticket-open-btn" data-open-coupon="${coupon.id}" data-coupon-source="${couponView}" type="button">${actionText}</button>
        </aside>
      </article>`;
    }).join('')
    : `<div class="empty-state"><strong>${couponView === 'sent' ? 'Todavía no has enviado cupones.' : 'No hay cupones aquí.'}</strong>${couponView === 'sent' ? 'Cuando regales uno podrás seguir su estado desde aquí.' : 'Cuando aparezca uno, este espacio dejará de estar tan tranquilo. 🦖'}</div>`;

  observeReveals();
  $$('[data-open-coupon]').forEach((button) => {
    button.onclick = () => openCoupon(button.dataset.openCoupon, button.dataset.couponSource || 'received');
  });
}

function openCoupon(id, source = 'received') {
  const coupon = (source === 'sent' ? sentCoupons : coupons).find((item) => item.id === id);
  if (!coupon) return;

  $('#couponDialogEmoji').textContent = coupon.emoji || '💜';
  const status = $('#couponDialogStatus');
  status.className = `status-pill ${coupon.status}`;
  status.textContent = labelStatus(coupon.status);
  $('#couponDialogTitle').textContent = coupon.title;
  $('#couponDialogActivity').textContent = coupon.activity;
  $('#couponDialogExpiry').textContent = fmtDateTime(coupon.expiresAt);
  $('#couponDialogRelation').textContent = source === 'sent'
    ? 'Enviado a ' + (coupon.assignedToName || partnerName || 'tu persona')
    : 'Regalado por ' + (coupon.createdByName || 'DinoCupones');

  const actions = $('#couponDialogActions');
  actions.innerHTML = '';
  if (source === 'received' && coupon.status === 'active') {
    actions.innerHTML = '<button class="primary-btn" type="button" data-status="pending">Empezar aventura</button>';
  }
  if (source === 'received' && coupon.status === 'pending') {
    actions.innerHTML = '<button class="primary-btn" type="button" data-status="completed">Marcar como canjeado</button>';
  }

  actions.querySelector('[data-status]')?.addEventListener('click', async (event) => {
    const nextStatus = event.target.dataset.status;
    const origin = document.querySelector(`[data-id="${coupon.id}"]`);
    await setCouponProgress(currentUser.uid, coupon.id, nextStatus);
    $('#couponDialog').close();
    coupons = await listCoupons(currentUser.uid, currentPair?.id || null);
    renderCoupons();
    renderHero();
    renderSummary();
    if (profile.role === 'admin') {
      adminCoupons = await listAllCoupons();
      renderAdminCoupons();
      renderAdminSummary();
    }
    if (nextStatus === 'completed') {
      playChime('complete');
      celebrateFrom(origin || event.target);
    } else {
      playChime('soft');
    }
    toast('Cupón actualizado 💜');
  });

  $('#couponDialog').showModal();
}

$('#openUploadBtn').onclick = () => {
  renderUploadCoupons();
  $('#uploadDialog').showModal();
};
$('#closeUploadBtn').onclick = () => $('#uploadDialog').close();

$('#uploadFile').onchange = () => {
  const file = $('#uploadFile').files[0];
  const preview = $('#uploadPreview');
  if (!file) {
    preview.textContent = 'El archivo aparecerá aquí.';
    return;
  }
  const url = URL.createObjectURL(file);
  preview.innerHTML = file.type.startsWith('video/')
    ? `<video src="${url}" controls preload="metadata"></video>`
    : `<img src="${url}" alt="Vista previa">`;
};

function renderUploadCoupons() {
  $('#uploadCoupon').innerHTML = '<option value="">Sin cupón específico</option>' + coupons
    .filter((coupon) => coupon.status !== 'expired')
    .map((coupon) => `<option value="${coupon.id}">${escapeHtml(coupon.title)}</option>`)
    .join('');
}

$('#uploadForm').onsubmit = async (event) => {
  event.preventDefault();
  const file = $('#uploadFile').files[0];
  if (!file) return;

  const submitButton = $('#uploadSubmitBtn');
  submitButton.disabled = true;
  submitButton.textContent = 'Subiendo...';
  try {
    const item = await uploadMural({
      uid: currentUser.uid,
      pairId: currentPair?.id || null,
      uploaderName: profile?.displayName || 'Dino',
      couponId: $('#uploadCoupon').value,
      caption: $('#uploadCaption').value.trim(),
      file
    });

    if (!firebaseReady) localDemoMedia.unshift(item);
    mural = await listMural(currentUser.uid, currentPair?.id || null);
    if (!firebaseReady) {
      const visibleDemoMedia = localDemoMedia.filter((entry) => entry.pairId
        ? entry.pairId === currentPair?.id
        : !currentPair && entry.userId === currentUser.uid);
      mural.unshift(...visibleDemoMedia);
    }
    renderMural();
    if (profile.role === 'admin') {
      adminMural = await listAllMural();
      renderAdminMedia();
      renderAdminSummary();
    }
    $('#uploadForm').reset();
    $('#uploadPreview').textContent = 'El archivo aparecerá aquí.';
    $('#uploadDialog').close();
    playChime('soft');
    toast(currentPair ? 'Recuerdo guardado en su DinoMural 💜' : 'Recuerdo privado guardado.');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo subir el recuerdo.');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Guardar recuerdo';
  }
};

function renderMural() {
  const grid = $('#muralGrid');
  $('#muralScopeLabel').textContent = currentPair && partnerName
    ? 'Un espacio privado de ' + (profile?.displayName || 'Tú') + ' y ' + partnerName + '.'
    : 'Tus recuerdos privados hasta que conectes un DinoDúo.';

  grid.innerHTML = mural.length
    ? mural.map((item, index) => {
      const owner = item.uploaderName || (item.userId === currentUser?.uid ? (profile?.displayName || 'Tú') : partnerName || 'DinoDúo');
      return `
      <article class="mural-card frame-${index % 4} reveal-item" data-mural-id="${item.id}" tabindex="0" role="button" aria-label="Abrir recuerdo">
        <div class="mural-frame-tape tape-left"></div>
        <div class="mural-frame-tape tape-right"></div>
        <div class="mural-media-shell">
          ${item.type === 'video'
            ? `<video class="mural-media" src="${item.mediaUrl || item.localUrl}" preload="metadata" muted playsinline></video><span class="mural-play-badge">▶</span>`
            : `<img class="mural-media" src="${item.mediaUrl || item.localUrl}" alt="Recuerdo del DinoMural" loading="lazy" decoding="async">`}
        </div>
        <div class="mural-copy">
          <p>${escapeHtml(item.caption || 'Un recuerdo sin título, pero con historia.')}</p>
          <small>${escapeHtml(owner)} · ${timeAgo(item.createdAt || new Date())}</small>
        </div>
        ${item.userId === currentUser?.uid || profile?.role === 'admin'
          ? `<button class="mural-delete-btn" data-delete-mural="${item.id}" type="button" aria-label="Eliminar recuerdo" title="Eliminar recuerdo">🗑</button>`
          : ''}
      </article>`;
    }).join('')
    : `<div class="empty-state"><strong>El mural todavía está vacío.</strong>${currentPair ? 'La primera foto de ustedes puede empezar esta historia.' : 'Puedes guardar recuerdos privados mientras conectas tu DinoDúo.'}</div>`;

  renderMuralWidget();
  observeReveals();
  document.querySelectorAll('[data-mural-id]').forEach((card) => {
    const open = () => openMuralViewer(card.dataset.muralId);
    card.onclick = (event) => {
      if (event.target.closest('button,a')) return;
      open();
    };
    card.onkeydown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    };
  });


  document.querySelectorAll('[data-delete-mural]').forEach((button) => {
    button.onclick = async (event) => {
      event.stopPropagation();
      const id = button.dataset.deleteMural;
      const item = mural.find((entry) => entry.id === id) || adminMural.find((entry) => entry.id === id);
      if (!item) return;
      if (!safeConfirm('¿Eliminar este recuerdo definitivamente?')) return;

      setButtonBusy(button, true, '…');
      try {
        if (!firebaseReady && item.localUrl) {
          const idx = localDemoMedia.findIndex((entry) => entry.id === id);
          if (idx >= 0) localDemoMedia.splice(idx, 1);
        } else {
          await deleteMural(id);
        }

        mural = mural.filter((entry) => entry.id !== id);
        adminMural = adminMural.filter((entry) => entry.id !== id);
        renderMural();
        if (profile?.role === 'admin') {
          renderAdminMedia();
          renderAdminSummary();
        }
        toast('Recuerdo eliminado.');
      } catch (error) {
        console.error(error);
        toast(error?.message || 'No se pudo eliminar el recuerdo.');
      } finally {
        setButtonBusy(button, false);
      }
    };
  });
}

function clearMuralWidgetTimer() {
  if (muralWidgetTimer) {
    window.clearInterval(muralWidgetTimer);
    muralWidgetTimer = null;
  }
}

function setMuralWidgetFrame(items, index) {
  if (!items.length) return;
  const item = items[index % items.length];
  muralWidgetIndex = index % items.length;
  muralWidgetCurrentId = item.id;

  $('#muralWidgetImage').src = item.mediaUrl || item.localUrl;
  $('#muralWidgetCaption').textContent = item.caption || 'Un recuerdo de nuestro DinoMural';
  $('#muralWidgetMeta').textContent =
    (item.uploaderName || (item.userId === currentUser?.uid ? (profile?.displayName || 'Tú') : partnerName || 'DinoDúo'))
    + ' · ' + timeAgo(item.createdAt || new Date());

  $('#muralWidgetDots').innerHTML = items
    .slice(0, 6)
    .map((_, dotIndex) => `<i class="${dotIndex === muralWidgetIndex ? 'is-active' : ''}"></i>`)
    .join('');
}

function renderMuralWidget() {
  const widget = $('#muralWidget');
  if (!widget) return;

  clearMuralWidgetTimer();

  const photos = mural.filter((item) =>
    item.type !== 'video' && Boolean(item.mediaUrl || item.localUrl)
  );

  if (!photos.length) {
    widget.hidden = true;
    muralWidgetCurrentId = null;
    return;
  }

  widget.hidden = false;
  muralWidgetIndex = Math.min(muralWidgetIndex, Math.max(photos.length - 1, 0));
  setMuralWidgetFrame(photos, muralWidgetIndex);

  if (photos.length > 1) {
    muralWidgetTimer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setMuralWidgetFrame(photos, muralWidgetIndex + 1);
    }, 5200);
  }
}

$('#muralWidgetOpenBtn').onclick = () => {
  const id = muralWidgetCurrentId;
  activateMainTab('mural', { sync: false });
  if (id) window.setTimeout(() => openMuralViewer(id), 120);
};

function openMuralViewer(id) {
  const item = mural.find((entry) => entry.id === id);
  if (!item) return;
  const url = item.mediaUrl || item.localUrl;
  $('#muralViewerMedia').innerHTML = item.type === 'video'
    ? `<video src="${url}" controls autoplay playsinline></video>`
    : `<img src="${url}" alt="Recuerdo ampliado">`;
  $('#muralViewerOwner').textContent = item.uploaderName || (item.userId === currentUser.uid ? (profile?.displayName || 'Tú') : partnerName || 'DinoDúo');
  $('#muralViewerCaption').textContent = item.caption || 'Un recuerdo de nosotros';
  $('#muralViewerMeta').textContent = fmtDateTime(item.createdAt || new Date());
  $('#muralViewerDialog').showModal();
}

$('#closeMuralViewerBtn').onclick = () => {
  $('#muralViewerMedia').innerHTML = '';
  $('#muralViewerDialog').close();
};

function renderNotificationPermissionState() {
  const button = $('#enableNotificationsBtn');
  const label = $('#notificationPermissionText');
  const status = $('#pushSubscriptionStatus');
  if (!button || !label) return;

  if (!firebaseReady) {
    button.disabled = true;
    button.textContent = 'Demo';
    label.textContent = 'Se activará cuando conectemos Firebase.';
    if (status) status.textContent = 'Sin conexión real.';
    return;
  }
  if (!pushReady) {
    button.disabled = true;
    button.textContent = 'Pendiente';
    label.textContent = 'Falta completar la configuración de OneSignal y Cloudflare.';
    if (status) status.textContent = 'OneSignal no está listo.';
    return;
  }
  if (isIosDevice() && !isStandaloneApp()) {
    button.disabled = false;
    button.textContent = 'Instalar primero';
    label.textContent = 'En iPhone/iPad, instala DinoCupones en la pantalla de inicio antes de activar notificaciones.';
    if (status) status.textContent = 'Web Push en iPhone requiere la PWA instalada.';
    return;
  }
  if (!('Notification' in window)) {
    button.disabled = true;
    button.textContent = 'No disponible';
    label.textContent = 'Este navegador no admite notificaciones web.';
    if (status) status.textContent = 'Push no soportado en este dispositivo.';
    return;
  }
  if (Notification.permission === 'denied') {
    button.disabled = true;
    button.textContent = 'Bloqueadas';
    label.textContent = 'Debes habilitarlas desde los permisos del navegador o del sistema.';
    if (status) status.textContent = 'Permiso del sistema: bloqueado.';
    return;
  }

  if (Notification.permission === 'granted') {
    button.disabled = false;
    button.textContent = 'Verificando…';
    label.textContent = 'Permiso concedido. Comprobando la suscripción real de OneSignal…';
    if (status) status.textContent = 'Consultando suscripción…';
    refreshPushSubscriptionState();
    return;
  }

  button.disabled = false;
  button.textContent = 'Activar';
  label.textContent = 'Actívalas para recibir nuevos cupones y mensajes aunque DinoCupones esté cerrada.';
  if (status) status.textContent = 'Este dispositivo todavía no está suscrito.';
}

let pushStatusCheck = null;
async function refreshPushSubscriptionState() {
  const button = $('#enableNotificationsBtn');
  const label = $('#notificationPermissionText');
  const status = $('#pushSubscriptionStatus');
  if (!currentUser?.uid || !pushReady || !button || !label || !status) return;
  if (pushStatusCheck) return pushStatusCheck;

  pushStatusCheck = (async () => {
    try {
      const state = await getPushStatus(currentUser.uid);
      if (state.ok) {
        button.disabled = true;
        button.textContent = 'Suscrito';
        label.textContent = 'Este dispositivo recibirá mensajes y DinoCupones aunque la app esté cerrada.';
        const shortId = state.subscriptionId
          ? state.subscriptionId.slice(0, 8) + '…' + state.subscriptionId.slice(-6)
          : 'registrada';
        status.textContent = 'OneSignal: suscripción activa · ' + shortId;
        status.classList.add('is-ok');
        status.classList.remove('is-warning');
      } else if (state.permission === 'granted') {
        button.disabled = false;
        button.textContent = 'Reparar';
        label.textContent = 'El permiso está concedido, pero falta completar la suscripción OneSignal.';
        status.textContent = 'OneSignal: dispositivo todavía no suscrito.';
        status.classList.add('is-warning');
        status.classList.remove('is-ok');
      }
    } catch (error) {
      console.warn('No se pudo comprobar la suscripción push.', error);
      button.disabled = false;
      button.textContent = Notification.permission === 'granted' ? 'Reparar' : 'Activar';
      status.textContent = 'No se pudo verificar OneSignal. Toca Reparar.';
      status.classList.add('is-warning');
      status.classList.remove('is-ok');
    } finally {
      pushStatusCheck = null;
    }
  })();

  return pushStatusCheck;
}

$('#enableNotificationsBtn').onclick = async () => {
  if (isIosDevice() && !isStandaloneApp()) {
    openInstallDialog();
    return;
  }
  try {
    const enabled = await requestPushPermission(currentUser.uid);
    renderNotificationPermissionState();
    await refreshPushSubscriptionState();
    toast(enabled
      ? 'Dispositivo suscrito a notificaciones 💜'
      : 'El permiso puede estar activo, pero OneSignal todavía no terminó la suscripción. Pulsa Reparar.');
  } catch (error) {
    console.error(error);
    toast('No se pudieron activar las notificaciones.');
  }
};

$('#testPushBtn').onclick = async () => {
  const button = $('#testPushBtn');
  const resultBox = $('#pushTestResult');
  if (!currentUser?.uid) return toast('Primero inicia sesión.');

  setButtonBusy(button,true,'Probando...');
  resultBox.classList.remove('is-ok','is-error','is-warning');
  resultBox.textContent = 'Comprobando suscripción y enviando prueba…';

  try {
    const result = await sendPushTest(currentUser.uid);

    if (result?.ok) {
      resultBox.classList.add('is-ok');
      resultBox.textContent =
        'OneSignal aceptó la notificación · destinatarios: ' +
        result.recipients +
        (result.notificationId ? ' · ID ' + result.notificationId : '');
      toast('Notificación de prueba enviada. Revisa este dispositivo.');
      return;
    }

    if (result?.reason === 'DEVICE_NOT_SUBSCRIBED') {
      resultBox.classList.add('is-warning');
      resultBox.textContent = 'Este dispositivo todavía no está suscrito en OneSignal. Pulsa Activar/Reparar primero.';
      toast('El dispositivo todavía no está suscrito.');
      return;
    }

    if (result?.reason === 'NO_SUBSCRIBED_DEVICE') {
      resultBox.classList.add('is-error');
      resultBox.textContent = 'El Worker llegó a OneSignal, pero OneSignal encontró 0 dispositivos suscritos para este usuario.';
      toast('OneSignal encontró 0 dispositivos suscritos.');
      return;
    }

    resultBox.classList.add('is-error');
    resultBox.textContent = 'La prueba no pudo confirmar la entrega push.';
    toast('La prueba push no pudo completarse.');
  } catch (error) {
    console.error(error);
    resultBox.classList.add('is-error');
    const detail = error?.details?.errors || error?.details?.error || error?.message || 'Error desconocido';
    resultBox.textContent = 'Error: ' + (typeof detail === 'string' ? detail : JSON.stringify(detail));
    toast('La prueba push devolvió un error.');
  } finally {
    setButtonBusy(button,false);
  }
};

$('#notificationBtn').onclick = () => toggleDrawer(true);
$('#closeNotificationsBtn').onclick = () => toggleDrawer(false);
$('#drawerBackdrop').onclick = () => toggleDrawer(false);
function toggleDrawer(open) {
  $('#notificationDrawer').classList.toggle('is-open', open);
  $('#drawerBackdrop').classList.toggle('is-open', open);
  $('#notificationDrawer').setAttribute('aria-hidden', String(!open));
  if (open && currentUser?.uid) {
    renderNotificationPermissionState();
    refreshPushSubscriptionState();
  }
}

function renderMessages() {
  const unread = messages.filter((message) => !message.read).length;
  $('#notificationBadge').hidden = !unread;
  $('#notificationBadge').textContent = unread;

  $('#notificationList').innerHTML = messages.length
    ? messages.map((message) => `
      <button class="notification-item ${message.read ? '' : 'unread'}" data-message-id="${message.id}" type="button">
        <strong>${escapeHtml(message.title)}</strong>
        <p>${escapeHtml(message.body)}</p>
        <small>${timeAgo(message.createdAt || new Date())}</small>
      </button>`).join('')
    : `<div class="empty-state"><strong>Sin mensajes.</strong>Cuando llegue uno aparecerá aquí.</div>`;

  $$('[data-message-id]').forEach((button) => {
    button.onclick = async () => {
      await markMessageRead(button.dataset.messageId);
      const message = messages.find((item) => item.id === button.dataset.messageId);
      if (message) message.read = true;
      renderMessages();
    };
  });
}

onForegroundMessage((payload) => {
  const notification = payload.notification || {};
  toast(notification.title ? `${notification.title}: ${notification.body || ''}` : 'Llegó una nueva notificación.');
  refreshAll();
});

$('#couponForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitter = submitButton(event);
  setButtonBusy(submitter, true);
  try {
    const recipientUid = $('#couponRecipient').value;
    const recipient = users.find((user) => user.uid === recipientUid);
    if (!recipientUid) throw new Error('Selecciona un destinatario.');

    const created = await createCoupon({
      pairId: currentPair?.memberUids?.includes(recipientUid) ? currentPair.id : null,
      createdByUid: currentUser.uid,
      createdByName: profile?.displayName || 'Administrador',
      assignedToUid: recipientUid,
      assignedToName: recipient?.displayName || recipient?.email || 'Destinatario',
      title: $('#couponTitle').value.trim(),
      activity: $('#couponActivity').value.trim(),
      expiresAt: new Date($('#couponExpiry').value)
    });
    event.target.reset();
    await refreshAll();
    toast(created?.push?.ok === false
      ? 'Cupón guardado, pero la notificación push no pudo confirmarse.'
      : 'Cupón enviado al destinatario con notificación.');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo publicar el cupón.');
  } finally {
    setButtonBusy(submitter, false);
  }
};

$('#messageForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitter = submitButton(event);
  setButtonBusy(submitter, true);
  try {
    const targetUid = $('#messageRecipient').value;
    const sent = await sendMessage({
      pairId: currentPair?.memberUids?.includes(targetUid) ? currentPair.id : null,
      senderUid: currentUser.uid,
      senderName: profile?.displayName || 'Administrador',
      targetUid,
      title: $('#messageTitle').value.trim(),
      body: $('#messageBody').value.trim()
    });
    event.target.reset();
    messages = await listMessages(currentUser.uid);
    renderMessages();
    playChime('soft');
    toast(sent?.push?.ok === false
      ? 'Mensaje guardado, pero la notificación push no pudo confirmarse.'
      : 'Mensaje enviado con notificación.');
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el mensaje.');
  } finally {
    setButtonBusy(submitter, false);
  }
};

function renderRecipients() {
  const byUid = new Map(
    users
      .filter((user) => user?.uid && user.uid !== currentUser.uid)
      .map((user) => [user.uid, user])
  );

  // Si la consulta administrativa tarda o algún documento todavía no aparece,
  // el DinoDúo activo sigue siendo un destinatario válido.
  if (partnerUid && !byUid.has(partnerUid)) {
    byUid.set(partnerUid, {
      uid: partnerUid,
      displayName: partnerName || 'Tu persona favorita',
      email: ''
    });
  }

  const available = [...byUid.values()].sort((a,b) =>
    String(a.displayName || a.email || '').localeCompare(String(b.displayName || b.email || ''), 'es')
  );

  const optionLabel = (user) => {
    const name = user.displayName || 'Usuario';
    return user.email ? name + ' — ' + user.email : name;
  };

  const couponSelect = $('#couponRecipient');
  const messageSelect = $('#messageRecipient');
  const couponHint = $('#couponRecipientHint');
  const messageHint = $('#messageRecipientHint');

  if (!available.length) {
    couponSelect.innerHTML = '<option value="" selected disabled>No hay otros usuarios disponibles</option>';
    messageSelect.innerHTML = '<option value="" selected disabled>No hay otros usuarios disponibles</option>';
    couponSelect.disabled = true;
    messageSelect.disabled = true;
    couponHint.textContent = 'Crea o vincula otra cuenta para poder seleccionar un destinatario.';
    messageHint.textContent = 'Crea o vincula otra cuenta para poder seleccionar un destinatario.';
    return;
  }

  couponSelect.disabled = false;
  messageSelect.disabled = false;

  couponSelect.innerHTML =
    '<option value="" disabled>Selecciona una persona</option>' +
    available.map((user) =>
      `<option value="${escapeHtml(user.uid)}">${escapeHtml(optionLabel(user))}</option>`
    ).join('');

  messageSelect.innerHTML =
    '<option value="all">Todos los usuarios</option>' +
    available.map((user) =>
      `<option value="${escapeHtml(user.uid)}">${escapeHtml(optionLabel(user))}</option>`
    ).join('');

  if (partnerUid && byUid.has(partnerUid)) {
    couponSelect.value = partnerUid;
    messageSelect.value = partnerUid;
    couponHint.textContent = 'Tu DinoDúo activo está seleccionado: ' + (partnerName || 'tu persona') + '.';
    messageHint.textContent = 'Tu DinoDúo activo está seleccionado: ' + (partnerName || 'tu persona') + '.';
  } else {
    couponSelect.selectedIndex = 0;
    messageSelect.value = 'all';
    couponHint.textContent = available.length + (available.length === 1 ? ' persona disponible.' : ' personas disponibles.');
    messageHint.textContent = 'Puedes elegir una persona o enviar a todos.';
  }
}

function renderAdminUsers() {
  $('#adminUsersList').innerHTML = users.map((user) => `
    <div class="admin-row">
      <div>
        <strong>${escapeHtml(user.displayName || 'Sin nombre')}</strong>
        <small>${escapeHtml(user.email || user.uid)} · ${user.role || 'user'}</small>
      </div>
      <button class="mini-btn" data-reset-email="${escapeHtml(user.email || '')}" type="button">Enviar enlace</button>
    </div>`).join('');

  $$('[data-reset-email]').forEach((button) => {
    button.onclick = async () => {
      if (!button.dataset.resetEmail) return toast('Este usuario no tiene correo registrado.');
      try {
        await resetPassword(button.dataset.resetEmail);
        toast('Enlace de restablecimiento enviado.');
      } catch (error) {
        console.error(error);
        toast('No se pudo enviar el enlace.');
      }
    };
  });
}

function renderAdminMedia() {
  $('#adminMediaList').innerHTML = adminMural.length
    ? adminMural.map((item) => `
      <div class="admin-row">
        <div>
          <strong>${escapeHtml(item.fileName || 'Recuerdo')}</strong>
          <small>${item.type || 'archivo'} · ${timeAgo(item.createdAt || new Date())}</small>
        </div>
        <div class="admin-actions-inline">
          ${item.mediaUrl
            ? `<a class="mini-btn" href="${item.mediaUrl}" target="_blank" rel="noopener">Descargar</a>`
            : '<span class="mini-btn">Demo</span>'}
          <button class="mini-btn danger-mini" data-admin-delete-mural="${item.id}" type="button">Eliminar</button>
        </div>
      </div>`).join('')
    : '<div class="empty-state"><strong>Sin archivos.</strong></div>';

  document.querySelectorAll('[data-admin-delete-mural]').forEach((button) => {
    button.onclick = async () => {
      const id = button.dataset.adminDeleteMural;
      if (!safeConfirm('¿Eliminar este recuerdo y su archivo original?')) return;
      setButtonBusy(button, true, '…');
      try {
        await deleteMural(id);
        adminMural = adminMural.filter((entry) => entry.id !== id);
        mural = mural.filter((entry) => entry.id !== id);
        renderAdminMedia();
        renderMural();
        renderAdminSummary();
        toast('Recuerdo eliminado.');
      } catch (error) {
        console.error(error);
        toast(error?.message || 'No se pudo eliminar el recuerdo.');
      } finally {
        setButtonBusy(button, false);
      }
    };
  });
}

function renderAdminCoupons() {
  $('#adminCouponsList').innerHTML = adminCoupons.length
    ? adminCoupons.map((coupon) => `
      <div class="admin-row admin-row-stack">
        <div>
          <strong>${escapeHtml(coupon.title)}</strong>
          <small>${labelStatus(coupon.status)} · para ${escapeHtml(coupon.assignedToName || 'destinatario')} · vence ${fmtDate(coupon.expiresAt)}</small>
        </div>
        <div class="admin-actions-inline">
          <button class="mini-btn" data-reset-coupon="${coupon.id}" type="button">Restablecer</button>
          <button class="mini-btn danger" data-delete-coupon="${coupon.id}" type="button">Eliminar</button>
        </div>
      </div>`).join('')
    : '<div class="empty-state"><strong>Sin cupones creados.</strong></div>';

  $$('[data-reset-coupon]').forEach((button) => {
    button.onclick = async () => {
      try {
        await resetCoupon(button.dataset.resetCoupon);
        await refreshAll();
        playChime('soft');
        toast('Cupón restablecido.');
      } catch (error) {
        console.error(error);
        toast('No se pudo restablecer el cupón.');
      }
    };
  });

  $$('[data-delete-coupon]').forEach((button) => {
    button.onclick = async () => {
      if (!safeConfirm('¿Deseas eliminar este cupón?')) return;
      try {
        await deleteCoupon(button.dataset.deleteCoupon);
        await refreshAll();
        toast('Cupón eliminado.');
      } catch (error) {
        console.error(error);
        toast('No se pudo eliminar el cupón.');
      }
    };
  });
}

if (!firebaseReady) {
  console.info('DinoCupones está ejecutándose en modo demo. Configura js/firebase-config.js para conectar Firebase.');
}


let lastVisibilityRefresh = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !currentUser || !$('#appScreen')?.classList.contains('is-visible')) return;
  if (Date.now() - lastVisibilityRefresh < 30000) return;
  lastVisibilityRefresh = Date.now();
  refreshAll().catch((error) => console.warn('No se pudo actualizar al volver a la app', error));
});
