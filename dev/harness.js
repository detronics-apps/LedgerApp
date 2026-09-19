import { buildLogForm } from '../js/ui/log-form.js';
import { computePoints } from '../js/scoring.js';
import { buildEntriesTable } from '../js/ui/entries-table.js';
import { el } from '../js/ui/dom.js';

const categories = [
  { id: 'culture', name: 'Culture' },
  { id: 'learning-capability', name: 'Learning & Capability' },
];
const tasks = [
  { id: 'culture--team-event', categoryId: 'culture', name: 'Team Culture' },
  { id: 'learning-capability--career-mentorship', categoryId: 'learning-capability', name: 'Career Mentorship' },
];

const mount = document.getElementById('mount');
mount.appendChild(buildLogForm({
  categories, tasks,
  onSubmit: (draft) => {
    console.log('submitted draft', draft);
    const points = computePoints(draft.impact, draft.proof, 1, 1);
    return Promise.resolve({ points });
  },
}));

const mockEntries = [
  { id: '1', date: '2026-09-17', categoryName: 'Culture', taskName: 'Team Culture', isCustomTask: false, impact: 3, proof: 2, points: 6, description: 'Organised a team lunch.', evidenceUrl: '', displayName: 'Alice', uid: 'alice' },
  { id: '2', date: '2026-09-18', categoryName: 'Learning & Capability', taskName: '', isCustomTask: true, impact: 5, proof: 3, points: 15, description: 'Fixed the coffee machine and wrote a guide.', evidenceUrl: 'https://example.com/guide', displayName: 'Bob', uid: 'bob' },
];

document.getElementById('mount').appendChild(el('div', { class: 'panel' }, [
  el('h3', { text: 'Company Ledger (read-only)' }),
  buildEntriesTable(mockEntries),
]));
document.getElementById('mount').appendChild(el('div', { class: 'panel' }, [
  el('h3', { text: 'My Logs (editable)' }),
  buildEntriesTable(mockEntries.filter((e) => e.uid === 'alice'), {
    showOwner: false,
    onEdit: (entry) => console.log('edit', entry),
    onDelete: (entry) => console.log('delete', entry),
  }),
]));
