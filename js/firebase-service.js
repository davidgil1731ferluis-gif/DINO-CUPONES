import { firebaseConfig } from './firebase-config.js';
import {
  integrationsConfig,
  cloudinaryReady,
  oneSignalReady,
  workerReady
} from './integrations-config.js?v=20260924-1';

const V = '12.19.0';
const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('TU_');

let appMod = null;
let authMod = null;
let fsMod = null;
let app = null;
let auth = null;
let db = null;
let firebaseInitPromise = null;
let oneSignalPromise = null;
const SESSION_PREF_KEY = 'dinocupones_keep_session_v1';

function keepSessionPreferred() {
  try {
    return localStorage.getItem(SESSION_PREF_KEY) === 'true';
  } catch {
    return false;
  }
}

async function applyAuthPersistence(keepSession) {
  if (!auth || !authMod) return;
  await authMod.setPersistence(
    auth,
    keepSession ? authMod.browserLocalPersistence : authMod.browserSessionPersistence
  );
  try {
    localStorage.setItem(SESSION_PREF_KEY, keepSession ? 'true' : 'false');
  } catch {}
}

export function getKeepSessionPreference() {
  return keepSessionPreferred();
}

async function ensureFirebase() {
  if (!configured) return false;
  if (app && auth && db && appMod && authMod && fsMod) return true;
  if (firebaseInitPromise) return firebaseInitPromise;

  firebaseInitPromise = Promise.all([
    import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js')
  ]).then(async ([appSdk, authSdk, firestoreSdk]) => {
    appMod = appSdk;
    authMod = authSdk;
    fsMod = firestoreSdk;
    app = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(app);
    await applyAuthPersistence(keepSessionPreferred());
    db = fsMod.getFirestore(app);
    return true;
  }).catch((error) => {
    firebaseInitPromise = null;
    console.error('Firebase no pudo inicializarse.', error);
    throw error;
  });

  return firebaseInitPromise;
}

const demoNow = Date.now();
const demoPair = {
  id: 'pair-demo',
  memberUids: ['demo-user', 'demo-love'],
  memberNames: {
    'demo-user': 'Dino',
    'demo-love': 'Mi persona favorita'
  },
  active: true,
  createdAt: new Date(demoNow - 86400000 * 30)
};
const demoCoupons = [
  {id:'demo-1',pairId:'pair-demo',createdByUid:'demo-love',createdByName:'Mi persona favorita',assignedToUid:'demo-user',assignedToName:'Dino',title:'Cena sorpresa',activity:'Una cena escogida por quien recibe el cupón, sin mirar el reloj y con postre obligatorio.',expiresAt:new Date(demoNow+86400000*14),status:'active',emoji:'🍝',createdAt:new Date(demoNow-86400000*2)},
  {id:'demo-2',pairId:'pair-demo',createdByUid:'demo-love',createdByName:'Mi persona favorita',assignedToUid:'demo-user',assignedToName:'Dino',title:'Cita sin celular',activity:'Dos horas para hablar, caminar y dejar los teléfonos guardados.',expiresAt:new Date(demoNow+86400000*7),status:'pending',emoji:'🌙',createdAt:new Date(demoNow-86400000*4)},
  {id:'demo-3',pairId:'pair-demo',createdByUid:'demo-love',createdByName:'Mi persona favorita',assignedToUid:'demo-user',assignedToName:'Dino',title:'Tarde de película',activity:'Película favorita, cobija, crispetas y cero discusiones por quién escoge.',expiresAt:new Date(demoNow-86400000*2),status:'expired',emoji:'🎬',createdAt:new Date(demoNow-86400000*8)},
  {id:'demo-4',pairId:'pair-demo',createdByUid:'demo-love',createdByName:'Mi persona favorita',assignedToUid:'demo-user',assignedToName:'Dino',title:'Desayuno favorito',activity:'Un desayuno preparado con algo que la otra persona realmente ame.',expiresAt:new Date(demoNow+86400000*30),status:'completed',emoji:'🥞',createdAt:new Date(demoNow-86400000*12)}
];
const demoMessages = [
  {id:'msg-1',pairId:'pair-demo',senderUid:'demo-love',senderName:'Mi persona favorita',targetUid:'demo-user',title:'Para cuando abras esto 💜',body:'Hay una aventura nueva esperando por nosotros.',createdAt:new Date(demoNow-3600000),read:false}
];
const demoInvites = new Map();
const DEMO_ACCOUNTS_KEY = 'dinocupones_demo_accounts_v1';

function readDemoAccounts() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeDemoAccounts(accounts) {
  try {
    localStorage.setItem(DEMO_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch {
    // El modo demo sigue funcionando durante la sesión aunque el navegador bloquee storage.
  }
}

async function hashDemoPassword(password) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  }
  return btoa(unescape(encodeURIComponent(password)));
}

function demoAccountByUid(uid) {
  return readDemoAccounts().find(account => account.uid === uid) || null;
}

