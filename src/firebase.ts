import { app, auth, db, googleProvider } from './services/firebase';
import { signInAnonymously, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, type Timestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export {
  app,
  auth,
  db,
  googleProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  firebaseConfig,
};
export type { User, Timestamp };
