import {firebaseConfig} from './firebase-config.js';

export const firebaseReady=!firebaseConfig.apiKey.startsWith('TU_');
const now=Date.now();
let demoCoupons=[
 {id:'c1',title:'Cena bajo las estrellas',activity:'Elegir una noche, apagar el celular y preparar una cena especial para dos.',expiresAt:new Date(now+1000*60*60*24*18),status:'active',emoji:'🌙'},
 {id:'c2',title:'Tarde de helado',activity:'Salir por un helado y caminar sin prisa por nuestro lugar favorito.',expiresAt:new Date(now+1000*60*60*24*8),status:'pending',emoji:'🍦'},
 {id:'c3',title:'Maratón de película',activity:'Elegir una película, preparar crispetas y construir una fortaleza de cobijas.',expiresAt:new Date(now-1000*60*60*24*2),status:'expired',emoji:'🎬'},
 {id:'c4',title:'Desayuno sorpresa',activity:'Preparar un desayuno especial y llevarlo a la cama.',expiresAt:new Date(now+1000*60*60*24*30),status:'completed',emoji:'🥐'}
];
let demoMessages=[{id:'m1',title:'Una pequeña sorpresa 💜',body:'Hay una nueva aventura esperando por nosotros.',createdAt:new Date(now-1000*60*24),read:false}];
let demoMural=[];
let demoUsers=[{uid:'demo-user',displayName:'Dino Admin',email:'demo@dinocupones.app',role:'admin'},{uid:'demo-love',displayName:'Mi persona favorita',email:'amor@dinocupones.app',role:'user'}];

export function onAuth(cb){if(firebaseReady)console.warn('Firebase aún requiere configuración real.'); return ()=>{}}
export async function login(email,password){if(firebaseReady)throw new Error('Firebase real pendiente de configuración');return {uid:'demo-user',email}}
export async function logout(){return true}
export async function resetPassword(){return true}
export async function getProfile(uid){return firebaseReady?{uid,displayName:'Dino',role:'user'}:{...demoUsers[0],uid}}
export async function listCoupons(){return demoCoupons.map(x=>({...x}))}
export async function createCoupon(payload){demoCoupons.unshift({id:'c'+Date.now(),...payload,status:'active',emoji:'💜'});return true}
export async function setCouponProgress(uid,couponId,status){const c=demoCoupons.find(x=>x.id===couponId);if(c)c.status=status;return true}
export async function listMural(){return demoMural.map(x=>({...x}))}
export async function uploadMural({uid,couponId,caption,file}){const item={id:'media'+Date.now(),userId:uid,couponId,caption,type:file.type.startsWith('video/')?'video':'image',localUrl:URL.createObjectURL(file),fileName:file.name,createdAt:new Date()};demoMural.unshift(item);return item}
export async function listMessages(){return demoMessages.map(x=>({...x}))}
export async function sendMessage(payload){demoMessages.unshift({id:'m'+Date.now(),...payload,createdAt:new Date(),read:false});return true}
export async function markMessageRead(id){const m=demoMessages.find(x=>x.id===id);if(m)m.read=true;return true}
export async function listUsers(){return demoUsers.map(x=>({...x}))}
export async function requestPushPermission(){return false}
export function onForegroundMessage(){return ()=>{}}
