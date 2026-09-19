import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { computePoints } from '../scoring.js';

function withPoints(payload) {
  return {
    ...payload,
    points: computePoints(payload.impact, payload.proof, payload.taskWeight, payload.categoryWeight),
  };
}

export function createEntry(payload) {
  return addDoc(collection(db, 'entries'), {
    ...withPoints(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateEntry(id, payload) {
  return updateDoc(doc(db, 'entries', id), { ...withPoints(payload), updatedAt: serverTimestamp() });
}

export function deleteEntry(id) {
  return deleteDoc(doc(db, 'entries', id));
}

function listen(collectionName, cb) {
  return onSnapshot(collection(db, collectionName), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export const listenEntries = (cb) => listen('entries', cb);
export const listenCategories = (cb) => listen('categories', cb);
export const listenTasks = (cb) => listen('tasks', cb);
export const listenUsers = (cb) => listen('users', cb);

export function createCategory(data) {
  return addDoc(collection(db, 'categories'), { weight: 1, archived: false, ...data });
}
export function updateCategory(id, patch) {
  return updateDoc(doc(db, 'categories', id), patch);
}
export function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id));
}

export function createTask(data) {
  return addDoc(collection(db, 'tasks'), { weight: 1, archived: false, ...data });
}
export function updateTask(id, patch) {
  return updateDoc(doc(db, 'tasks', id), patch);
}
export function deleteTask(id) {
  return deleteDoc(doc(db, 'tasks', id));
}
