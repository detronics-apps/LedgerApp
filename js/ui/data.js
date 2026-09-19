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

export function listenSettings(cb) {
  return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
    cb(snap.exists() ? snap.data() : null);
  });
}

export function updateSettings(patch) {
  return setDoc(doc(db, 'settings', 'global'), patch, { merge: true });
}

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

/** Grants admin access to an existing user (by uid). The rules only allow this
 * when the caller is already an admin and `uid` has a `users` doc - i.e. the
 * target has signed in at least once. There is no corresponding "remove admin"
 * - that stays a manual Firebase-console step, same as bootstrapping the very
 * first admin. */
export function addAdmin(uid, email, categoryIds = []) {
  return setDoc(doc(db, 'admins', uid), { email, categoryIds });
}

/** Admin re-links a custom ("Other") entry to a real task/category. Only
 * category/task/weights/points change - impact, proof, description,
 * evidence, and the employee's own uid stay exactly as they logged it. The
 * rules independently enforce this same boundary (isRecategorizationOnly in
 * firestore.rules), so this is a convenience wrapper, not the real gate. */
export function relinkEntry(entry, category, task) {
  const taskWeight = task.weight ?? 1;
  const categoryWeight = category.weight ?? 1;
  return updateDoc(doc(db, 'entries', entry.id), {
    categoryId: category.id, categoryName: category.name,
    taskId: task.id, taskName: task.name,
    isCustomTask: false, customTaskName: '',
    taskWeight, categoryWeight,
    points: computePoints(entry.impact, entry.proof, taskWeight, categoryWeight),
    updatedAt: serverTimestamp(),
  });
}

/** Admin sets or clears someone's "formal R&R" exclusion flag (settings
 * .rrExclusionEnabled) - when set, this app's own submit flow blocks them
 * from logging entries. Rules independently only allow this exact field to
 * change (isExclusionFlagOnly). */
export function setUserExclusion(uid, excludedFromLedger) {
  return updateDoc(doc(db, 'users', uid), { excludedFromLedger });
}

/** Admin marks a high-scoring entry as validated (settings
 * .managementValidationEnabled). Rules independently only allow
 * validated/validatedAt to change on this path (isValidationOnly). */
export function validateEntry(entryId) {
  return updateDoc(doc(db, 'entries', entryId), { validated: true, validatedAt: serverTimestamp() });
}
