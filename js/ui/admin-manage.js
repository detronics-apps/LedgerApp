import { el, field, select, clear, toast } from './dom.js';

function editableRow(item, fields, onUpdate, onDelete) {
  const inputs = {};
  const row = el('tr', {}, [
    ...fields.map(({ key, type = 'text' }) => {
      const input = el('input', { type, value: item[key] });
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
      el('button', {
        type: 'button', class: 'btn btn-danger', text: 'Delete',
        disabled: item.entryCount > 0,
        title: item.entryCount > 0 ? 'Has logged entries - archive instead of deleting.' : '',
        on: { click: () => onDelete(item.id).then(() => toast('Deleted.')) },
      }),
    ]),
  ]);
  return row;
}

function categoriesPanel(categories, { onCreateCategory, onUpdateCategory, onDeleteCategory }) {
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
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, categories.map((c) => editableRow(
        c,
        [{ key: 'name' }, { key: 'description' }, { key: 'weight', type: 'number' }],
        onUpdateCategory,
        onDeleteCategory,
      ))),
    ]),
    el('div', { class: 'field' }, [nameInput, descInput, addBtn]),
  ]);
}

function tasksPanel(categories, tasks, { onCreateTask, onUpdateTask, onDeleteTask }) {
  const nameInput = el('input', { type: 'text', placeholder: 'Task name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const categorySelect = select(categories.map((c) => ({ value: c.id, label: c.name })), categories[0]?.id ?? '', () => {});
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add task',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateTask({ categoryId: categorySelect.value, name: nameInput.value, description: descInput.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Task added.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Tasks' }),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, tasks.map((t) => editableRow(
        t,
        [{ key: 'name' }, { key: 'description' }, { key: 'weight', type: 'number' }],
        onUpdateTask,
        onDeleteTask,
      ))),
    ]),
    el('div', { class: 'field' }, [categorySelect, nameInput, descInput, addBtn]),
  ]);
}

export function buildManageView({ categories, tasks, onCreateCategory, onUpdateCategory, onDeleteCategory, onCreateTask, onUpdateTask, onDeleteTask }) {
  return el('div', {}, [
    categoriesPanel(categories, { onCreateCategory, onUpdateCategory, onDeleteCategory }),
    tasksPanel(categories, tasks, { onCreateTask, onUpdateTask, onDeleteTask }),
  ]);
}