function authError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export const firebaseReady = configured;
export const mediaReady = configured && cloudinaryReady && workerReady;
export const pushReady = configured && oneSignalReady && workerReady;

async function currentIdToken() {
  if (!configured) throw new Error('Firebase no está configurado.');
  await ensureFirebase();
  if (!auth?.currentUser) throw new Error('Debes iniciar sesión.');
  return auth.currentUser.getIdToken();
}

async function workerPost(path, payload) {
  if (!workerReady) throw new Error('El servicio externo todavía no está configurado.');
  const token = await currentIdToken();
  const base = integrationsConfig.apiBaseUrl.replace(/\/$/, '');
  const response = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload || {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error || 'Error en el servicio externo.');
    error.details = data;
    throw error;
  }
  return data;
}

async function getOneSignal() {
  if (!oneSignalReady) return null;
  if (oneSignalPromise) return oneSignalPromise;

  oneSignalPromise = new Promise((resolve, reject) => {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId: integrationsConfig.oneSignal.appId,
          serviceWorkerPath: integrationsConfig.oneSignal.serviceWorkerPath,
          serviceWorkerParam: {
            scope: integrationsConfig.oneSignal.serviceWorkerScope
          },
          notifyButton: { enable: false }
        });
        resolve(OneSignal);
      } catch (error) {
        reject(error);
      }
    });
  });

  return oneSignalPromise;
}

function oneSignalPushSubscription(OneSignal) {
  return OneSignal?.User?.PushSubscription
    || OneSignal?.User?.pushSubscription
    || null;
}

async function waitForPushSubscription(OneSignal, timeoutMs = 5000) {
  const started = Date.now();
  let subscription = oneSignalPushSubscription(OneSignal);

  while (Date.now() - started < timeoutMs) {
    const id = subscription?.id || null;
    const optedIn = subscription?.optedIn === true;
    if (id && optedIn) return { subscription, id, optedIn };
    await new Promise((resolve) => setTimeout(resolve, 250));
    subscription = oneSignalPushSubscription(OneSignal);
  }

  return {
    subscription,
    id: subscription?.id || null,
    optedIn: subscription?.optedIn === true
  };
}

async function ensurePushSubscription(uid, { prompt = false } = {}) {
  if (!configured || !oneSignalReady || !uid) {
    return { ok: false, permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported', optedIn: false, subscriptionId: null };
  }

  const OneSignal = await getOneSignal();
  if (!OneSignal) {
    return { ok: false, permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported', optedIn: false, subscriptionId: null };
  }

  await OneSignal.login(uid);

  if (prompt && typeof Notification !== 'undefined' && Notification.permission === 'default') {
    await OneSignal.Notifications.requestPermission();
  }

  const subscription = oneSignalPushSubscription(OneSignal);

  if (
    typeof Notification !== 'undefined'
    && Notification.permission === 'granted'
    && subscription
    && subscription.optedIn !== true
    && typeof subscription.optIn === 'function'
  ) {
    try {
      await subscription.optIn();
    } catch (error) {
      console.warn('OneSignal no pudo activar la suscripción push.', error);
    }
  }

  const state = await waitForPushSubscription(OneSignal);
  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  return {
    ok: permission === 'granted' && state.optedIn && Boolean(state.id),
    permission,
    optedIn: state.optedIn,
    subscriptionId: state.id,
    externalId: OneSignal?.User?.externalId || uid
  };
}

export async function identifyPushUser(uid) {
  if(configured) await ensureFirebase();
  const status = await ensurePushSubscription(uid, { prompt: false });
  return status.ok;
}

export async function getPushStatus(uid) {
  if(configured) await ensureFirebase();
  if (!configured || !oneSignalReady || !uid) {
    return {
      ok: false,
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
      optedIn: false,
      subscriptionId: null,
      externalId: uid || null
    };
  }
  return ensurePushSubscription(uid, { prompt: false });
}

export async function clearPushUser() {
  if(configured) await ensureFirebase();
  if (!oneSignalReady) return;
  try {
    const OneSignal = await getOneSignal();
    await OneSignal?.logout();
  } catch (error) {
    console.warn('No se pudo cerrar la sesión de OneSignal.', error);
  }
}

async function notifyPush(payload) {
  if (!configured || !workerReady || !oneSignalReady) {
    return { ok: false, reason: 'PUSH_NOT_READY', recipients: 0 };
  }

  try {
    const result = await workerPost('/notify', payload);
    const recipients = Number.isFinite(Number(result?.recipients))
      ? Number(result.recipients)
      : null;

    if (recipients === 0) {
      console.warn('OneSignal aceptó la solicitud, pero no encontró suscripciones activas para el destinatario.', result);
      return { ok: false, reason: 'NO_SUBSCRIBED_DEVICE', recipients: 0, result };
    }

    return {
      ok: true,
      recipients,
      notificationId: result?.id || null,
      result
    };
  } catch (error) {
    console.warn('La acción se guardó, pero la notificación push no pudo enviarse.', error);
    return { ok: false, reason: 'PUSH_ERROR', recipients: 0, error };
  }
}

function asDate(value) {
  if (!value) return new Date();
  return value?.toDate?.() || new Date(value);
}
function sortNewest(items) {
  return items.sort((a,b)=>asDate(b.createdAt)-asDate(a.createdAt));
}
function normalizeCoupon(data,id) {
  const expiry = asDate(data.expiresAt);
  let status = data.status || 'active';
  if (status !== 'completed' && expiry < new Date()) status = 'expired';
  return {id,...data,expiresAt:expiry,status,createdAt:asDate(data.createdAt)};
}
function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, n => alphabet[n % alphabet.length]).join('');
}

