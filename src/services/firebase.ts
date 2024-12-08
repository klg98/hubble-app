import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyASfGmAj1an5U6RDLpP8A9cHI5dI--7u5I",
  authDomain: "enterpro-7cd93.firebaseapp.com",
  projectId: "enterpro-7cd93",
  storageBucket: "enterpro-7cd93.firebasestorage.app",
  messagingSenderId: "1072747909680",
  appId: "1:1072747909680:web:37543ed340a58263b893f5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Authentication functions
export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const registerWithEmail = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const updateUserProfile = (user: User, data: { displayName?: string | null; photoURL?: string | null; }) => {
  return updateProfile(user, data);
};

export const logOut = () => {
  return signOut(auth);
};

export { auth, db, storage };
