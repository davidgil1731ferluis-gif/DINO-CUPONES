import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { createAsyncStorage } from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyACfdS4i5pL7wWYkMplX6bF3j3T1qphBQ8',
  authDomain: 'dinocupones.firebaseapp.com',
  projectId: 'dinocupones',
  storageBucket: 'dinocupones.firebasestorage.app',
  messagingSenderId: '610727439740',
  appId: '1:610727439740:web:4214e7e99c7e10e80f08f9',
};

export const firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);

function resolveAuth() {
  try {
    const storage = createAsyncStorage('dinocupones-auth');
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(storage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
}

export const auth = resolveAuth();
export const db = getFirestore(firebaseApp);