export function onAuth(callback){
  if(!configured){setTimeout(()=>callback({uid:'demo-user',email:'demo@dinocupones.app'}),0);return()=>{};}
  let unsubscribe=()=>{};
  let cancelled=false;

  ensureFirebase()
    .then(()=>{
      if(cancelled) return;
      unsubscribe=authMod.onAuthStateChanged(auth,callback);
    })
    .catch((error)=>{
      console.error('No se pudo iniciar Firebase Authentication.',error);
      window.dispatchEvent(new CustomEvent('dinocupones:firebase-error',{detail:error}));
    });

  return ()=>{
    cancelled=true;
    unsubscribe();
  };
}
export async function login(email,password,keepSession=false){
  if(configured) {
    await ensureFirebase();
    await applyAuthPersistence(Boolean(keepSession));
  }
  if(!configured) {
    const normalizedEmail=String(email||'').trim().toLowerCase();

    if(normalizedEmail==='demo@dinocupones.app'){
      return {user:{uid:'demo-user',email:normalizedEmail}};
    }

    const account=readDemoAccounts().find(item=>item.email===normalizedEmail);
    if(!account) throw authError('auth/invalid-credential','Usuario o contraseña incorrectos.');

    const passwordHash=await hashDemoPassword(password);
    if(passwordHash!==account.passwordHash){
      throw authError('auth/invalid-credential','Usuario o contraseña incorrectos.');
    }
    return {user:{uid:account.uid,email:account.email}};
  }
  return authMod.signInWithEmailAndPassword(auth,email,password);
}

export async function registerAccount({displayName,email,password}){
  if(configured) await ensureFirebase();
  const cleanName=String(displayName||'').trim();
  const cleanEmail=String(email||'').trim().toLowerCase();

  if(cleanName.length<2) throw authError('auth/invalid-display-name','Escribe un nombre válido.');
  if(!cleanEmail.includes('@')) throw authError('auth/invalid-email','Correo inválido.');
  if(String(password||'').length<6) throw authError('auth/weak-password','La contraseña debe tener al menos 6 caracteres.');

  if(!configured){
    if(cleanEmail==='demo@dinocupones.app' || cleanEmail==='amor@dinocupones.app'){
      throw authError('auth/email-already-in-use','Ese correo ya está registrado.');
    }

    const accounts=readDemoAccounts();
    if(accounts.some(item=>item.email===cleanEmail)){
      throw authError('auth/email-already-in-use','Ese correo ya está registrado.');
    }

    const uid='demo-local-'+(crypto.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2));
    const account={
      uid,
      email:cleanEmail,
      displayName:cleanName,
      role:'user',
      passwordHash:await hashDemoPassword(password),
      createdAt:new Date().toISOString()
    };
    accounts.push(account);
    writeDemoAccounts(accounts);
    return {user:{uid,email:cleanEmail}};
  }

  const credential=await authMod.createUserWithEmailAndPassword(auth,cleanEmail,password);
  try{
    await authMod.updateProfile(credential.user,{displayName:cleanName});
    await fsMod.setDoc(fsMod.doc(db,'users',credential.user.uid),{
      displayName:cleanName,
      email:cleanEmail,
      role:'user',
      active:true,
      createdAt:fsMod.serverTimestamp()
    });
  }catch(error){
    try{ await authMod.deleteUser(credential.user); }catch{}
    throw error;
  }
  return credential;
}

export async function logout(){
  if(!configured) return;
  await ensureFirebase();
  return authMod.signOut(auth);
}
export async function resetPassword(email){
  if(configured) await ensureFirebase();
  if(!configured) return true;
  return authMod.sendPasswordResetEmail(auth,email);
}

export async function deleteCurrentAccount(password){
  if(!configured) throw new Error('Esta acción solo está disponible con Firebase conectado.');
  await ensureFirebase();

  const user=auth.currentUser;
  if(!user?.email) throw new Error('No se encontró una cuenta activa.');

  const credential=authMod.EmailAuthProvider.credential(user.email,password);
  await authMod.reauthenticateWithCredential(user,credential);

  const pair=await getPairForUser(user.uid);
  if(pair?.id){
    await unlinkPair({pairId:pair.id,uid:user.uid});
  }

  await fsMod.deleteDoc(fsMod.doc(db,'users',user.uid));
  await authMod.deleteUser(user);
  return true;
}

