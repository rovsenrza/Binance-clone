import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

let app = null;
let db = null;

export function isFirebaseConfigured() {
  const cfg = firebaseConfig;
  if (!cfg?.projectId || !cfg?.apiKey) return false;
  if (cfg.apiKey === 'YOUR_API_KEY' || cfg.projectId === 'YOUR_PROJECT_ID') return false;
  return true;
}

export function initFirebase() {
  if (!isFirebaseConfigured()) return null;
  if (db) return db;
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  return db;
}

export function getDb() {
  return db;
}
