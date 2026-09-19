import { el } from './dom.js';
import { formatDate } from '../format.js';

export function buildReviewView(customEntries, { onPromote }) {
  if (customEntries.length === 0) {
    return el('div', { class: 'panel' }, el('p', { class: 'muted', text: 'No "Other" entries to review.' }));
  }

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Custom task review' }),
    el('p', { class: 'muted', text: 'Things employees logged that were not on the task list. Repeated ones are a signal to add a real task.' }),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Date', 'Person', 'Category', 'What they typed', 'Description', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, customEntries.map((entry) => el('tr', {}, [
        el('td', { text: formatDate(entry.date) }),
        el('td', { text: entry.displayName }),
        el('td', { text: entry.categoryName }),
        el('td', { text: entry.customTaskName || '(no name given)' }),
        el('td', { text: entry.description }),
        el('td', {}, el('button', {
          type: 'button', class: 'btn btn-primary', text: 'Add as a task',
          on: { click: () => onPromote(entry) },
        })),
      ]))),
    ]),
  ]);
}
