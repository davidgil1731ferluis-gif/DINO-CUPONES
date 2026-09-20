import { firebaseConfig, vapidKey } from './firebase-config.js';

const V = '12.19.0';
const appMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
const authMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
const fsMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
const stMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-storage.js`);
const msgMod = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-messaging.js`);

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
const demoCoupons = [
  {id:'demo-1',title:'Cena sorpresa',activity:'Una cena escogida por quien recibe el cupón, sin mirar el reloj y con postre obligatorio.',expiresAt:new Date(demoNow+86400000*14),status:'active',emoji:'🍝'},
  {id:'demo-2',title:'Cita sin celular',activity:'Dos horas para hablar, caminar y dejar los teléfonos guardados.',expiresAt:new Date(demoNow+86400000*7),status:'pending',emoji:'🌙'},
  {id:'demo-3',title:'Tarde de película',activity:'Película favorita, cobija, crispetas y cero discusiones por quién escoge.',expiresAt:new Date(demoNow-86400000*2),status:'expired',emoji:'🎬'},
  {id:'demo-4',title:'Desayuno favorito',activity:'Un desayuno preparado con algo que la otra persona realmente ame.',expiresAt:new Date(demoNow+86400000*30),status:'completed',emoji:'🥞'}
];
const demoMessages = [{id:'msg-1',title:'Para cuando abras esto 💜',body:'Hay una aventura nueva esperando por nosotros.',createdAt:new Date(),read:false}];

export const firebaseReady = configured;

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
  if(!configured) return {uid,displayName:'Dino',email:'demo@dinocupones.app',role:'admin'};
  const snap=await fsMod.getDoc(fsMod.doc(db,'users',uid));
  return snap.exists()?{uid,...snap.data()}:{uid,displayName:'Dino',role:'user'};
}
export async function listCoupons(uid){
  if(!configured) return demoCoupons.map(c=>({...c}));
  const [couponSnap,claimSnap]=await Promise.all([
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'coupons'),fsMod.orderBy('createdAt','desc'))),
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'couponClaims'),fsMod.where('userId','==',uid)))
  ]);
  const claims=new Map(claimSnap.docs.map(d=>[d.data().couponId,d.data()]));
  return couponSnap.docs.map(d=>{
    const data=d.data();
    const claim=claims.get(d.id);
    const expiry=data.expiresAt?.toDate?.()||new Date(data.expiresAt);
    let status=claim?.status||data.status||'active';
    if(status!=='completed' && expiry < new Date()) status='expired';
    return {id:d.id,...data,expiresAt:expiry,status};
  });
}
export async function createCoupon(payload){
  if(!configured){
    demoCoupons.unshift({id:`demo-${Date.now()}`,...payload,status:'active',emoji:'💜'});
    return true;
  }
  return fsMod.addDoc(fsMod.collection(db,'coupons'),{...payload,status:'active',createdAt:fsMod.serverTimestamp()});
}
export async function setCouponProgress(uid,couponId,status){
  if(!configured){
    const c=demoCoupons.find(x=>x.id===couponId);
    if(c)c.status=status;
    return true;
  }
  const id=`${uid}_${couponId}`;
  return fsMod.setDoc(fsMod.doc(db,'couponClaims',id),{
    userId:uid,
    couponId,
    status,
    updatedAt:fsMod.serverTimestamp(),
    ...(status==='completed'?{completedAt:fsMod.serverTimestamp()}:{startedAt:fsMod.serverTimestamp()})
  },{merge:true});
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
export async function listMural(){
  if(!configured) return [];
  const snap=await fsMod.getDocs(fsMod.query(fsMod.collection(db,'mural'),fsMod.orderBy('createdAt','desc')));
  return snap.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.()||new Date()}));
}
export async function uploadMural({uid,couponId,caption,file}){
  if(!configured) return {id:`local-${Date.now()}`,userId:uid,couponId,caption,type:file.type.startsWith('video/')?'video':'image',localUrl:URL.createObjectURL(file),createdAt:new Date(),fileName:file.name};
  const clean=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`mural/${uid}/${Date.now()}_${clean}`;
  const r=stMod.ref(storage,path);
  await stMod.uploadBytes(r,file,{contentType:file.type});
  const mediaUrl=await stMod.getDownloadURL(r);
  const docRef=await fsMod.addDoc(fsMod.collection(db,'mural'),{
    userId:uid,
    couponId:couponId||null,
    caption:caption||'',
    type:file.type.startsWith('video/')?'video':'image',
    mediaUrl,
    mediaPath:path,
    fileName:file.name,
    createdAt:fsMod.serverTimestamp()
  });
  return {id:docRef.id,userId:uid,couponId,caption,type:file.type.startsWith('video/')?'video':'image',mediaUrl,mediaPath:path,fileName:file.name,createdAt:new Date()};
}
export async function listMessages(uid){
  if(!configured) return demoMessages.map(m=>({...m}));
  const [snap,readsSnap]=await Promise.all([
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messages'),fsMod.where('targetUid','in',[uid,'all']),fsMod.orderBy('createdAt','desc'))),
    fsMod.getDocs(fsMod.query(fsMod.collection(db,'messageReads'),fsMod.where('userId','==',uid)))
  ]);
  const readIds=new Set(readsSnap.docs.map(d=>d.data().messageId));
  return snap.docs.map(d=>({id:d.id,...d.data(),read:readIds.has(d.id),createdAt:d.data().createdAt?.toDate?.()||new Date()}));
}
export async function sendMessage(payload){
  if(!configured){demoMessages.unshift({id:`m-${Date.now()}`,...payload,createdAt:new Date(),read:false});return true;}
  return fsMod.addDoc(fsMod.collection(db,'messages'),{...payload,createdAt:fsMod.serverTimestamp(),read:false});
}
export async function markMessageRead(id){
  if(configured){
    const uid=auth.currentUser?.uid;
    if(!uid)return;
    return fsMod.setDoc(fsMod.doc(db,'messageReads',`${uid}_${id}`),{userId:uid,messageId:id,readAt:fsMod.serverTimestamp()});
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
