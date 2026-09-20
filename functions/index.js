const {onDocumentCreated}=require('firebase-functions/v2/firestore');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore}=require('firebase-admin/firestore');
const {getMessaging}=require('firebase-admin/messaging');
initializeApp(); const db=getFirestore();
const APP_URL=process.env.APP_URL||'https://davidgil1731ferluis-gif.github.io/DINO-CUPONES/';
async function tokensFor(uid){const s=await db.collection('users').doc(uid).collection('devices').get();return s.docs.map(d=>d.data().token).filter(Boolean)}
async function allUserTokens(){const u=await db.collection('users').where('role','==','user').get();return (await Promise.all(u.docs.map(d=>tokensFor(d.id)))).flat()}
async function send(tokens,notification){for(let i=0;i<tokens.length;i+=500)await getMessaging().sendEachForMulticast({tokens:tokens.slice(i,i+500),notification,webpush:{fcmOptions:{link:APP_URL}}})}
exports.notifyNewCoupon=onDocumentCreated('coupons/{couponId}',async e=>{const d=e.data.data();await send(await allUserTokens(),{title:'Nuevo DinoCupón 🦕',body:`Se publicó: ${d.title}`})});
exports.notifyPersonalMessage=onDocumentCreated('messages/{messageId}',async e=>{const d=e.data.data();await send(d.targetUid==='all'?await allUserTokens():await tokensFor(d.targetUid),{title:d.title||'DinoCupones',body:d.body||'Tienes un nuevo mensaje.'})});