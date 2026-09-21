import { el, field, select, clear, toast } from './dom.js';
import { CONTRIBUTION_TYPES } from '../limits.js';

function textField(value) {
  return el('textarea', { rows: '2', text: value });
}

function rowActions(item, onSave, onToggleArchive, onDelete) {
  return el('td', {}, el('div', { class: 'row-actions' }, [
    el('button', { type: 'button', class: 'btn', text: 'Save', on: { click: onSave } }),
    el('button', {
      type: 'button', class: 'btn', text: item.archived ? 'Restore' : 'Archive',
      title: item.archived ? 'Make this visible on the log-entry form again.' : 'Hide from the log-entry form, without deleting its history.',
      on: { click: onToggleArchive },
    }),
    onDelete ? el('button', {
      type: 'button', class: 'btn btn-danger', text: 'Delete',
      disabled: item.entryCount > 0,
      title: item.entryCount > 0 ? 'Has logged entries - archive instead of deleting.' : '',
      on: { click: () => { if (confirm('Delete this permanently? This cannot be undone - archive it instead if you might need it again.')) onDelete(); } },
    }) : null,
  ]));
}

function categoryRow(category, contributionWeights, onUpdate, onDelete) {
  const nameInput = textField(category.name);
  const descInput = textField(category.description);
  const typeSelect = select(CONTRIBUTION_TYPES, category.contributionType ?? 'operational', () => {});
  const weight = contributionWeights?.[category.contributionType ?? 'operational'] ?? 1;

  return el('tr', {}, [
    el('td', {}, nameInput),
    el('td', {}, descInput),
    el('td', {}, [typeSelect, el('div', { class: 'field__hint', text: `×${weight}` })]),
    el('td', { text: category.archived ? 'Archived' : 'Active' }),
    rowActions(
      category,
      () => onUpdate(category.id, {
        name: nameInput.value, description: descInput.value, contributionType: typeSelect.value,
      }).then(() => toast('Saved.')),
      () => onUpdate(category.id, { archived: !category.archived }).then(() => toast('Updated.')),
      onDelete ? () => onDelete(category.id).then(() => toast('Deleted.')) : null,
    ),
  ]);
}

function categoriesPanel(categories, contributionWeights, { onCreateCategory, onUpdateCategory, onDeleteCategory, canCreate = true, canDelete = true }) {
  const nameInput = el('input', { type: 'text', placeholder: 'Category name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const typeSelect = select(CONTRIBUTION_TYPES, CONTRIBUTION_TYPES[0].value, () => {});
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add category',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateCategory({ name: nameInput.value, description: descInput.value, contributionType: typeSelect.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Category added.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Categories' }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Contribution type', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, categories.map((c) => categoryRow(
        c, contributionWeights, onUpdateCategory, canDelete ? onDeleteCategory : null,
      ))),
    ])),
    canCreate ? el('div', { class: 'field' }, [typeSelect, nameInput, descInput, addBtn]) : null,
  ]);
}

function taskRow(task, categories, onUpdateTask, onDeleteTask) {
  const nameInput = textField(task.name);
  const descInput = textField(task.description);
  const weightInput = el('input', { type: 'number', value: task.weight });
  const categorySelect = select(categories.map((c) => ({ value: c.id, label: c.name })), task.categoryId, () => {});

  return el('tr', {}, [
    el('td', {}, nameInput),
    el('td', {}, descInput),
    el('td', {}, categorySelect),
    el('td', {}, weightInput),
    el('td', { text: task.archived ? 'Archived' : 'Active' }),
    rowActions(
      task,
      () => onUpdateTask(task.id, {
        name: nameInput.value, description: descInput.value,
        categoryId: categorySelect.value, weight: Number(weightInput.value),
      }).then(() => toast('Saved.')),
      () => onUpdateTask(task.id, { archived: !task.archived }).then(() => toast('Updated.')),
      () => onDeleteTask(task.id).then(() => toast('Deleted.')),
    ),
  ]);
}

