/** Pure submission-limit checks. All enforcement here is client-side only
 * (see README "Known limitations") - these functions decide what the app
 * shows/blocks in its own UI, they are not a security boundary. */

export function checkSubmissionLimits({ impact, prospectivePoints, settings, todayCount, weekPoints, weekUsedFiveImpact }) {
  const errors = [];

  if (settings.dailyEntryCapEnabled && todayCount >= settings.dailyEntryCap) {
    errors.push(`You've reached today's limit of ${settings.dailyEntryCap} ${settings.dailyEntryCap === 1 ? 'entry' : 'entries'}.`);
  }
  if (settings.fiveImpactOncePerWeekEnabled && impact === 5 && weekUsedFiveImpact) {
    errors.push('You can only log one company-shaping (impact 5) contribution per week.');
  }
  if (settings.weeklyPointsCapEnabled && (weekPoints + prospectivePoints) > settings.weeklyPointsCap) {
    errors.push(`This would take you over this week's ${settings.weeklyPointsCap}-point limit.`);
  }

  return { allowed: errors.length === 0, errors };
}

export const DEFAULT_SETTINGS = {
  dailyEntryCapEnabled: false, dailyEntryCap: 1,
  weeklyPointsCapEnabled: false, weeklyPointsCap: 39,
  fiveImpactOncePerWeekEnabled: false,
  anonymizeLedgerEnabled: false,
  managementValidationEnabled: false, managementValidationThreshold: 15,
  contributionWeights: { cultural: 1, operational: 1.5, leadership: 2 },
};

// Local-safe YYYY-MM-DD formatting: toISOString() converts to UTC, which
// silently shifts the date backward a day for anyone in a positive UTC
// offset (e.g. UTC+2) - construct and read the Date in local time throughout
// instead of round-tripping through UTC.
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfWeekStr(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  return toDateStr(date);
}

function endOfWeekStr(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() + (6 - day));
  return toDateStr(date);
}

/** How many of a person's own entries already fall on the same date as the
 * one they're about to submit, and how their week (by that same date's
 * Mon-Sun week) looks so far - keyed on the entry's own "when did you do
 * it" date, not on when they hit submit. This is deliberate: the caps exist
 * to stop someone overloading a single day, not to stop someone catching up
 * on a backlog of different days' entries in one sitting - those are
 * different days of work and shouldn't collide. */
export function summarizeRecentActivity(entries, forDate) {
  const todayCount = entries.filter((e) => e.date === forDate).length;
  const weekStart = startOfWeekStr(forDate);
  const weekEnd = endOfWeekStr(forDate);
  const thisWeek = entries.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  return {
    todayCount,
    weekPoints: thisWeek.reduce((sum, e) => sum + e.points, 0),
    weekUsedFiveImpact: thisWeek.some((e) => e.impact === 5),
  };
}

export const CONTRIBUTION_TYPES = [
  { value: 'cultural', label: 'Cultural' },
  { value: 'operational', label: 'Operational' },
  { value: 'leadership', label: 'Leadership' },
];

/** Every category is assigned one of the three contribution types (js/ui/admin-manage.js);
 * that type's weight (settings.contributionWeights, admin-adjustable) replaces a per-category
 * weight in the points formula. Unassigned categories default to 'operational'. */
export function categoryWeightFor(category, settings) {
  const type = category?.contributionType ?? 'operational';
  return settings.contributionWeights?.[type] ?? 1;
}
