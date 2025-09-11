import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your config from Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_AIzaSyDHyVQ7f4moAJGBJex6Hv1Trkf4KKxPguw,
  authDomain: import.meta.env.VITE_wallstsmart-production.firebaseapp.com,
  projectId: import.meta.env.VITE_wallstsmart-production,
  storageBucket: import.meta.env.VITE_wallstsmart-production.firebasestorage.app,
  messagingSenderId: import.meta.env.VITE_694145103814,
  appId: import.meta.env.VITE_1:694145103814:web:f2347abe73f54a4f07e4c7
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
