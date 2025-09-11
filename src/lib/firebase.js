import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDHyVQ7f4moAJGBJex6Hv1Trkf4KKxPguw",
  authDomain: "wallstsmart-production.firebaseapp.com",
  projectId: "wallstsmart-production",
  storageBucket: "wallstsmart-production.firebasestorage.app",
  messagingSenderId: "694145103814",
  appId: "1:694145103814:web:f2347abe73f54a4f07e4c7",
  measurementId: "G-9P9NEWLZ8E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
