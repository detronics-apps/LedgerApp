import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { auth, googleProvider, db, ALLOWED_EMAIL_DOMAIN } from '../firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export function signIn() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

async function upsertUserProfile(user) {
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: user.displayName || user.email,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

async function checkIsAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/** onSignedIn({uid, email, displayName, isAdmin}); onWrongDomain(email) fires instead of onSignedIn for a non-company address. */
export function initAuth({ onSignedIn, onSignedOut, onWrongDomain }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onSignedOut();
      return;
    }
    if (!user.email || !user.email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      onWrongDomain(user.email);
      await signOut(auth);
      return;
    }
    await upsertUserProfile(user);
    const isAdmin = await checkIsAdmin(user.uid);
    onSignedIn({ uid: user.uid, email: user.email, displayName: user.displayName || user.email, isAdmin });
  });
}
