const FULL_HEADERS = ['Date', 'Person', 'Email', 'Category', 'Task', 'Impact', 'Proof', 'Points', 'Description', 'Evidence', 'Validated'];
const PERSONAL_HEADERS = ['Date', 'Category', 'Task', 'Impact', 'Proof', 'Points', 'Description', 'Evidence', 'Validated'];

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function entryRow(e, includePerson) {
  const row = [
    e.date,
    e.categoryName,
    e.isCustomTask ? (e.customTaskName || 'Other') : e.taskName,
    e.impact,
    e.proof,
    e.points,
    e.description,
    e.evidenceUrl,
    e.validated ? 'Yes' : 'No',
  ];
  return includePerson ? [e.date, e.displayName, e.email, ...row.slice(1)] : row;
}

/**
 * The ledger as a CSV string, one row per entry - for an admin's own records, not shown in-app.
 * Pass `ownerEmail` for a single person's own export: Person/Email are dropped from every row
 * (they'd just repeat the same value) and the email is stated once up top instead.
 */
export function entriesToCsv(entries, { ownerEmail = null } = {}) {
  const includePerson = !ownerEmail;
  const headers = includePerson ? FULL_HEADERS : PERSONAL_HEADERS;
  const lines = [headers, ...entries.map((e) => entryRow(e, includePerson))]
    .map((row) => row.map(csvEscape).join(','));
  if (ownerEmail) lines.unshift(`Export for: ${csvEscape(ownerEmail)}`, '');
  return lines.join('\r\n');
}
