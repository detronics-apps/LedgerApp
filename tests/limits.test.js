import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSubmissionLimits, DEFAULT_SETTINGS, categoryWeightFor, summarizeRecentActivity } from '../js/limits.js';

const base = {
  impact: 3, prospectivePoints: 6,
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

test('multiple violated limits are all reported', () => {
  const settings = { ...DEFAULT_SETTINGS, dailyEntryCapEnabled: true, dailyEntryCap: 1, weeklyPointsCapEnabled: true, weeklyPointsCap: 5 };
  const result = checkSubmissionLimits({ ...base, settings, todayCount: 1, weekPoints: 5, prospectivePoints: 6 });
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

test('summarizeRecentActivity: todayCount only counts entries dated the same day - not submission day', () => {
  // Three entries all "created" (submitted) on the same day, but for three
  // different dates worked - catching up on a backlog. Each date's own
  // count should reflect only itself, not the other two.
  const entries = [
    { date: '2026-09-15', points: 4, impact: 2 },
    { date: '2026-09-16', points: 5, impact: 3 },
    { date: '2026-09-17', points: 6, impact: 4 },
  ];
  assert.equal(summarizeRecentActivity(entries, '2026-09-15').todayCount, 1);
  assert.equal(summarizeRecentActivity(entries, '2026-09-16').todayCount, 1);
  assert.equal(summarizeRecentActivity(entries, '2026-09-18').todayCount, 0);
});

test('summarizeRecentActivity: todayCount blocks multiple entries piled on the same single date', () => {
  const entries = [
    { date: '2026-09-15', points: 4, impact: 2 },
    { date: '2026-09-15', points: 5, impact: 3 },
  ];
  assert.equal(summarizeRecentActivity(entries, '2026-09-15').todayCount, 2);
});

test('summarizeRecentActivity: weekPoints and weekUsedFiveImpact are scoped to the Mon-Sun week of the given date', () => {
  // 2026-09-14 is a Monday; the week runs through Sunday 2026-09-20.
  const entries = [
    { date: '2026-09-14', points: 3, impact: 2 }, // in week
    { date: '2026-09-20', points: 4, impact: 5 }, // in week (Sunday)
    { date: '2026-09-21', points: 10, impact: 5 }, // next week - excluded
    { date: '2026-09-13', points: 10, impact: 5 }, // previous week - excluded
  ];
  const result = summarizeRecentActivity(entries, '2026-09-16');
  assert.equal(result.weekPoints, 7);
  assert.equal(result.weekUsedFiveImpact, true);
});

test('summarizeRecentActivity: weekUsedFiveImpact is false when no impact-5 entry falls in the week', () => {
  const entries = [{ date: '2026-09-16', points: 3, impact: 3 }];
  assert.equal(summarizeRecentActivity(entries, '2026-09-16').weekUsedFiveImpact, false);
});
