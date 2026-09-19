import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatPoints, formatPercent } from '../js/format.js';

test('formatDate renders a YYYY-MM-DD string as "D Mon YYYY", no timezone shift', () => {
  assert.equal(formatDate('2026-09-17'), '17 Sep 2026');
  assert.equal(formatDate('2026-01-01'), '1 Jan 2026');
  assert.equal(formatDate('2026-12-31'), '31 Dec 2026');
});

test('formatPoints trims a trailing .0 but keeps real decimals', () => {
  assert.equal(formatPoints(6), '6');
  assert.equal(formatPoints(6.0), '6');
  assert.equal(formatPoints(7.5), '7.5');
  assert.equal(formatPoints(9), '9');
});

test('formatPercent rounds to the given number of digits', () => {
  assert.equal(formatPercent(2 / 3, 0), '67%');
  assert.equal(formatPercent(2 / 3, 1), '66.7%');
  assert.equal(formatPercent(0.25), '25%');
});
