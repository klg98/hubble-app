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
  apiKey: "AIzaSyAkR0yM8zK7SRRaQtnFG6oRDZt6cNcL3Hw",
  authDomain: "ssenger-b3dc2.firebaseapp.com",
  databaseURL: "https://ssenger-b3dc2-default-rtdb.firebaseio.com",
  projectId: "ssenger-b3dc2",
  storageBucket: "ssenger-b3dc2.appspot.com",
  messagingSenderId: "162162910144",
  appId: "1:162162910144:web:b52c7341e00d1f06d9de25",
  measurementId: "G-YQT4H2TN44"
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
