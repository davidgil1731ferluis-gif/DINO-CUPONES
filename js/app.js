import {
  firebaseReady,
  onAuth,
  login,
  logout,
  resetPassword,
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
  listMessages,
  listPairMessages,
  sendMessage,
  markMessageRead,
  listUsers,
  requestPushPermission,
  onForegroundMessage
} from './firebase-service.js';

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
let filter = 'active';
let couponView = 'received';
let localDemoMedia = [];
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
    $$$('.reveal-item').forEach(el=>el.classList.add('is-revealed'));
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
  $$$('.reveal-item:not(.is-revealed)').forEach(el=>observer.observe(el));
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

setupPngIntro();

$('#skipIntroBtn').onclick = () => {
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
$('#openLetterBtn').onclick = () => { playChime('soft'); showScreen('#letterScreen'); };
$('#continueToLoginBtn').onclick = () => { playChime('soft'); showScreen('#authScreen'); };
$('#soundToggleBtn').onclick = () => {
  soundEnabled = !soundEnabled;
  $('#soundToggleBtn').setAttribute('aria-pressed', String(soundEnabled));
  $('#soundToggleBtn').setAttribute('aria-label', soundEnabled ? 'Desactivar sonidos' : 'Activar sonidos');
  toast(soundEnabled ? 'Sonidos suaves activados ♪' : 'Sonidos desactivados');
  if (soundEnabled) playChime('soft');
};

$('#togglePasswordBtn').onclick = () => {
  const input = $('#loginPassword');
  input.type = input.type === 'password' ? 'text' : 'password';
};

$('#forgotPasswordBtn').onclick = async () => {
  const email = $('#loginEmail').value.trim();
  if (!email) return toast('Escribe primero tu correo.');
  try {
    await resetPassword(email);
    toast('Se envió el enlace de restablecimiento.');
  } catch (error) {
    console.error(error);
    toast('No fue posible enviar el enlace.');
  }
};

$('#loginForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    await login($('#loginEmail').value.trim(), $('#loginPassword').value);
    if (!firebaseReady) {
      await enterApp({ uid: 'demo-user', email: $('#loginEmail').value.trim() || 'demo@dinocupones.app' });
      toast('Modo demo: conecta Firebase para usar datos reales.');
    }
  } catch (error) {
    console.error(error);
    toast(humanAuthError(error));
  } finally {
    submitter.disabled = false;
  }
};

$('#logoutBtn').onclick = async () => {
  await logout();
  currentUser = null;
  profile = null;
  showScreen('#authScreen');
};

function humanAuthError(error) {
  const code = error?.code || '';
  if (code.includes('invalid-credential')) return 'Usuario o contraseña incorrectos.';
  if (code.includes('too-many-requests')) return 'Demasiados intentos. Intenta más tarde.';
  return 'No se pudo iniciar sesión.';
}

onAuth(async (user) => {
  if (firebaseReady && user) {
    await enterApp(user);
  } else if (firebaseReady && !user && !$('#introScreen').classList.contains('is-visible')) {
    showScreen('#authScreen');
  }
});

async function enterApp(user) {
  currentUser = user;
  profile = await getProfile(user.uid);
  $('#userName').textContent = profile.displayName || 'Dino';
  $('#userRole').textContent = profile.role === 'admin' ? 'Administrador' : 'Invitado especial';
  $('#userAvatar').textContent = (profile.displayName || 'D')[0].toUpperCase();
  $('#adminTabBtn').hidden = profile.role !== 'admin';
  showScreen('#appScreen');
  await refreshAll();

  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./firebase-messaging-sw.js');
      renderNotificationPermissionState();
    } catch (error) {
      console.warn(error);
    }
  }
}

