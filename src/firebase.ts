import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';
import fallbackConfig from '../firebase-applet-config.example.json';

// Disable noisy firestore logs
setLogLevel('silent');

// Load local firebase-applet-config.json if present, otherwise fallback to template + env
const localConfigs = import.meta.glob('../firebase-applet-config.json', { eager: true }) as Record<string, any>;
const localFileConfig = localConfigs['../firebase-applet-config.json']?.default || localConfigs['../firebase-applet-config.json'] || {};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || localFileConfig.apiKey || fallbackConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || localFileConfig.authDomain || fallbackConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || localFileConfig.projectId || fallbackConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || localFileConfig.storageBucket || fallbackConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFileConfig.messagingSenderId || fallbackConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || localFileConfig.appId || fallbackConfig.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || localFileConfig.measurementId || fallbackConfig.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || localFileConfig.firestoreDatabaseId || (fallbackConfig as any).firestoreDatabaseId || '(default)',
};

const app = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');

export const auth = getAuth(app);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(app);
