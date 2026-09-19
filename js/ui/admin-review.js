import { el, select, clear } from './dom.js';
import { formatDate } from '../format.js';

function buildLinkControl(entry, categories, tasks, onLink) {
  if (categories.length === 0) return el('span', { class: 'muted', text: 'No categories yet.' });

  let selectedCategoryId = categories[0].id;
  const taskSelectHost = el('span');

  function renderTaskOptions() {
    clear(taskSelectHost);
    const options = tasks.filter((t) => t.categoryId === selectedCategoryId);
    taskSelectHost.appendChild(select(
      options.map((t) => ({ value: t.id, label: t.name })),
      options[0]?.id ?? '',
      () => {},
    ));
  }

  const categorySelect = select(
    categories.map((c) => ({ value: c.id, label: c.name })),
    selectedCategoryId,
    (value) => { selectedCategoryId = value; renderTaskOptions(); },
  );
  renderTaskOptions();

  const linkBtn = el('button', {
    type: 'button', class: 'btn', text: 'Link',
    on: {
      click: () => {
        const taskSelect = taskSelectHost.querySelector('select');
        if (!taskSelect || !taskSelect.value) return;
        onLink(entry, selectedCategoryId, taskSelect.value);
      },
    },
  });

  return el('div', { class: 'field' }, [categorySelect, taskSelectHost, linkBtn]);
}

export function buildReviewView(customEntries, { onPromote, onLink, categories = [], tasks = [] }) {
  if (customEntries.length === 0) {
    return el('div', { class: 'panel' }, el('p', { class: 'muted', text: 'No "Other" entries to review.' }));
  }

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Custom task review' }),
    el('p', { class: 'muted', text: 'Things employees logged that were not on the task list. Add a new task if this keeps coming up, or link it to an existing task if it already fits one - either way, the employee\'s own impact/proof/points never change.' }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Date', 'Person', 'Category', 'What they typed', 'Description', 'Add as new', 'Link to existing'].map((h) => el('th', { text: h })))),
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
        el('td', {}, buildLinkControl(entry, categories, tasks, onLink)),
      ]))),
    ])),
  ]);
}