function tasksPanel(categories, tasks, { onCreateTask, onUpdateTask, onDeleteTask }) {
  let filterCategoryId = 'all';
  const tableHost = el('div');

  function renderTable() {
    clear(tableHost);
    const filtered = filterCategoryId === 'all' ? tasks : tasks.filter((t) => t.categoryId === filterCategoryId);
    tableHost.appendChild(el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Category', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, filtered.map((t) => taskRow(t, categories, onUpdateTask, onDeleteTask))),
    ])));
  }

  const filterSelect = select(
    [{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    filterCategoryId,
    (value) => { filterCategoryId = value; renderTable(); },
  );

  const nameInput = el('input', { type: 'text', placeholder: 'Task name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const newTaskCategorySelect = select(categories.map((c) => ({ value: c.id, label: c.name })), categories[0]?.id ?? '', () => {});
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add task',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateTask({ categoryId: newTaskCategorySelect.value, name: nameInput.value, description: descInput.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Task added.');
        });
      },
    },
  });

  renderTable();

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Tasks' }),
    field('Filter by category', filterSelect),
    tableHost,
    el('div', { class: 'field' }, [newTaskCategorySelect, nameInput, descInput, addBtn]),
  ]);
}

function adminsPanel(onAddAdmin, categories) {
  const emailInput = el('input', { type: 'email', placeholder: 'name@research-square.com' });
  const allCheckbox = el('input', { type: 'checkbox' });
  const categoryChecks = categories.map((c) => {
    const checkbox = el('input', { type: 'checkbox' });
    return { id: c.id, checkbox, row: el('label', { class: 'checkbox-row' }, [checkbox, el('span', { text: c.name })]) };
  });
  // "All" is a full admin, not just every category ticked - it also grants
  // Settings, the Admins panel, and (per firestore.rules) the only path to
  // deleting someone else's entry from the Company Ledger. Ticking it locks
  // out the individual boxes so the two can't disagree.
  allCheckbox.addEventListener('change', () => {
    categoryChecks.forEach((c) => {
      c.checkbox.disabled = allCheckbox.checked;
      if (allCheckbox.checked) c.checkbox.checked = false;
    });
  });
  const resetChecks = () => {
    allCheckbox.checked = false;
    categoryChecks.forEach((c) => { c.checkbox.checked = false; c.checkbox.disabled = false; });
  };
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Make admin',
    on: {
      click: () => {
        const email = emailInput.value.trim();
        if (!email) return;
        const categoryIds = categoryChecks.filter((c) => c.checkbox.checked).map((c) => c.id);
        if (!allCheckbox.checked && categoryIds.length === 0) {
          toast('Tick "All" or at least one category.');
          return;
        }
        onAddAdmin(email, categoryIds).then(() => {
          emailInput.value = '';
          resetChecks();
          toast(categoryIds.length ? `${email} can now manage ${categoryIds.length} category(ies).` : `${email} is now a full admin (all categories).`);
        }).catch((err) => {
          toast(err.message || 'Could not add admin.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Admins' }),
    el('p', { class: 'muted', text: 'Grant admin access by email. The person must have signed in at least once already.' }),
    el('div', { class: 'field' }, [emailInput, addBtn]),
    field('Category access', el('div', {}, [
      el('label', { class: 'checkbox-row' }, [allCheckbox, el('strong', { text: 'All categories (full admin)' })]),
      ...categoryChecks.map((c) => c.row),
    ])),
  ]);
}

export function buildManageView({ categories, tasks, contributionWeights, onCreateCategory, onUpdateCategory, onDeleteCategory, onCreateTask, onUpdateTask, onDeleteTask, onAddAdmin = null, restrictToCategoryIds = null }) {
  const scoped = Array.isArray(restrictToCategoryIds);
  const visibleCategories = scoped ? categories.filter((c) => restrictToCategoryIds.includes(c.id)) : categories;
  const visibleTasks = scoped ? tasks.filter((t) => restrictToCategoryIds.includes(t.categoryId)) : tasks;
  return el('div', {}, [
    categoriesPanel(visibleCategories, contributionWeights, { onCreateCategory, onUpdateCategory, onDeleteCategory, canCreate: !scoped, canDelete: !scoped }),
    tasksPanel(visibleCategories, visibleTasks, { onCreateTask, onUpdateTask, onDeleteTask }),
    onAddAdmin ? adminsPanel(onAddAdmin, categories) : null,
  ]);
}
