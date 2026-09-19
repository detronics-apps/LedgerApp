import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEntries, summarizeParticipation } from '../js/stats.js';

const entries = [
  { uid: 'a', categoryName: 'Culture', taskName: 'Team event', isCustomTask: false, impact: 3, proof: 2, points: 6 },
  { uid: 'a', categoryName: 'Culture', taskName: 'Team event', isCustomTask: false, impact: 1, proof: 1, points: 1 },
  { uid: 'b', categoryName: 'Learning & Capability', taskName: 'Career Mentorship', isCustomTask: false, impact: 1, proof: 1, points: 1 },
  { uid: 'b', categoryName: 'Learning & Capability', taskName: '', isCustomTask: true, impact: 5, proof: 3, points: 15 },
];

test('summarizeEntries totals, means and medians points correctly', () => {
  const s = summarizeEntries(entries);
  assert.equal(s.entryCount, 4);
  assert.equal(s.totalPoints, 23);
  assert.equal(s.meanPoints, 5.75);
  assert.equal(s.medianPoints, 3.5); // sorted [1,1,6,15] -> (1+6)/2
});

test('summarizeEntries groups by category, sorted by count desc', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.categoryBreakdown, [
    { categoryName: 'Culture', count: 2, totalPoints: 7 },
    { categoryName: 'Learning & Capability', count: 2, totalPoints: 16 },
  ]);
});

test('summarizeEntries groups custom tasks under "Other" in the task breakdown', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.taskBreakdown, [
    { taskName: 'Team event', count: 2, totalPoints: 7 },
    { taskName: 'Career Mentorship', count: 1, totalPoints: 1 },
    { taskName: 'Other', count: 1, totalPoints: 15 },
  ]);
});

test('summarizeEntries builds full impact (1-5) and proof (1-3) distributions', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.impactDistribution, { 1: 2, 2: 0, 3: 1, 4: 0, 5: 1 });
  assert.deepEqual(s.proofDistribution, { 1: 2, 2: 1, 3: 1 });
});

test('summarizeEntries reports the custom-task rate', () => {
  const s = summarizeEntries(entries);
  assert.equal(s.customTaskCount, 1);
  assert.equal(s.customTaskRate, 0.25);
});

test('summarizeEntries on an empty array returns zeros, not NaN', () => {
  const s = summarizeEntries([]);
  assert.equal(s.entryCount, 0);
  assert.equal(s.meanPoints, 0);
  assert.equal(s.medianPoints, 0);
  assert.equal(s.customTaskRate, 0);
});

test('summarizeParticipation reports headcount, contributors and rate', () => {
  const p = summarizeParticipation(entries, ['a', 'b', 'c']);
  assert.equal(p.totalUsers, 3);
  assert.equal(p.contributors, 2);
  assert.equal(p.participationRate, 2 / 3);
  assert.equal(p.avgEntriesPerContributor, 2);
  assert.equal(p.medianEntriesPerContributor, 2);
});