export async function getProfile(uid){
  if(configured) await ensureFirebase();
  if(!configured) {
    if (uid === 'demo-love') return {uid,displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'};
    if (uid === 'demo-user') return {uid,displayName:'Dino',email:'demo@dinocupones.app',role:'admin'};
    const account=demoAccountByUid(uid);
    if(account) return {uid:account.uid,displayName:account.displayName,email:account.email,role:'user'};
    return {uid,displayName:'Dino',email:'',role:'user'};
  }
  const snap=await fsMod.getDoc(fsMod.doc(db,'users',uid));
  return snap.exists()?{uid,...snap.data()}:{uid,displayName:'Dino',role:'user'};
}

export async function getPairForUser(uid) {
  if(configured) await ensureFirebase();
  if (!configured) return demoPair.active && demoPair.memberUids.includes(uid) ? {...demoPair} : null;
  const snap = await fsMod.getDocs(
    fsMod.query(fsMod.collection(db,'pairs'), fsMod.where('memberUids','array-contains',uid))
  );
  const active = snap.docs
    .map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)}))
    .filter(pair=>pair.active !== false)
    .sort((a,b)=>asDate(b.createdAt)-asDate(a.createdAt));
  return active[0] || null;
}


function activePairFromSnapshot(snapshot) {
  return snapshot.docs
    .map((doc)=>({id:doc.id,...doc.data(),createdAt:asDate(doc.data().createdAt)}))
    .filter((pair)=>pair.active !== false)
    .sort((a,b)=>asDate(b.createdAt)-asDate(a.createdAt))[0] || null;
}

export function subscribePairForUser(uid, callback, onError=()=>{}) {
  if (!uid || typeof callback !== 'function') return ()=>{};

  if (!configured) {
    queueMicrotask(()=>callback(
      demoPair.active && demoPair.memberUids.includes(uid) ? {...demoPair} : null
    ));
    return ()=>{};
  }

  let cancelled=false;
  let unsubscribe=()=>{};

  ensureFirebase()
    .then(()=>{
      if (cancelled) return;
      const queryRef=fsMod.query(
        fsMod.collection(db,'pairs'),
        fsMod.where('memberUids','array-contains',uid)
      );
      unsubscribe=fsMod.onSnapshot(
        queryRef,
        (snapshot)=>{
          if (cancelled) return;
          Promise.resolve(callback(activePairFromSnapshot(snapshot))).catch(onError);
        },
        onError
      );
    })
    .catch(onError);

  return ()=>{
    cancelled=true;
    unsubscribe();
  };
}

export function subscribePairMessages(pairId, uid, callback, onError=()=>{}) {
  if (!pairId || !uid || typeof callback !== 'function') return ()=>{};

  if (!configured) {
    queueMicrotask(()=>callback(
      demoMessages
        .filter((message)=>message.pairId===pairId)
        .map((message)=>({...message}))
        .sort((a,b)=>asDate(a.createdAt)-asDate(b.createdAt))
    ));
    return ()=>{};
  }

  let cancelled=false;
  let unsubscribers=[];
  let received=new Map();
  let sent=new Map();

  const emit=()=>{
    if (cancelled) return;
    const unique=new Map([...received,...sent]);
    const messages=[...unique.values()]
      .sort((a,b)=>asDate(a.createdAt)-asDate(b.createdAt));
    Promise.resolve(callback(messages)).catch(onError);
  };

  const consume=(target,snapshot)=>{
    target.clear();
    snapshot.docs.forEach((doc)=>{
      const data=doc.data();
      target.set(doc.id,{id:doc.id,...data,createdAt:asDate(data.createdAt)});
    });
    emit();
  };

  ensureFirebase()
    .then(()=>{
      if (cancelled) return;
      const base=fsMod.collection(db,'messages');
      const receivedQuery=fsMod.query(
        base,
        fsMod.where('pairId','==',pairId),
        fsMod.where('targetUid','==',uid)
      );
      const sentQuery=fsMod.query(
        base,
        fsMod.where('pairId','==',pairId),
        fsMod.where('senderUid','==',uid)
      );

      unsubscribers=[
        fsMod.onSnapshot(receivedQuery,(snapshot)=>consume(received,snapshot),onError),
        fsMod.onSnapshot(sentQuery,(snapshot)=>consume(sent,snapshot),onError)
      ];
    })
    .catch(onError);

  return ()=>{
    cancelled=true;
    unsubscribers.forEach((unsubscribe)=>unsubscribe());
    unsubscribers=[];
  };
}

