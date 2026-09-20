import { firebaseConfig } from './firebase-config.js';
import {
  integrationsConfig,
  cloudinaryReady,
  oneSignalReady,
  workerReady
} from './integrations-config.js';

const V = '12.19.0';
const appMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js');
const authMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js');
const fsMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js');
const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('TU_');

let app = null, auth = null, db = null;
let oneSignalPromise = null;

if (configured) {
  app = appMod.initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = fsMod.getFirestore(app);
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
  if (!configured || !auth?.currentUser) throw new Error('Debes iniciar sesión.');
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

export async function identifyPushUser(uid) {
  if (!configured || !oneSignalReady || !uid) return false;
  const OneSignal = await getOneSignal();
  if (!OneSignal) return false;
  await OneSignal.login(uid);
  return true;
}

export async function clearPushUser() {
  if (!oneSignalReady) return;
  try {
    const OneSignal = await getOneSignal();
    await OneSignal?.logout();
  } catch (error) {
    console.warn('No se pudo cerrar la sesión de OneSignal.', error);
  }
}

async function notifyPush(payload) {
  if (!configured || !workerReady || !oneSignalReady) return false;
  try {
    await workerPost('/notify', payload);
    return true;
  } catch (error) {
    console.warn('La acción se guardó, pero la notificación push no pudo enviarse.', error);
    return false;
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
  return authMod.onAuthStateChanged(auth,callback);
}
export async function login(email,password){
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

export async function logout(){if(configured) return authMod.signOut(auth);}
export async function resetPassword(email){
  if(!configured) return true;
  return authMod.sendPasswordResetEmail(auth,email);
}

export async function getProfile(uid){
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

export async function createPairInvite({uid,displayName}) {
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

  const inviterPair = await getPairForUser(invite.fromUid);
  if (inviterPair) throw new Error('La otra persona ya tiene un DinoDúo activo.');

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
  const snap = await fsMod.getDoc(pairRef);
  if (!snap.exists()) throw new Error('No se encontró el DinoDúo.');

  const pair = snap.data();
  if (pair.active === false || !pair.memberUids?.includes(uid)) {
    throw new Error('No puedes cerrar este vínculo.');
  }

  await fsMod.updateDoc(pairRef,{
    active:false,
    unlinkedBy:uid,
    unlinkedAt:fsMod.serverTimestamp()
  });
  return true;
}

export async function listCoupons(uid,activePairId=null){
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
  if(!configured) return sortNewest(demoCoupons.map(c=>normalizeCoupon(c,c.id)));
  const snap=await fsMod.getDocs(fsMod.collection(db,'coupons'));
  return sortNewest(snap.docs.map(d=>normalizeCoupon(d.data(),d.id)));
}

export async function createCoupon(payload){
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

  notifyPush({
    targetUid: normalized.assignedToUid,
    pairId: normalized.pairId || null,
    title: 'Nuevo DinoCupón 🦕',
    body: (normalized.createdByName || 'Tu persona') + ' te regaló “' + normalized.title + '”.'
  }).catch(()=>{});

  return {id:ref.id,...normalized,createdAt:new Date()};
}

export async function setCouponProgress(uid,couponId,status){
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
  if(!configured) return [];
  const snap=await fsMod.getDocs(fsMod.collection(db,'mural'));
  return sortNewest(snap.docs.map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)})));
}

export async function uploadMural({uid,pairId=null,uploaderName='',couponId,caption,file}){
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

export async function listPairMessages(pairId){
  if(!pairId) return [];
  if(!configured) return sortNewest(demoMessages.filter(m=>m.pairId===pairId).map(m=>({...m}))).reverse();
  const snap=await fsMod.getDocs(
    fsMod.query(fsMod.collection(db,'messages'),fsMod.where('pairId','==',pairId))
  );
  return snap.docs
    .map(d=>({id:d.id,...d.data(),createdAt:asDate(d.data().createdAt)}))
    .sort((a,b)=>asDate(a.createdAt)-asDate(b.createdAt));
}

export async function sendMessage(payload){
  if(!configured){
    const item={id:'m-'+Date.now(),...payload,createdAt:new Date(),read:false};
    demoMessages.push(item);
    return item;
  }
  const ref=await fsMod.addDoc(fsMod.collection(db,'messages'),{...payload,createdAt:fsMod.serverTimestamp()});

  notifyPush({
    targetUid: payload.targetUid,
    pairId: payload.pairId || null,
    title: payload.title || ((payload.senderName || 'Tu persona') + ' te escribió 💌'),
    body: payload.body || 'Tienes un nuevo mensaje.'
  }).catch(()=>{});

  return {id:ref.id,...payload,createdAt:new Date()};
}
export async function markMessageRead(id){
  if(configured){
    const uid=auth.currentUser?.uid;
    if(!uid)return;
    return fsMod.setDoc(fsMod.doc(db,'messageReads',uid+'_'+id),{userId:uid,messageId:id,readAt:fsMod.serverTimestamp()});
  }
  const m=demoMessages.find(x=>x.id===id);
  if(m)m.read=true;
}

export async function listUsers(){
  if(!configured) return [
    {uid:'demo-user',displayName:'Dino',email:'demo@dinocupones.app',role:'admin'},
    {uid:'demo-love',displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'},
    ...readDemoAccounts().map(({passwordHash,...account})=>account)
  ];
  const snap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'users'),fsMod.orderBy('displayName')));
  return snap.docs.map(d=>({uid:d.id,...d.data()}));
}

export async function requestPushPermission(uid){
  if(!configured || !oneSignalReady || !uid) return false;
  if(Notification.permission==='denied') return false;

  const OneSignal=await getOneSignal();
  if(!OneSignal) return false;

  await OneSignal.login(uid);
  await OneSignal.Notifications.requestPermission();
  return Notification.permission==='granted';
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
