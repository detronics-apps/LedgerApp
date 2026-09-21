import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entriesToCsv } from '../js/csv.js';

const entry = {
  date: '2026-09-21', displayName: 'Jane Doe', email: 'jane@research-square.com',
  categoryName: 'Engineering Excellence', isCustomTask: false, taskName: 'Fixed a bug',
  impact: 3, proof: 2, points: 6, description: 'Fixed the flaky test.', evidenceUrl: '', validated: false,
};

test('an empty ledger is just the header row', () => {
  assert.equal(entriesToCsv([]), 'Date,Person,Email,Category,Task,Impact,Proof,Points,Description,Evidence,Validated');
});

test('a plain entry becomes a comma-joined row', () => {
  const csv = entriesToCsv([entry]);
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.equal(lines[1], '2026-09-21,Jane Doe,jane@research-square.com,Engineering Excellence,Fixed a bug,3,2,6,Fixed the flaky test.,,No');
});

test('a custom task falls back to its custom name, or "Other"', () => {
  const csv = entriesToCsv([{ ...entry, isCustomTask: true, customTaskName: 'Organised a team lunch' }]);
  assert.match(csv, /Organised a team lunch/);
  const untitled = entriesToCsv([{ ...entry, isCustomTask: true, customTaskName: '' }]);
  assert.match(untitled, /,Other,/);
});

test('a description with a comma, quote and newline is quoted and escaped', () => {
  const csv = entriesToCsv([{ ...entry, description: 'Said "hi", then\nleft.' }]);
  assert.match(csv, /"Said ""hi"", then\nleft\."/);
});

test('validated entries are marked Yes', () => {
  const csv = entriesToCsv([{ ...entry, validated: true }]);
  assert.match(csv, /,Yes$/m);
});
