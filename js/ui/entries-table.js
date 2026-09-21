import { el, select } from './dom.js';
import { formatDate, formatPoints } from '../format.js';
import { FLAG_REASONS } from '../flags.js';

function buildFlagForm(entry, colspan, onFlag) {
  const reasonSelect = select(FLAG_REASONS, FLAG_REASONS[0].value, () => {});
  const noteInput = el('input', { type: 'text', placeholder: 'Optional note - what makes you think so?' });
  const row = el('tr', { class: 'flag-form-row' });
  row.style.display = 'none';
  const cancelBtn = el('button', {
    type: 'button', class: 'btn', text: 'Cancel',
    on: { click: () => { row.style.display = 'none'; } },
  });
  const submitBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Submit flag',
    on: {
      click: () => {
        submitBtn.disabled = true;
        onFlag(entry, { reason: reasonSelect.value, note: noteInput.value }).finally(() => { submitBtn.disabled = false; });
      },
    },
  });
  row.appendChild(el('td', { colspan: String(colspan) }, el('div', { class: 'field' }, [
    reasonSelect, noteInput, submitBtn, cancelBtn,
  ])));
  return row;
}

export function buildEntriesTable(entries, {
  showOwner = true, showPoints = true,
  onEdit = null, onDelete = null, onRelog = null, onFlag = null, currentUid = null, hasMyActiveFlag = () => false,
  anonymize = false,
} = {}) {
  if (entries.length === 0) {
    return el('p', { class: 'muted', text: 'Nothing logged yet.' });
  }

  const headers = ['Date', 'Category', 'Task', 'Impact', 'Proof', 'Description'];
  if (showPoints) headers.splice(5, 0, 'Points');
  if (showOwner) headers.splice(1, 0, 'Person');
  if (onEdit || onDelete || onRelog || onFlag) headers.push('');

  const rows = [];
  for (const entry of entries) {
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
      ...(showPoints ? [el('td', { class: 'value', text: formatPoints(entry.points) })] : []),
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

    // Whether an entry has been flagged is never shown here - not to other
    // employees, not to the entry's own owner. Only admins (Admin Dashboard)
    // and the person who raised a flag (their own "My Logs" panel) see it.
    const canFlagThis = onFlag && entry.uid !== currentUid && !hasMyActiveFlag(entry);
    const flagRow = canFlagThis ? buildFlagForm(entry, headers.length, onFlag) : null;

    if (onEdit || onDelete || onRelog || onFlag) {
      cells.push(el('td', {}, [
        onRelog ? el('button', {
          type: 'button', class: 'btn', text: 'Relog',
          title: 'Start a new entry pre-filled from this one, dated today.',
          on: { click: () => onRelog(entry) },
        }) : null,
        onEdit ? el('button', { type: 'button', class: 'btn', text: 'Edit', on: { click: () => onEdit(entry) } }) : null,
        flagRow ? el('button', {
          type: 'button', class: 'btn btn-icon', 'aria-label': 'Flag this entry for a second look',
          title: 'Ask for a second look on this entry - not an accusation, just a check.',
          on: { click: () => { flagRow.style.display = flagRow.style.display === 'none' ? 'table-row' : 'none'; } },
        }, el('span', { 'aria-hidden': 'true', text: '⚑' })) : null,
        onDelete ? el('button', {
          type: 'button', class: 'btn btn-danger', text: 'Delete',
          on: { click: () => { if (confirm('Delete this entry? This cannot be undone.')) onDelete(entry); } },
        }) : null,
      ]));
    }
    rows.push(el('tr', {}, cells));
    if (flagRow) rows.push(flagRow);
  }

  return el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows),
  ]));
}
