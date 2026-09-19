// One-time upload of seed/tasks-and-categories.json into a real Firestore
// project. Dev-only - never runs in the shipped app.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed/seed.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const data = JSON.parse(readFileSync(new URL('./tasks-and-categories.json', import.meta.url)));

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const batch = db.batch();
for (const category of data.categories) {
  batch.set(db.collection('categories').doc(category.id), category);
}
for (const task of data.tasks) {
  batch.set(db.collection('tasks').doc(task.id), task);
}
await batch.commit();
console.log(`Seeded ${data.categories.length} categories and ${data.tasks.length} tasks.`);