export async function createPairInvite({uid,displayName}) {
  if(configured) await ensureFirebase();
  const activePair = await getPairForUser(uid);
  if (activePair) throw new Error('Primero debes cerrar tu DinoDúo actual.');

  if (!configured) {
    const code = randomCode();
    demoInvites.set(code,{fromUid:uid,fromName:displayName||'Dino',status:'pending',createdAt:new Date(),expiresAt:new Date(Date.now()+86400000*7)});
    return code;
  }
  for (let attempt=0; attempt<5; attempt+=1) {
    const code = randomCode();
    const ref = fsMod.doc(db,'pairInvites',code);
    const existing = await fsMod.getDoc(ref);
    if (existing.exists()) continue;
    await fsMod.setDoc(ref,{
      fromUid:uid,
      fromName:displayName||'Dino',
      status:'pending',
      createdAt:fsMod.serverTimestamp(),
      expiresAt:fsMod.Timestamp.fromDate(new Date(Date.now()+86400000*7))
    });
    return code;
  }
  throw new Error('No se pudo generar un código único.');
}

export async function acceptPairInvite({uid,displayName,code}) {
  if(configured) await ensureFirebase();
  const cleanCode = String(code||'').trim().toUpperCase();
  if (!cleanCode) throw new Error('Código vacío.');

  if (!configured) {
    const invite = demoInvites.get(cleanCode);
    if (!invite) throw new Error('Código no encontrado.');
    if (invite.fromUid === uid) throw new Error('No puedes vincularte contigo mismo.');
    demoPair.id='pair-demo-'+cleanCode.toLowerCase();
    demoPair.memberUids=[invite.fromUid,uid];
    demoPair.memberNames={[invite.fromUid]:invite.fromName,[uid]:displayName||'Dino'};
    demoPair.active=true;
    invite.status='accepted';
    invite.toUid=uid;
    return {...demoPair};
  }

  const inviteRef = fsMod.doc(db,'pairInvites',cleanCode);
  const inviteSnap = await fsMod.getDoc(inviteRef);
  if (!inviteSnap.exists()) throw new Error('Código no encontrado.');
  const invite = inviteSnap.data();
  if (invite.status !== 'pending') throw new Error('Este código ya fue utilizado.');
  if (invite.fromUid === uid) throw new Error('No puedes vincularte contigo mismo.');
  if (invite.expiresAt && asDate(invite.expiresAt) < new Date()) throw new Error('Este código venció.');

  const existingPair = await getPairForUser(uid);
  if (existingPair) throw new Error('Ya tienes un vínculo activo.');

  // No consultamos los pares privados del invitador desde la cuenta receptora.
  // Firestore bloquea correctamente esa lectura porque el usuario actual todavía
  // no pertenece a esos pares. La invitación pendiente y las reglas de creación
  // validan que ambos UID formen el nuevo DinoDúo.
  const pairRef = fsMod.doc(fsMod.collection(db,'pairs'));
  const pairId = pairRef.id;
  const batch = fsMod.writeBatch(db);
  const memberNames = {};
  memberNames[invite.fromUid] = invite.fromName || 'Tu persona';
  memberNames[uid] = displayName || 'Dino';

  batch.set(pairRef,{
    memberUids:[invite.fromUid,uid],
    memberNames,
    active:true,
    inviteCode:cleanCode,
    createdAt:fsMod.serverTimestamp()
  });
  batch.update(inviteRef,{
    status:'accepted',
    toUid:uid,
    toName:displayName||'Dino',
    pairId,
    acceptedAt:fsMod.serverTimestamp()
  });
  await batch.commit();
  return {id:pairId,memberUids:[invite.fromUid,uid],memberNames,active:true,createdAt:new Date()};
}

export async function unlinkPair({pairId,uid}) {
  if(configured) await ensureFirebase();
  if (!pairId || !uid) throw new Error('No hay un DinoDúo activo.');

  if (!configured) {
    if (demoPair.id !== pairId || !demoPair.memberUids.includes(uid) || !demoPair.active) {
      throw new Error('No se encontró un vínculo activo.');
    }
    demoPair.active = false;
    demoPair.unlinkedBy = uid;
    demoPair.unlinkedAt = new Date();
    return true;
  }

  const pairRef = fsMod.doc(db,'pairs',pairId);

  await fsMod.runTransaction(db, async (transaction) => {
    const snap = await transaction.get(pairRef);
    if (!snap.exists()) throw new Error('No se encontró el DinoDúo.');

    const pair = snap.data();
    if (pair.active === false || !pair.memberUids?.includes(uid)) {
      throw new Error('No puedes cerrar este vínculo.');
    }

    transaction.update(pairRef,{
      active:false,
      unlinkedBy:uid,
      unlinkedAt:fsMod.serverTimestamp()
    });
  });

  return true;
}

