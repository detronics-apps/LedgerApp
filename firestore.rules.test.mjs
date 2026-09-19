import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv;

function validEntry(uid) {
  return {
    uid, email: `${uid}@research-square.com`, displayName: uid,
    date: '2026-09-17', categoryId: 'c1', categoryName: 'Culture',
    taskId: 't1', taskName: 'Team event', isCustomTask: false,
    impact: 3, proof: 2, taskWeight: 1, categoryWeight: 1, points: 6,
    description: 'desc',
  };
}

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-impact-ledger',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(async () => { await testEnv.cleanup(); });
test.beforeEach(async () => { await testEnv.clearFirestore(); });

test('unauthenticated read of entries is rejected', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'entries', 'e1')));
});

test('unauthenticated write of entries is rejected', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('nobody')));
});

test('a non-company-domain user is rejected', async () => {
  const db = testEnv.authenticatedContext('outsider', { email: 'someone@gmail.com' }).firestore();
  await assertFails(getDoc(doc(db, 'entries', 'e1')));
});

test('a company user can create an entry under their own uid', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertSucceeds(setDoc(doc(db, 'entries', 'e1'), validEntry('alice')));
});

test('a company user cannot create an entry under another uid', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('bob')));
});

test('a company user cannot create an entry with a tampered points value', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), { ...validEntry('alice'), points: 999 }));
});

test('a company user can read any entry (full company ledger)', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('bob'));
  });
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertSucceeds(getDoc(doc(db, 'entries', 'e1')));
});

test('a regular user cannot write to categories', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('an admin can write to categories', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = testEnv.authenticatedContext('admin1', { email: 'admin1@research-square.com' }).firestore();
  await assertSucceeds(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('no client, including an admin, can write to admins', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = testEnv.authenticatedContext('admin1', { email: 'admin1@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'admins', 'admin2'), { email: 'admin2@research-square.com' }));
});
