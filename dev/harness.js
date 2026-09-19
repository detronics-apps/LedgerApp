import { buildLogForm } from '../js/ui/log-form.js';
import { computePoints } from '../js/scoring.js';

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
