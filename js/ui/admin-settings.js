import { el, toast } from './dom.js';

function toggleRow(label, hint, checked, onToggle) {
  const checkbox = el('input', { type: 'checkbox', checked, on: { change: (e) => onToggle(e.target.checked) } });
  return el('div', { class: 'field' }, [
    el('label', { class: 'field__label' }, [checkbox, ` ${label}`]),
    hint ? el('div', { class: 'field__hint', text: hint }) : null,
  ]);
}

function numberRow(label, value, onChange) {
  const input = el('input', { type: 'number', min: '1', value, on: { change: (e) => onChange(Number(e.target.value)) } });
  return el('div', { class: 'field' }, [el('label', { class: 'field__label', text: label }), input]);
}

export function buildSettingsView(settings, onUpdate) {
  const save = (patch) => onUpdate(patch).then(() => toast('Saved.')).catch((err) => toast(err.message || 'Could not save.'));

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Pilot rules' }),
    el('p', { class: 'muted', text: 'Everything here is off by default. What you turn on here is described on the "How to use" page automatically. Note: these limits are enforced in this app\'s own logic, not independently re-checked by the server - see README "Known limitations".' }),

    toggleRow('Limit entries per day', null, settings.dailyEntryCapEnabled, (v) => save({ dailyEntryCapEnabled: v })),
    numberRow('Entries per day', settings.dailyEntryCap, (v) => save({ dailyEntryCap: v })),

    toggleRow('Limit "company-shaping" (impact 5) contributions to once per week', null, settings.fiveImpactOncePerWeekEnabled, (v) => save({ fiveImpactOncePerWeekEnabled: v })),

    toggleRow('Cap total points per week', null, settings.weeklyPointsCapEnabled, (v) => save({ weeklyPointsCapEnabled: v })),
    numberRow('Weekly point cap', settings.weeklyPointsCap, (v) => save({ weeklyPointsCap: v })),

    toggleRow('Exclude formal R&R holders', 'People flagged as "excluded" (set on the Admin Dashboard\'s per-person table) can\'t log entries while this is on.', settings.rrExclusionEnabled, (v) => save({ rrExclusionEnabled: v })),

    toggleRow('Hide names in the Company Ledger for regular employees', 'Admins still see names everywhere. This hides the name in this app\'s own display only - see README "Known limitations".', settings.anonymizeLedgerEnabled, (v) => save({ anonymizeLedgerEnabled: v })),

    toggleRow('Flag high-scoring entries for management validation', null, settings.managementValidationEnabled, (v) => save({ managementValidationEnabled: v })),
    numberRow('Validation threshold (points)', settings.managementValidationThreshold, (v) => save({ managementValidationThreshold: v })),
  ]);
}
