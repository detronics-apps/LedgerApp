import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_REASONS, FLAG_STATUSES, flagReasonLabel, flagStatusLabel, isActiveFlag, hasActiveFlagFrom } from '../js/flags.js';

test('FLAG_REASONS and FLAG_STATUSES have distinct values', () => {
  assert.equal(new Set(FLAG_REASONS.map((r) => r.value)).size, FLAG_REASONS.length);
  assert.equal(new Set(FLAG_STATUSES.map((s) => s.value)).size, FLAG_STATUSES.length);
});

test('flagReasonLabel and flagStatusLabel look up known values', () => {
  assert.equal(flagReasonLabel('duplicate'), 'Looks like a duplicate');
  assert.equal(flagStatusLabel('under-review'), 'Under review');
});

test('flagReasonLabel and flagStatusLabel fall back to the raw value', () => {
  assert.equal(flagReasonLabel('made-up'), 'made-up');
  assert.equal(flagStatusLabel('made-up'), 'made-up');
});

test('isActiveFlag: open and under-review are active, updated and rejected are not', () => {
  assert.equal(isActiveFlag({ status: 'open' }), true);
  assert.equal(isActiveFlag({ status: 'under-review' }), true);
  assert.equal(isActiveFlag({ status: 'updated' }), false);
  assert.equal(isActiveFlag({ status: 'rejected' }), false);
});

test('hasActiveFlagFrom: true only for that uid\'s own active flag on that entry', () => {
  const flags = [
    { entryId: 'e1', flaggedBy: 'u1', status: 'open' },
    { entryId: 'e1', flaggedBy: 'u2', status: 'open' },
    { entryId: 'e2', flaggedBy: 'u1', status: 'rejected' },
  ];
  assert.equal(hasActiveFlagFrom(flags, 'e1', 'u1'), true);
  assert.equal(hasActiveFlagFrom(flags, 'e1', 'u3'), false);
  assert.equal(hasActiveFlagFrom(flags, 'e2', 'u1'), false);
});

test('hasActiveFlagFrom: different people can each have an independent active flag on the same entry', () => {
  const flags = [
    { entryId: 'e1', flaggedBy: 'u1', status: 'open' },
    { entryId: 'e1', flaggedBy: 'u2', status: 'open' },
  ];
  assert.equal(hasActiveFlagFrom(flags, 'e1', 'u1'), true);
  assert.equal(hasActiveFlagFrom(flags, 'e1', 'u2'), true);
});