export async function listCoupons(uid,activePairId=null){
  if(configured) await ensureFirebase();
  if(!configured) {
    return sortNewest(demoCoupons
      .filter(c=>c.assignedToUid===uid && (!c.pairId || c.pairId===activePairId))
      .map(c=>normalizeCoupon(c,c.id)));
  }

  const base=fsMod.collection(db,'coupons');
  const requests=[
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('assignedToUid','==',uid),
      fsMod.where('pairId','==',null)
    ))
  ];
  if(activePairId){
    requests.push(fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('assignedToUid','==',uid),
      fsMod.where('pairId','==',activePairId)
    )));
  }

  const snapshots=await Promise.all(requests);
  const unique=new Map();
  snapshots.forEach(snap=>snap.docs.forEach(doc=>unique.set(doc.id,doc)));
  return sortNewest([...unique.values()].map(d=>normalizeCoupon(d.data(),d.id)));
}

export async function listSentCoupons(uid,activePairId=null){
  if(configured) await ensureFirebase();
  if(!configured) {
    return sortNewest(demoCoupons
      .filter(c=>c.createdByUid===uid && (!c.pairId || c.pairId===activePairId))
      .map(c=>normalizeCoupon(c,c.id)));
  }

  const base=fsMod.collection(db,'coupons');
  const requests=[
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('createdByUid','==',uid),
      fsMod.where('pairId','==',null)
    ))
  ];
  if(activePairId){
    requests.push(fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('createdByUid','==',uid),
      fsMod.where('pairId','==',activePairId)
    )));
  }

  const snapshots=await Promise.all(requests);
  const unique=new Map();
  snapshots.forEach(snap=>snap.docs.forEach(doc=>unique.set(doc.id,doc)));
  return sortNewest([...unique.values()].map(d=>normalizeCoupon(d.data(),d.id)));
}

export async function listAllCoupons(){
  if(configured) await ensureFirebase();
  if(!configured) return sortNewest(demoCoupons.map(c=>normalizeCoupon(c,c.id)));
  const snap=await fsMod.getDocs(fsMod.collection(db,'coupons'));
  return sortNewest(snap.docs.map(d=>normalizeCoupon(d.data(),d.id)));
}

export async function createCoupon(payload){
  if(configured) await ensureFirebase();
  const normalized = {
    ...payload,
    createdByUid: payload.createdByUid || payload.createdBy,
    status:'active'
  };
  delete normalized.createdBy;

  if(!configured){
    const item={id:'demo-'+Date.now(),...normalized,emoji:normalized.emoji||'💜',createdAt:new Date()};
    demoCoupons.unshift(item);
    return item;
  }
  const ref=await fsMod.addDoc(fsMod.collection(db,'coupons'),{
    ...normalized,
    expiresAt: normalized.expiresAt instanceof Date ? fsMod.Timestamp.fromDate(normalized.expiresAt) : normalized.expiresAt,
    createdAt:fsMod.serverTimestamp()
  });

  const push = await notifyPush({
    targetUid: normalized.assignedToUid,
    pairId: normalized.pairId || null,
    kind: 'coupon',
    couponId: ref.id,
    title: 'Nuevo DinoCupón 🦕',
    body: (normalized.createdByName || 'Tu persona') + ' te regaló “' + normalized.title + '”.'
  });

  return {id:ref.id,...normalized,createdAt:new Date(),push};
}

export async function setCouponProgress(uid,couponId,status){
  if(configured) await ensureFirebase();
  if(!configured){
    const c=demoCoupons.find(x=>x.id===couponId && x.assignedToUid===uid);
    if(c)c.status=status;
    return true;
  }
  const couponRef=fsMod.doc(db,'coupons',couponId);
  const couponSnap=await fsMod.getDoc(couponRef);
  if(!couponSnap.exists() || couponSnap.data().assignedToUid!==uid) throw new Error('Cupón no autorizado.');

  return fsMod.setDoc(fsMod.doc(db,'couponClaims',uid+'_'+couponId),{
    userId:uid,
    couponId,
    status,
    updatedAt:fsMod.serverTimestamp(),
    ...(status==='completed'?{completedAt:fsMod.serverTimestamp()}:{startedAt:fsMod.serverTimestamp()})
  },{merge:true}).then(()=>fsMod.updateDoc(couponRef,{status}));
}

export async function deleteCoupon(couponId){
  if(configured) await ensureFirebase();
  if(!configured){
    const idx=demoCoupons.findIndex(x=>x.id===couponId);
    if(idx>=0) demoCoupons.splice(idx,1);
    return true;
  }
  const batch=fsMod.writeBatch(db);
  batch.delete(fsMod.doc(db,'coupons',couponId));
  const claimsSnap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'couponClaims'),fsMod.where('couponId','==',couponId)));
  claimsSnap.forEach(doc=>batch.delete(doc.ref));
  await batch.commit();
  return true;
}
export async function resetCoupon(couponId){
  if(configured) await ensureFirebase();
  if(!configured){
    const c=demoCoupons.find(x=>x.id===couponId);
    if(c)c.status='active';
    return true;
  }
  const batch=fsMod.writeBatch(db);
  batch.set(fsMod.doc(db,'coupons',couponId),{status:'active'},{merge:true});
  const claimsSnap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'couponClaims'),fsMod.where('couponId','==',couponId)));
  claimsSnap.forEach(doc=>batch.delete(doc.ref));
  await batch.commit();
  return true;
}

