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
export const listenFlags = (cb) => listen('flags', cb);
export const listenAdmins = (cb) => listen('admins', cb);

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
 * target has signed in at least once. */
export function addAdmin(uid, email, categoryIds = []) {
  return setDoc(doc(db, 'admins', uid), { email, categoryIds });
}

/** Full admin revokes someone's admin access. Rules independently only allow
 * a full admin to do this, and never to revoke their own (no self-lockout) -
 * bootstrapping the very first admin is still a manual Firebase-console step,
 * since nobody can grant admin before at least one admin exists. */
export function removeAdmin(uid) {
  return deleteDoc(doc(db, 'admins', uid));
}

/** Admin re-links a custom ("Other") entry to a real task/category. Only
 * category/task/weights/points change - impact, proof, description,
 * evidence, and the employee's own uid stay exactly as they logged it. The
 * rules independently enforce this same boundary (isRecategorizationOnly in
 * firestore.rules), so this is a convenience wrapper, not the real gate. */
export function relinkEntry(entry, category, task, categoryWeight) {
  const taskWeight = task.weight ?? 1;
  return updateDoc(doc(db, 'entries', entry.id), {
    categoryId: category.id, categoryName: category.name,
    taskId: task.id, taskName: task.name,
    isCustomTask: false, customTaskName: '',
    taskWeight, categoryWeight,
    points: computePoints(entry.impact, entry.proof, taskWeight, categoryWeight),
    updatedAt: serverTimestamp(),
  });
}

/** Admin marks a high-scoring entry as validated (settings
 * .managementValidationEnabled). Rules independently only allow
 * validated/validatedAt to change on this path (isValidationOnly). */
export function validateEntry(entryId) {
  return updateDoc(doc(db, 'entries', entryId), { validated: true, validatedAt: serverTimestamp() });
}

/** A colleague flags someone else's entry for a second look (js/flags.js).
 * Its own collection, not fields on the entry, so more than one person can
 * independently flag the same entry - the doc id (one per person per entry)
 * is what lets a resubmission overwrite only that person's own prior flag.
 * Rules independently enforce it's not your own entry, and that any of your
 * own prior flags on it were already resolved (isFlagResubmission). */
export function submitFlag(entryId, categoryId, { reason, note, flaggedBy, flaggedByEmail }) {
  return setDoc(doc(db, 'flags', `${entryId}_${flaggedBy}`), {
    entryId, categoryId, reason, note: note || '',
    flaggedBy, flaggedByEmail, status: 'open', createdAt: serverTimestamp(),
  });
}

/** Admin moves a flag to 'under-review', 'updated', or 'rejected'. Rules
 * independently only allow status to change on this path
 * (isFlagStatusUpdate). */
export function setFlagStatus(flagId, status) {
  return updateDoc(doc(db, 'flags', flagId), { status });
}
