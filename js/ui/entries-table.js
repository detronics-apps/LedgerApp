import { el } from './dom.js';
import { formatDate, formatPoints } from '../format.js';

export function buildEntriesTable(entries, { showOwner = true, onEdit = null, onDelete = null, anonymize = false } = {}) {
  if (entries.length === 0) {
    return el('p', { class: 'muted', text: 'Nothing logged yet.' });
  }

  const headers = ['Date', 'Category', 'Task', 'Impact', 'Proof', 'Points', 'Description'];
  if (showOwner) headers.splice(1, 0, 'Person');
  if (onEdit || onDelete) headers.push('');

  const rows = entries.map((entry) => {
    // Evidence can be a real link or just descriptive text ("ask Sam, she was
    // in the meeting"). Never build an anchor from an unvalidated href -
    // only something that actually looks like a http(s) link renders as a
    // clickable link; anything else renders as plain text, never as an <a>.
    const evidenceIsLink = /^https?:\/\//i.test(entry.evidenceUrl || '');
    const cells = [
      el('td', { text: formatDate(entry.date) }),
      el('td', { text: entry.categoryName }),
      el('td', {}, [
        entry.isCustomTask ? (entry.customTaskName || 'Untitled') : entry.taskName,
        entry.isCustomTask ? el('span', { class: 'badge', text: 'Other' }) : null,
      ]),
      el('td', { text: String(entry.impact) }),
      el('td', { text: String(entry.proof) }),
      el('td', { class: 'value', text: formatPoints(entry.points) }),
      el('td', {}, [
        entry.description,
        !entry.evidenceUrl ? null
          : evidenceIsLink
            ? el('a', { href: entry.evidenceUrl, target: '_blank', rel: 'noopener', text: ' [evidence]' })
            : el('span', { class: 'muted', text: ` (${entry.evidenceUrl})` }),
      ]),
    ];
    if (showOwner) {
      const personLabel = anonymize ? `Employee ${(entry.uid || '').slice(-4)}` : entry.displayName;
      cells.splice(1, 0, el('td', { text: personLabel }));
    }
    if (onEdit || onDelete) {
      cells.push(el('td', {}, [
        onEdit ? el('button', { type: 'button', class: 'btn', text: 'Edit', on: { click: () => onEdit(entry) } }) : null,
        onDelete ? el('button', {
          type: 'button', class: 'btn btn-danger', text: 'Delete',
          on: { click: () => { if (confirm('Delete this entry? This cannot be undone.')) onDelete(entry); } },
        }) : null,
      ]));
    }
    return el('tr', {}, cells);
  });

  return el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows),
  ]));
}
