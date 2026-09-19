import { el, field, select, clear, toast } from './dom.js';

function editableRow(item, fields, onUpdate, onDelete) {
  const inputs = {};
  const row = el('tr', {}, [
    ...fields.map(({ key, type = 'text' }) => {
      const input = el('input', { type, value: item[key], title: type === 'text' ? item[key] : undefined });
      inputs[key] = input;
      return el('td', {}, input);
    }),
    el('td', { text: item.archived ? 'Archived' : 'Active' }),
    el('td', {}, [
      el('button', {
        type: 'button', class: 'btn', text: 'Save',
        on: {
          click: () => {
            const patch = {};
            for (const { key, type } of fields) {
              patch[key] = type === 'number' ? Number(inputs[key].value) : inputs[key].value;
            }
            onUpdate(item.id, patch).then(() => toast('Saved.'));
          },
        },
      }),
      el('button', {
        type: 'button', class: 'btn', text: item.archived ? 'Unarchive' : 'Archive',
        on: { click: () => onUpdate(item.id, { archived: !item.archived }).then(() => toast('Updated.')) },
      }),
      onDelete ? el('button', {
        type: 'button', class: 'btn btn-danger', text: 'Delete',
        disabled: item.entryCount > 0,
        title: item.entryCount > 0 ? 'Has logged entries - archive instead of deleting.' : '',
        on: { click: () => onDelete(item.id).then(() => toast('Deleted.')) },
      }) : null,
    ]),
  ]);
  return row;
}

function categoriesPanel(categories, { onCreateCategory, onUpdateCategory, onDeleteCategory, canCreate = true, canDelete = true }) {
  const nameInput = el('input', { type: 'text', placeholder: 'Category name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add category',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateCategory({ name: nameInput.value, description: descInput.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Category added.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Categories' }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, categories.map((c) => editableRow(
        c,
        [{ key: 'name' }, { key: 'description' }, { key: 'weight', type: 'number' }],
        onUpdateCategory,
        canDelete ? onDeleteCategory : null,
      ))),
    ])),
    canCreate ? el('div', { class: 'field' }, [nameInput, descInput, addBtn]) : null,
  ]);
}

function taskRow(task, categories, onUpdateTask, onDeleteTask) {
  const nameInput = el('input', { type: 'text', value: task.name, title: task.name });
  const descInput = el('input', { type: 'text', value: task.description, title: task.description });
  const weightInput = el('input', { type: 'number', value: task.weight });
  const categorySelect = select(categories.map((c) => ({ value: c.id, label: c.name })), task.categoryId, () => {});

  return el('tr', {}, [
    el('td', {}, nameInput),
    el('td', {}, descInput),
    el('td', {}, categorySelect),
    el('td', {}, weightInput),
    el('td', { text: task.archived ? 'Archived' : 'Active' }),
    el('td', {}, [
      el('button', {
        type: 'button', class: 'btn', text: 'Save',
        on: {
          click: () => onUpdateTask(task.id, {
            name: nameInput.value, description: descInput.value,
            categoryId: categorySelect.value, weight: Number(weightInput.value),
          }).then(() => toast('Saved.')),
        },
      }),
      el('button', {
        type: 'button', class: 'btn', text: task.archived ? 'Unarchive' : 'Archive',
        on: { click: () => onUpdateTask(task.id, { archived: !task.archived }).then(() => toast('Updated.')) },
      }),
      el('button', {
        type: 'button', class: 'btn btn-danger', text: 'Delete',
        disabled: task.entryCount > 0,
        title: task.entryCount > 0 ? 'Has logged entries - archive instead of deleting.' : '',
        on: { click: () => onDeleteTask(task.id).then(() => toast('Deleted.')) },
      }),
    ]),
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
  const categoryChecks = categories.map((c) => {
    const checkbox = el('input', { type: 'checkbox' });
    return { id: c.id, checkbox, row: el('label', { class: 'checkbox-row' }, [checkbox, el('span', { text: c.name })]) };
  });
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Make admin',
    on: {
      click: () => {
        const email = emailInput.value.trim();
        if (!email) return;
        const categoryIds = categoryChecks.filter((c) => c.checkbox.checked).map((c) => c.id);
        onAddAdmin(email, categoryIds).then(() => {
          emailInput.value = '';
          categoryChecks.forEach((c) => { c.checkbox.checked = false; });
          toast(categoryIds.length ? `${email} can now manage ${categoryIds.length} category(ies).` : `${email} is now a full admin.`);
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
    field('Restrict to categories (leave all unchecked for a full admin)', el('div', {}, categoryChecks.map((c) => c.row))),
  ]);
}

export function buildManageView({ categories, tasks, onCreateCategory, onUpdateCategory, onDeleteCategory, onCreateTask, onUpdateTask, onDeleteTask, onAddAdmin = null, restrictToCategoryIds = null }) {
  const scoped = Array.isArray(restrictToCategoryIds);
  const visibleCategories = scoped ? categories.filter((c) => restrictToCategoryIds.includes(c.id)) : categories;
  const visibleTasks = scoped ? tasks.filter((t) => restrictToCategoryIds.includes(t.categoryId)) : tasks;
  return el('div', {}, [
    categoriesPanel(visibleCategories, { onCreateCategory, onUpdateCategory, onDeleteCategory, canCreate: !scoped, canDelete: !scoped }),
    tasksPanel(visibleCategories, visibleTasks, { onCreateTask, onUpdateTask, onDeleteTask }),
    onAddAdmin ? adminsPanel(onAddAdmin, categories) : null,
  ]);
}
