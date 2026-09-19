import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export const ALLOWED_EMAIL_DOMAIN = 'research-square.com';

// This config identifies the Firebase project; it is not a secret. Firebase's
// security model is enforced by Auth + Firestore Rules (firestore.rules), not
// by hiding these values - see the README's "Is this config a secret?" note.
// Replace every value below with this project's config from
// Firebase console > Project settings > General > Your apps > SDK setup.
export const firebaseConfig = {
  apiKey: 'AIzaSyAL4WVelJqYtSDXQo8y5l7IMErF9tB6158',
  authDomain: 'impact-ledger-96be2.firebaseapp.com',
  projectId: 'impact-ledger-96be2',
  storageBucket: 'impact-ledger-96be2.firebasestorage.app',
  messagingSenderId: '829716155001',
  appId: '1:829716155001:web:a39abc73ff7d2cfbfea2a8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN });

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
