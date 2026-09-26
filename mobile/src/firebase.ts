import { initializeApp, getApps } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
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

type ReactNativeAuthModule = typeof firebaseAuth & {
  getReactNativePersistence?: (storage: unknown) => firebaseAuth.Persistence;
};

function createNativeAuth() {
  const authModule = firebaseAuth as ReactNativeAuthModule;
  const getNativePersistence = authModule.getReactNativePersistence;

  try {
    if (typeof getNativePersistence === 'function') {
      const storage = createAsyncStorage('dinocupones-auth');
      return firebaseAuth.initializeAuth(firebaseApp, {
        persistence: getNativePersistence(storage),
      });
    }

    return firebaseAuth.getAuth(firebaseApp);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/already-initialized') {
      return firebaseAuth.getAuth(firebaseApp);
    }
    throw error;
  }
}

export const auth = createNativeAuth();
export const db = getFirestore(firebaseApp);