async function refreshAll() {
  currentPair = await getPairForUser(currentUser.uid);
  partnerUid = currentPair?.memberUids?.find((uid) => uid !== currentUser.uid) || null;
  partnerName = partnerUid
    ? (currentPair?.memberNames?.[partnerUid] || 'Tu persona favorita')
    : '';

  [coupons, mural, messages, sentCoupons, pairMessages] = await Promise.all([
    listCoupons(currentUser.uid, currentPair?.id || null),
    listMural(currentUser.uid, currentPair?.id || null),
    listMessages(currentUser.uid, currentPair?.id || null),
    currentPair ? listSentCoupons(currentUser.uid, currentPair.id) : Promise.resolve([]),
    currentPair ? listPairMessages(currentPair.id) : Promise.resolve([])
  ]);

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
    [users, adminCoupons, adminMural] = await Promise.all([listUsers(), listAllCoupons(), listAllMural()]);
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


function renderPairWorkspace() {
  const setup = $('#pairSetupView');
  const connected = $('#pairConnectedView');
  if (!setup || !connected) return;

  const hasPair = Boolean(currentPair && partnerUid);
  setup.hidden = hasPair;
  connected.hidden = !hasPair;

  if (!hasPair) return;

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
    toast(error?.message || 'No se pudo generar el código.');
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
  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    await acceptPairInvite({
      uid: currentUser.uid,
      displayName: profile?.displayName || 'Dino',
      code: $('#pairCodeInput').value
    });
    event.target.reset();
    await refreshAll();
    playChime('complete');
    toast('DinoDúo conectado 💞');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo completar el vínculo.');
  } finally {
    submitter.disabled = false;
  }
};

$('#pairCouponForm').onsubmit = async (event) => {
  event.preventDefault();
  if (!currentPair || !partnerUid) return toast('Primero vincula las dos cuentas.');

  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    await createCoupon({
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
    toast('DinoCupón enviado a ' + partnerName + ' 🎟️');
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el cupón.');
  } finally {
    submitter.disabled = false;
  }
};

$('#unlinkPairBtn').onclick = async () => {
  if (!currentPair) return toast('No hay un DinoDúo activo.');

  const partner = partnerName || 'tu persona';
  const confirmed = safeConfirm(
    '¿Deseas desvincularte de ' + partner + '?\n\n' +
    'El DinoDúo actual se cerrará. Los cupones, mensajes y recuerdos compartidos quedarán archivados y no se mezclarán con un vínculo nuevo.'
  );
  if (!confirmed) return;

  const button = $('#unlinkPairBtn');
  button.disabled = true;
  button.textContent = 'Desvinculando...';
  try {
    await unlinkPair({ pairId: currentPair.id, uid: currentUser.uid });
    currentPair = null;
    partnerUid = null;
    partnerName = '';
    pairMessages = [];
    sentCoupons = [];
    couponView = 'received';
    $$('[data-coupon-view]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.couponView === 'received');
    });
    await refreshAll();
    playChime('soft');
    toast('DinoDúo cerrado. Tu cuenta ya puede vincularse de nuevo.');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo cerrar el DinoDúo.');
  } finally {
    button.disabled = false;
    button.textContent = 'Desvincular DinoDúo';
  }
};

$('#pairMessageForm').onsubmit = async (event) => {
  event.preventDefault();
  if (!currentPair || !partnerUid) return toast('Primero vincula las dos cuentas.');

  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    await sendMessage({
      pairId: currentPair.id,
      senderUid: currentUser.uid,
      senderName: profile?.displayName || 'Dino',
      targetUid: partnerUid,
      title: $('#pairMessageTitle').value.trim() || 'Un mensaje para ti 💜',
      body: $('#pairMessageBody').value.trim()
    });
    event.target.reset();
    pairMessages = await listPairMessages(currentPair.id);
    renderPairConversation();
    playChime('soft');
    toast('Mensaje enviado a ' + partnerName + '.');
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el mensaje.');
  } finally {
    submitter.disabled = false;
  }
};