export async function listMural(uid,pairId=null){
  if(configured) await ensureFirebase();
  if(!configured) return [];
  const base=fsMod.collection(db,'mural');
  const snap=pairId
    ? await fsMod.getDocs(fsMod.query(base,fsMod.where('pairId','==',pairId)))
    : await fsMod.getDocs(fsMod.query(
        base,
        fsMod.where('userId','==',uid),
        fsMod.where('pairId','==',null)
      ));
  return sortNewest(snap.docs.map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)})));
}

export async function listAllMural(){
  if(configured) await ensureFirebase();
  if(!configured) return [];
  const snap=await fsMod.getDocs(fsMod.collection(db,'mural'));
  return sortNewest(snap.docs.map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)})));
}

export async function deleteMural(muralId){
  if(configured) await ensureFirebase();
  if(!configured) return true;
  if(!muralId) throw new Error('Recuerdo inválido.');
  return workerPost('/mural/delete',{muralId});
}

export async function uploadMural({uid,pairId=null,uploaderName='',couponId,caption,file}){
  if(configured) await ensureFirebase();
  if(!configured) return {
    id:'local-'+Date.now(),
    userId:uid,
    pairId,
    uploaderName,
    couponId,
    caption,
    type:file.type.startsWith('video/')?'video':'image',
    localUrl:URL.createObjectURL(file),
    createdAt:new Date(),
    fileName:file.name
  };

  if (!mediaReady) {
    throw new Error('Cloudinary todavía no está configurado.');
  }
  if (!file?.type?.match(/^(image|video)\//)) {
    throw new Error('Solo puedes subir imágenes o videos.');
  }
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('El archivo supera el límite de 50 MB configurado para DinoMural.');
  }

  const resourceType=file.type.startsWith('video/')?'video':'image';
  const signed=await workerPost('/cloudinary/sign',{
    pairId:pairId||null,
    resourceType
  });

  const form=new FormData();
  form.append('file',file);
  form.append('api_key',signed.apiKey);
  form.append('timestamp',String(signed.timestamp));
  form.append('signature',signed.signature);
  form.append('folder',signed.folder);
  form.append('public_id',signed.publicId);
  form.append('upload_preset',signed.uploadPreset);

  const uploadResponse=await fetch(
    'https://api.cloudinary.com/v1_1/' +
      encodeURIComponent(signed.cloudName) + '/' +
      encodeURIComponent(signed.resourceType) + '/upload',
    {method:'POST',body:form}
  );
  const uploaded=await uploadResponse.json().catch(()=>({}));
  if(!uploadResponse.ok){
    throw new Error(uploaded?.error?.message || 'Cloudinary rechazó el archivo.');
  }

  const data={
    userId:uid,
    pairId:pairId||null,
    uploaderName:uploaderName||'',
    couponId:couponId||null,
    caption:caption||'',
    type:resourceType,
    provider:'cloudinary',
    mediaUrl:uploaded.secure_url,
    mediaPublicId:uploaded.public_id,
    mediaPath:uploaded.public_id,
    fileName:file.name,
    bytes:uploaded.bytes||file.size,
    format:uploaded.format||null,
    createdAt:fsMod.serverTimestamp()
  };
  const docRef=await fsMod.addDoc(fsMod.collection(db,'mural'),data);
  return {...data,id:docRef.id,createdAt:new Date()};
}

export async function listMessages(uid,activePairId=null){
  if(configured) await ensureFirebase();
  if(!configured) return sortNewest(demoMessages
    .filter(m=>(m.targetUid===uid||m.targetUid==='all') && (!m.pairId || m.pairId===activePairId))
    .map(m=>({...m})));

  const base=fsMod.collection(db,'messages');
  const requests=[
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('targetUid','==',uid),
      fsMod.where('pairId','==',null)
    )),
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('targetUid','==','all'),
      fsMod.where('pairId','==',null)
    )),
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messageReads'),fsMod.where('userId','==',uid)))
  ];
  if(activePairId){
    requests.push(fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('targetUid','==',uid),
      fsMod.where('pairId','==',activePairId)
    )));
  }

  const results=await Promise.all(requests);
  const readsSnap=results[2];
  const messageSnaps=[results[0],results[1],...(activePairId?[results[3]]:[])];
  const readIds=new Set(readsSnap.docs.map(d=>d.data().messageId));
  const unique=new Map();
  messageSnaps.forEach(snap=>snap.docs.forEach(doc=>unique.set(doc.id,doc)));
  return sortNewest([...unique.values()].map(d=>({
    id:d.id,
    ...d.data(),
    read:readIds.has(d.id),
    createdAt:asDate(d.data().createdAt)
  })));
}

