/** Pure submission-limit checks. All enforcement here is client-side only
 * (see README "Known limitations") - these functions decide what the app
 * shows/blocks in its own UI, they are not a security boundary. */

export function checkSubmissionLimits({ impact, prospectivePoints, isExcluded, settings, todayCount, weekPoints, weekUsedFiveImpact }) {
  const errors = [];

  if (settings.rrExclusionEnabled && isExcluded) {
    errors.push("Your role already covers this as a formal responsibility - it can't also earn ledger points.");
  }
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
  rrExclusionEnabled: false,
  anonymizeLedgerEnabled: false,
  managementValidationEnabled: false, managementValidationThreshold: 15,
  contributionWeights: { cultural: 1, operational: 1.5, leadership: 2 },
};

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
