import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { auth, db, ALLOWED_EMAIL_DOMAIN } from '../firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

/** Accounts are provisioned only by an admin (Firebase console > Authentication
 * > Users > Add user) - there is no self-service signup. This just signs in
 * with whatever email/password the admin already created for that person. */
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
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

/** A full admin has no categoryIds restriction (missing or empty); a
 * category-scoped admin's categoryIds names which categories/tasks they
 * may manage - everything else stays off-limits to them. */
async function loadAdminInfo(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    if (!snap.exists()) return { isAdmin: false, categoryIds: [] };
    const categoryIds = snap.data().categoryIds || [];
    return { isAdmin: categoryIds.length === 0, categoryIds };
  } catch {
    return { isAdmin: false, categoryIds: [] };
  }
}

/** onSignedIn({uid, email, displayName, isAdmin, categoryIds}); onWrongDomain(email) fires instead of onSignedIn for a non-company address. */
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
    const { isAdmin, categoryIds } = await loadAdminInfo(user.uid);
    onSignedIn({ uid: user.uid, email: user.email, displayName: user.displayName || user.email, isAdmin, categoryIds });
  });
}
