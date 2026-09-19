import { buildLogForm } from '../js/ui/log-form.js';
import { computePoints } from '../js/scoring.js';
import { buildEntriesTable } from '../js/ui/entries-table.js';
import { el } from '../js/ui/dom.js';
import { buildStatsView } from '../js/ui/stats-view.js';
import { summarizeEntries, summarizeParticipation } from '../js/stats.js';
import { buildManageView } from '../js/ui/admin-manage.js';
import { buildReviewView } from '../js/ui/admin-review.js';

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

const summary = summarizeEntries(mockEntries);
const participation = summarizeParticipation(mockEntries, ['alice', 'bob', 'carol']);
document.getElementById('mount').appendChild(buildStatsView(summary, participation));

const mockCategories = [
  { id: 'culture', name: 'Culture', description: '', weight: 1, archived: false, entryCount: 1 },
];
const mockTasks = [
  { id: 'culture--team-event', categoryId: 'culture', name: 'Team Culture', description: 'Team events', weight: 1, archived: false, entryCount: 1 },
];

document.getElementById('mount').appendChild(buildManageView({
  categories: mockCategories, tasks: mockTasks,
  onCreateCategory: (c) => { console.log('create category', c); return Promise.resolve(); },
  onUpdateCategory: (id, patch) => { console.log('update category', id, patch); return Promise.resolve(); },
  onDeleteCategory: (id) => { console.log('delete category', id); return Promise.resolve(); },
  onCreateTask: (t) => { console.log('create task', t); return Promise.resolve(); },
  onUpdateTask: (id, patch) => { console.log('update task', id, patch); return Promise.resolve(); },
  onDeleteTask: (id) => { console.log('delete task', id); return Promise.resolve(); },
}));

const mockCustomEntries = [
  { date: '2026-09-18', displayName: 'Bob', categoryName: 'Learning & Capability', customTaskName: 'Fixed the coffee machine', description: 'Fixed the coffee machine and wrote a guide.' },
];
document.getElementById('mount').appendChild(buildReviewView(mockCustomEntries, {
  onPromote: (entry) => { console.log('promote', entry); return Promise.resolve(); },
}));
