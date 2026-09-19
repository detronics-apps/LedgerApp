import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePoints, IMPACT_LEVELS, PROOF_LEVELS } from '../js/scoring.js';

test('computePoints multiplies impact, proof and both weights', () => {
  assert.equal(computePoints(1, 1, 1, 1), 1);
  assert.equal(computePoints(3, 2, 1, 1), 6);
  assert.equal(computePoints(5, 3, 1, 1), 15);
  assert.equal(computePoints(3, 2, 1.5, 1), 9);
  assert.equal(computePoints(3, 2, 1, 2), 12);
});

test('computePoints defaults both weights to 1 when omitted', () => {
  assert.equal(computePoints(4, 2), 8);
});

test('IMPACT_LEVELS has five entries, values 1 through 5, each with a description', () => {
  assert.equal(IMPACT_LEVELS.length, 5);
  assert.deepEqual(IMPACT_LEVELS.map((l) => l.value), [1, 2, 3, 4, 5]);
  for (const level of IMPACT_LEVELS) {
    assert.equal(typeof level.label, 'string');
    assert.ok(level.description.length > 0);
  }
});

test('PROOF_LEVELS has three entries, values 1 through 3', () => {
  assert.equal(PROOF_LEVELS.length, 3);
  assert.deepEqual(PROOF_LEVELS.map((l) => l.value), [1, 2, 3]);
});
