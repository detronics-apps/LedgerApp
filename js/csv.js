const HEADERS = ['Date', 'Person', 'Email', 'Category', 'Task', 'Impact', 'Proof', 'Points', 'Description', 'Evidence', 'Validated'];

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The full ledger as a CSV string, one row per entry - for an admin's own records, not shown in-app. */
export function entriesToCsv(entries) {
  const rows = entries.map((e) => [
    e.date,
    e.displayName,
    e.email,
    e.categoryName,
    e.isCustomTask ? (e.customTaskName || 'Other') : e.taskName,
    e.impact,
    e.proof,
    e.points,
    e.description,
    e.evidenceUrl,
    e.validated ? 'Yes' : 'No',
  ]);
  return [HEADERS, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');
}
