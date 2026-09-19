import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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

// Company sign-in is always through Google Sign-In in production, which
// always sets email_verified: true - this helper mirrors that so every test
// below isolates the condition it's actually exercising (domain, ownership,
// shape) rather than accidentally tripping the email_verified guard too.
function companyDb(uid, email) {
  return testEnv.authenticatedContext(uid, { email, email_verified: true }).firestore();
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
  const db = companyDb('outsider', 'someone@gmail.com');
  await assertFails(getDoc(doc(db, 'entries', 'e1')));
});

test('a company user can create an entry under their own uid', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertSucceeds(setDoc(doc(db, 'entries', 'e1'), validEntry('alice')));
});

test('a company user cannot create an entry under another uid', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('bob')));
});

test('a company user cannot create an entry with a tampered points value', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(setDoc(doc(db, 'entries', 'e1'), { ...validEntry('alice'), points: 999 }));
});

test('a company user can read any entry (full company ledger)', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('bob'));
  });
  const db = companyDb('alice', 'alice@research-square.com');
  await assertSucceeds(getDoc(doc(db, 'entries', 'e1')));
});

test('a different company user cannot update another user\'s entry', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('alice'));
  });
  const db = companyDb('bob', 'bob@research-square.com');
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('alice')));
});

test('a different company user cannot delete another user\'s entry', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('alice'));
  });
  const db = companyDb('bob', 'bob@research-square.com');
  await assertFails(deleteDoc(doc(db, 'entries', 'e1')));
});

test('a company user cannot steal an entry by changing its uid on update', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('alice'));
  });
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(setDoc(doc(db, 'entries', 'e1'), { ...validEntry('alice'), uid: 'bob' }));
});

test('an admin cannot delete another user\'s entry (admin delete-bypass removed)', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('alice'));
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = companyDb('admin1', 'admin1@research-square.com');
  await assertFails(deleteDoc(doc(db, 'entries', 'e1')));
});

test('a regular user cannot write to categories', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('an admin can write to categories', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = companyDb('admin1', 'admin1@research-square.com');
  await assertSucceeds(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('no client, including an admin, can write to admins', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = companyDb('admin1', 'admin1@research-square.com');
  await assertFails(setDoc(doc(db, 'admins', 'admin2'), { email: 'admin2@research-square.com' }));
});

test('a company user can create their own users doc', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertSucceeds(setDoc(doc(db, 'users', 'alice'), { email: 'alice@research-square.com', displayName: 'Alice' }));
});

test('a company user cannot create another user\'s users doc', async () => {
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(setDoc(doc(db, 'users', 'bob'), { email: 'bob@research-square.com', displayName: 'Bob' }));
});

test('deleting a users doc is always denied, even for the owner', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', 'alice'), { email: 'alice@research-square.com', displayName: 'Alice' });
  });
  const db = companyDb('alice', 'alice@research-square.com');
  await assertFails(deleteDoc(doc(db, 'users', 'alice')));
});

for (const collection of ['categories', 'tasks', 'users']) {
  test(`unauthenticated read of ${collection} is rejected`, async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, collection, 'doc1')));
  });

  test(`a non-company-domain user cannot read ${collection}`, async () => {
    const db = companyDb('outsider', 'someone@gmail.com');
    await assertFails(getDoc(doc(db, collection, 'doc1')));
  });
}