$$('.tab-btn').forEach((button) => {
  button.onclick = () => {
    const tab = button.dataset.tab;
    $$$('.tab-btn').forEach((item) => item.classList.toggle('is-active', item === button));
    $$$('.tab-panel').forEach((panel) => panel.classList.remove('is-active'));
    $(`#${tab}Tab`).classList.add('is-active');
  };
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
    $$$('.chip').forEach((item) => item.classList.toggle('is-active', item === button));
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
  $$$('[data-open-coupon]').forEach((button) => {
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
    toast('No se pudo subir el recuerdo.');
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
      </article>`;
    }).join('')
    : `<div class="empty-state"><strong>El mural todavía está vacío.</strong>${currentPair ? 'La primera foto de ustedes puede empezar esta historia.' : 'Puedes guardar recuerdos privados mientras conectas tu DinoDúo.'}</div>`;

  observeReveals();
  $$$('[data-mural-id]').forEach((card) => {
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
}

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
  if (!button || !label) return;

  if (!firebaseReady) {
    button.disabled = true;
    button.textContent = 'Demo';
    label.textContent = 'Se activará cuando conectemos Firebase.';
    return;
  }
  if (!('Notification' in window)) {
    button.disabled = true;
    button.textContent = 'No disponible';
    label.textContent = 'Este navegador no admite notificaciones web.';
    return;
  }
  if (Notification.permission === 'granted') {
    button.disabled = true;
    button.textContent = 'Activas';
    label.textContent = 'Recibirás nuevos cupones y mensajes.';
    return;
  }
  if (Notification.permission === 'denied') {
    button.disabled = true;
    button.textContent = 'Bloqueadas';
    label.textContent = 'Debes habilitarlas desde los permisos del navegador.';
    return;
  }
  button.disabled = false;
  button.textContent = 'Activar';
  label.textContent = 'Actívalas para recibir nuevos cupones y mensajes.';
}

$('#enableNotificationsBtn').onclick = async () => {
  try {
    const enabled = await requestPushPermission(currentUser.uid);
    renderNotificationPermissionState();
    toast(enabled ? 'Notificaciones activadas 💜' : 'No se activaron las notificaciones.');
  } catch (error) {
    console.error(error);
    toast('No se pudieron activar las notificaciones.');
  }
};

$('#notificationBtn').onclick = () => toggleDrawer(true);
$('#closeNotificationsBtn').onclick = () => toggleDrawer(false);
$('#drawerBackdrop').onclick = () => toggleDrawer(false);
function toggleDrawer(open) {
  $('#notificationDrawer').classList.toggle('is-open', open);
  $('#drawerBackdrop').classList.toggle('is-open', open);
  $('#notificationDrawer').setAttribute('aria-hidden', String(!open));
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

  $$$('[data-message-id]').forEach((button) => {
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
  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    const recipientUid = $('#couponRecipient').value;
    const recipient = users.find((user) => user.uid === recipientUid);
    if (!recipientUid) throw new Error('Selecciona un destinatario.');

    await createCoupon({
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
    toast('Cupón enviado al destinatario.');
  } catch (error) {
    console.error(error);
    toast(error?.message || 'No se pudo publicar el cupón.');
  } finally {
    submitter.disabled = false;
  }
};

$('#messageForm').onsubmit = async (event) => {
  event.preventDefault();
  const submitter = event.submitter;
  submitter.disabled = true;
  try {
    const targetUid = $('#messageRecipient').value;
    await sendMessage({
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
    toast('Mensaje enviado.');
  } catch (error) {
    console.error(error);
    toast('No se pudo enviar el mensaje.');
  } finally {
    submitter.disabled = false;
  }
};

function renderRecipients() {
  const available = users.filter((user) => user.uid !== currentUser.uid);
  $('#messageRecipient').innerHTML = '<option value="all">Todos</option>' + available
    .map((user) => `<option value="${user.uid}">${escapeHtml(user.displayName || user.email || user.uid)}</option>`)
    .join('');

  $('#couponRecipient').innerHTML = '<option value="">Selecciona una persona</option>' + available
    .map((user) => `<option value="${user.uid}">${escapeHtml(user.displayName || user.email || user.uid)}</option>`)
    .join('');
}

function renderAdminUsers() {
  $('#adminUsersList').innerHTML = users.map((user) => `
    <div class="admin-row">
      <div>
        <strong>${escapeHtml(user.displayName || 'Sin nombre')}</strong>
        <small>${escapeHtml(user.email || user.uid)} · ${user.role || 'user'}</small>
      </div>
      <button class="mini-btn" data-reset-email="${escapeHtml(user.email || '')}" type="button">Restablecer</button>
    </div>`).join('');

  $$$('[data-reset-email]').forEach((button) => {
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
        ${item.mediaUrl
          ? `<a class="mini-btn" href="${item.mediaUrl}" target="_blank" rel="noopener">Descargar</a>`
          : '<span class="mini-btn">Demo</span>'}
      </div>`).join('')
    : '<div class="empty-state"><strong>Sin archivos.</strong></div>';
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

  $$$('[data-reset-coupon]').forEach((button) => {
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

  $$$('[data-delete-coupon]').forEach((button) => {
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