export async function listPairMessages(pairId,uid=null){
  if(configured) await ensureFirebase();
  if(!pairId) return [];
  if(!configured) return sortNewest(demoMessages.filter(m=>m.pairId===pairId).map(m=>({...m}))).reverse();

  const currentUid=uid||auth.currentUser?.uid;
  if(!currentUid) return [];

  const base=fsMod.collection(db,'messages');
  const [receivedSnap,sentSnap]=await Promise.all([
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('pairId','==',pairId),
      fsMod.where('targetUid','==',currentUid)
    )),
    fsMod.getDocs(fsMod.query(
      base,
      fsMod.where('pairId','==',pairId),
      fsMod.where('senderUid','==',currentUid)
    ))
  ]);

  const unique=new Map();
  receivedSnap.docs.forEach(doc=>unique.set(doc.id,doc));
  sentSnap.docs.forEach(doc=>unique.set(doc.id,doc));

  return [...unique.values()]
    .map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)}))
    .sort((a,b)=>asDate(a.createdAt)-asDate(b.createdAt));
}

export async function sendMessage(payload){
  if(configured) await ensureFirebase();
  if(!configured){
    const item={id:'m-'+Date.now(),...payload,createdAt:new Date(),read:false};
    demoMessages.push(item);
    return item;
  }
  const ref=await fsMod.addDoc(fsMod.collection(db,'messages'),{...payload,createdAt:fsMod.serverTimestamp()});

  const push = await notifyPush({
    targetUid: payload.targetUid,
    pairId: payload.pairId || null,
    kind: 'message',
    messageId: ref.id,
    title: payload.title || ((payload.senderName || 'Tu persona') + ' te escribió 💌'),
    body: payload.body || 'Tienes un nuevo mensaje.'
  });

  return {id:ref.id,...payload,createdAt:new Date(),push};
}
export async function markMessageRead(id){
  if(configured) await ensureFirebase();
  if(configured){
    const uid=auth.currentUser?.uid;
    if(!uid)return;
    return fsMod.setDoc(fsMod.doc(db,'messageReads',uid+'_'+id),{userId:uid,messageId:id,readAt:fsMod.serverTimestamp()});
  }
  const m=demoMessages.find(x=>x.id===id);
  if(m)m.read=true;
}

export async function listUsers(){
  if(configured) await ensureFirebase();
  if(!configured) return [
    {uid:'demo-user',displayName:'Dino',email:'demo@dinocupones.app',role:'admin'},
    {uid:'demo-love',displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'},
    ...readDemoAccounts().map(({passwordHash,...account})=>account)
  ];
  const snap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'users'),fsMod.orderBy('displayName')));
  return snap.docs.map(d=>({uid:d.id,...d.data()}));
}

export async function requestPushPermission(uid){
  if(configured) await ensureFirebase();
  if(!configured || !oneSignalReady || !uid) return false;
  if(typeof Notification === 'undefined' || Notification.permission==='denied') return false;

  const status = await ensurePushSubscription(uid, { prompt: true });
  return status.ok;
}

export async function sendPushTest(uid){
  if(configured) await ensureFirebase();
  if(!configured || !workerReady || !oneSignalReady || !uid){
    return {ok:false,reason:'PUSH_NOT_READY',recipients:0};
  }

  const status=await ensurePushSubscription(uid,{prompt:false});
  if(!status.ok){
    return {
      ok:false,
      reason:'DEVICE_NOT_SUBSCRIBED',
      recipients:0,
      subscription:status
    };
  }

  const result=await workerPost('/notify',{
    targetUid:uid,
    title:'DinoCupones está listo 🦖💜',
    body:'Esta es una notificación de prueba para confirmar que tu dispositivo quedó conectado.'
  });

  const recipients=Number.isFinite(Number(result?.recipients))
    ? Number(result.recipients)
    : 0;

  return {
    ok:Boolean(result?.ok) && recipients>0,
    reason:recipients>0?null:'NO_SUBSCRIBED_DEVICE',
    recipients,
    notificationId:result?.id||null,
    subscription:status,
    raw:result
  };
}

export function onForegroundMessage(callback){
  let cleanup=()=>{};
  if(!oneSignalReady) return cleanup;

  getOneSignal().then((OneSignal)=>{
    if(!OneSignal?.Notifications) return;

    const handler=(event)=>{
      const notification=event?.notification || event;
      callback({
        notification:{
          title:notification?.title || 'DinoCupones',
          body:notification?.body || notification?.message || ''
        }
      });
    };

    if(typeof OneSignal.Notifications.addEventListener==='function'){
      OneSignal.Notifications.addEventListener('foregroundWillDisplay',handler);
      cleanup=()=>OneSignal.Notifications.removeEventListener?.('foregroundWillDisplay',handler);
    }else if(typeof OneSignal.Notifications.addForegroundLifecycleListener==='function'){
      OneSignal.Notifications.addForegroundLifecycleListener(handler);
      cleanup=()=>OneSignal.Notifications.removeForegroundLifecycleListener?.(handler);
    }
  }).catch((error)=>console.warn('OneSignal no pudo inicializarse.',error));

  return ()=>cleanup();
}
