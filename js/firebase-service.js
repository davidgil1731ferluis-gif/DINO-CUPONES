import { firebaseConfig, vapidKey } from './firebase-config.js';

const V = '12.19.0';
const appMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-app.js');
const authMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-auth.js');
const fsMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-firestore.js');
const stMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-storage.js');
const msgMod = await import('https://www.gstatic.com/firebasejs/' + V + '/firebase-messaging.js');

const configured = firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('TU_');

let app = null, auth = null, db = null, storage = null, messaging = null;
if (configured) {
  app = appMod.initializeApp(firebaseConfig);
  auth = authMod.getAuth(app);
  db = fsMod.getFirestore(app);
  storage = stMod.getStorage(app);
  if (msgMod.isSupported && await msgMod.isSupported()) messaging = msgMod.getMessaging(app);
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

export const firebaseReady = configured;

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
  if(!configured) return {user:{uid:'demo-user',email}};
  return authMod.signInWithEmailAndPassword(auth,email,password);
}
export async function logout(){if(configured) return authMod.signOut(auth);}
export async function resetPassword(email){
  if(!configured) return true;
  return authMod.sendPasswordResetEmail(auth,email);
}

export async function getProfile(uid){
  if(!configured) {
    if (uid === 'demo-love') return {uid,displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'};
    return {uid,displayName:'Dino',email:'demo@dinocupones.app',role:'admin'};
  }
  const snap=await fsMod.getDoc(fsMod.doc(db,'users',uid));
  return snap.exists()?{uid,...snap.data()}:{uid,displayName:'Dino',role:'user'};
}

export async function getPairForUser(uid) {
  if (!configured) return demoPair.memberUids.includes(uid) ? {...demoPair} : null;
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
    demoPair.id='pair-demo';
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

  const pairId = 'pair_' + [invite.fromUid,uid].sort().join('_');
  const pairRef = fsMod.doc(db,'pairs',pairId);
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

export async function listCoupons(uid){
  if(!configured) {
    return sortNewest(demoCoupons
      .filter(c=>c.assignedToUid===uid)
      .map(c=>normalizeCoupon(c,c.id)));
  }
  const snap = await fsMod.getDocs(
    fsMod.query(fsMod.collection(db,'coupons'),fsMod.where('assignedToUid','==',uid))
  );
  return sortNewest(snap.docs.map(d=>normalizeCoupon(d.data(),d.id)));
}

export async function listSentCoupons(uid){
  if(!configured) return sortNewest(demoCoupons.filter(c=>c.createdByUid===uid).map(c=>normalizeCoupon(c,c.id)));
  const snap = await fsMod.getDocs(
    fsMod.query(fsMod.collection(db,'coupons'),fsMod.where('createdByUid','==',uid))
  );
  return sortNewest(snap.docs.map(d=>normalizeCoupon(d.data(),d.id)));
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
    : await fsMod.getDocs(fsMod.query(base,fsMod.where('userId','==',uid)));
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
  const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const scope=pairId||uid;
  const path='mural/'+scope+'/'+uid+'/'+Date.now()+'_'+clean;
  const r=stMod.ref(storage,path);
  await stMod.uploadBytes(r,file,{contentType:file.type});
  const mediaUrl=await stMod.getDownloadURL(r);
  const data={
    userId:uid,
    pairId:pairId||null,
    uploaderName:uploaderName||'',
    couponId:couponId||null,
    caption:caption||'',
    type:file.type.startsWith('video/')?'video':'image',
    mediaUrl,
    mediaPath:path,
    fileName:file.name,
    createdAt:fsMod.serverTimestamp()
  };
  const docRef=await fsMod.addDoc(fsMod.collection(db,'mural'),data);
  return {...data,id:docRef.id,createdAt:new Date()};
}

export async function listMessages(uid){
  if(!configured) return sortNewest(demoMessages.filter(m=>m.targetUid===uid||m.targetUid==='all').map(m=>({...m})));
  const [personal,broadcast,readsSnap]=await Promise.all([
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messages'),fsMod.where('targetUid','==',uid))),
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messages'),fsMod.where('targetUid','==','all'))),
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messageReads'),fsMod.where('userId','==',uid)))
  ]);
  const readIds=new Set(readsSnap.docs.map(d=>d.data().messageId));
  const docs=[...personal.docs,...broadcast.docs];
  const unique=new Map(docs.map(d=>[d.id,d]));
  return sortNewest([...unique.values()].map(d=>({id:d.id,...d.data(),read:readIds.has(d.id),createdAt:asDate(d.data().createdAt)})));
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
    {uid:'demo-love',displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'}
  ];
  const snap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'users'),fsMod.orderBy('displayName')));
  return snap.docs.map(d=>({uid:d.id,...d.data()}));
}

export async function requestPushPermission(uid){
  if(!configured||!messaging||Notification.permission==='denied') return false;
  const permission=await Notification.requestPermission();
  if(permission!=='granted')return false;
  const reg=await navigator.serviceWorker.ready;
  const token=await msgMod.getToken(messaging,{vapidKey,serviceWorkerRegistration:reg});
  if(!token)return false;
  await fsMod.addDoc(fsMod.collection(db,'users',uid,'devices'),{token,createdAt:fsMod.serverTimestamp(),userAgent:navigator.userAgent});
  return true;
}
export function onForegroundMessage(callback){
  if(!messaging)return()=>{};
  return msgMod.onMessage(messaging,callback);
}
