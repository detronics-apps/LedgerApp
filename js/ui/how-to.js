import { el } from './dom.js';
import { DEFAULT_SETTINGS } from '../limits.js';

function section(title, children) {
  return el('details', { class: 'panel explain', open: true }, [
    el('summary', { text: title }),
    ...children,
  ]);
}

function activeRules(settings) {
  const rules = [];
  if (settings.dailyEntryCapEnabled) {
    rules.push(`You can log up to ${settings.dailyEntryCap} ${settings.dailyEntryCap === 1 ? 'entry' : 'entries'} per day.`);
  }
  if (settings.fiveImpactOncePerWeekEnabled) {
    rules.push('A "company-shaping" (impact 5) contribution can only be logged once per week.');
  }
  if (settings.weeklyPointsCapEnabled) {
    rules.push(`There's a cap of ${settings.weeklyPointsCap} points per week.`);
  }
  if (settings.rrExclusionEnabled) {
    rules.push("If your role already has a formal responsibility for something, you can't also log it here - ask an admin if you're not sure.");
  }
  if (settings.managementValidationEnabled) {
    rules.push(`Entries worth ${settings.managementValidationThreshold}+ points get reviewed by management before they're finalised.`);
  }
  return rules;
}

export function buildHowTo(settings = DEFAULT_SETTINGS) {
  const rules = activeRules(settings);

  return el('div', {}, [
    section('How do I log an entry?', [
      el('ol', {}, [
        el('li', { text: 'Go to "Log Effort".' }),
        el('li', { text: 'Pick the Category that best matches what you did, then the specific Task under it.' }),
        el('li', { text: 'Nothing fits? Choose "Other - not listed" and describe it in a few words - an admin reviews these and either adds a real task for it or links it to one that already exists.' }),
        el('li', { text: 'Pick the date, rate the Impact and the Proof, write a short description, and add an evidence link if you have one.' }),
        el('li', { text: 'Submit. You can see and edit your own entries any time under "My Logs".' }),
      ]),
    ]),
    section('Logging rules', rules.length === 0
      ? [el('p', {}, 'No extra rules are active right now beyond the basics above - log what you did, as often as it happens.')]
      : [el('ul', {}, rules.map((r) => el('li', { text: r })))]),
    section('What happens to "Other" entries?', [
      el('p', {}, 'If what you did doesn\'t match any task on the list, log it under "Other - not listed" with a short description anyway - it still counts. An admin reviews these in the Custom Task Review queue and either adds it as a real task (so it\'s on the list for everyone next time) or links your entry to an existing task that already covers it.'),
    ]),
  ]);
}
