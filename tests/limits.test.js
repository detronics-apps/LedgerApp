import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubmissionLimits, DEFAULT_SETTINGS, categoryWeightFor } from '../js/limits.js';

const base = {
  impact: 3, prospectivePoints: 6, isExcluded: false,
  settings: DEFAULT_SETTINGS, todayCount: 0, weekPoints: 0, weekUsedFiveImpact: false,
};

test('all limits off allows anything', () => {
  const result = checkSubmissionLimits({ ...base, todayCount: 50, weekPoints: 1000, impact: 5, weekUsedFiveImpact: true });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.errors, []);
});

test('daily cap blocks once reached', () => {
  const settings = { ...DEFAULT_SETTINGS, dailyEntryCapEnabled: true, dailyEntryCap: 1 };
  assert.equal(checkSubmissionLimits({ ...base, settings, todayCount: 0 }).allowed, true);
  const blocked = checkSubmissionLimits({ ...base, settings, todayCount: 1 });
  assert.equal(blocked.allowed, false);
  assert.match(blocked.errors[0], /today's limit of 1 entry/);
});

test('five-impact-once-per-week only blocks impact 5 after one already used', () => {
  const settings = { ...DEFAULT_SETTINGS, fiveImpactOncePerWeekEnabled: true };
  assert.equal(checkSubmissionLimits({ ...base, settings, impact: 5, weekUsedFiveImpact: false }).allowed, true);
  assert.equal(checkSubmissionLimits({ ...base, settings, impact: 3, weekUsedFiveImpact: true }).allowed, true);
  assert.equal(checkSubmissionLimits({ ...base, settings, impact: 5, weekUsedFiveImpact: true }).allowed, false);
});

test('weekly points cap blocks when the new entry would exceed it', () => {
  const settings = { ...DEFAULT_SETTINGS, weeklyPointsCapEnabled: true, weeklyPointsCap: 39 };
  assert.equal(checkSubmissionLimits({ ...base, settings, weekPoints: 33, prospectivePoints: 6 }).allowed, true);
  assert.equal(checkSubmissionLimits({ ...base, settings, weekPoints: 34, prospectivePoints: 6 }).allowed, false);
});

test('rrExclusion blocks an excluded person regardless of other settings', () => {
  const settings = { ...DEFAULT_SETTINGS, rrExclusionEnabled: true };
  const result = checkSubmissionLimits({ ...base, settings, isExcluded: true });
  assert.equal(result.allowed, false);
  assert.equal(result.errors.length, 1);
});

test('multiple violated limits are all reported', () => {
  const settings = { ...DEFAULT_SETTINGS, dailyEntryCapEnabled: true, dailyEntryCap: 1, rrExclusionEnabled: true };
  const result = checkSubmissionLimits({ ...base, settings, todayCount: 1, isExcluded: true });
  assert.equal(result.allowed, false);
  assert.equal(result.errors.length, 2);
});

test('categoryWeightFor looks up the weight for the category\'s contribution type', () => {
  assert.equal(categoryWeightFor({ contributionType: 'cultural' }, DEFAULT_SETTINGS), 1);
  assert.equal(categoryWeightFor({ contributionType: 'operational' }, DEFAULT_SETTINGS), 1.5);
  assert.equal(categoryWeightFor({ contributionType: 'leadership' }, DEFAULT_SETTINGS), 2);
});

test('categoryWeightFor defaults to operational when unassigned', () => {
  assert.equal(categoryWeightFor({}, DEFAULT_SETTINGS), 1.5);
  assert.equal(categoryWeightFor(null, DEFAULT_SETTINGS), 1.5);
});
