import { el, field, select, clear, toast } from './dom.js';
import { IMPACT_LEVELS, PROOF_LEVELS } from '../scoring.js';
import { validateEntryDraft } from '../validation.js';

const CUSTOM_TASK_ID = '__custom__';

function pickerRow(levels, selectedValue, onPick) {
  return el('div', { class: 'picker' }, levels.map((lvl) => el('button', {
    type: 'button',
    class: `picker__option${lvl.value === selectedValue ? ' picker__option--selected' : ''}`,
    on: { click: () => onPick(lvl.value) },
  }, [
    el('strong', { text: `${lvl.value} - ${lvl.label}` }),
    el('span', { text: lvl.description }),
  ])));
}

export function buildLogForm({ categories, tasks, initialValues = null, onSubmit, onCancel = null }) {
  const draft = {
    categoryId: '', categoryName: '', taskId: '', taskName: '',
    isCustomTask: false, customTaskName: '',
    date: new Date().toISOString().slice(0, 10),
    impact: 0, proof: 0, description: '', evidenceUrl: '',
    ...initialValues,
  };

  const form = el('form', { class: 'panel' });
  const errorBanner = el('div', { id: 'form-error' });
  const taskFieldHost = el('div', { id: 'task-field-host' });
  const pickerHost = { impact: el('div'), proof: el('div') };

  function tasksForCategory(categoryId) {
    return tasks.filter((t) => t.categoryId === categoryId);
  }

  function renderTaskField() {
    clear(taskFieldHost);
    const options = [
      { value: '', label: draft.categoryId ? 'Select a task...' : 'Choose a category first' },
      ...tasksForCategory(draft.categoryId).map((t) => ({ value: t.id, label: t.name })),
      { value: CUSTOM_TASK_ID, label: 'Other - not listed' },
    ];
    const taskSelect = select(options, draft.isCustomTask ? CUSTOM_TASK_ID : draft.taskId, (value) => {
      if (value === CUSTOM_TASK_ID) {
        draft.isCustomTask = true;
        draft.taskId = '';
        draft.taskName = '';
      } else {
        draft.isCustomTask = false;
        draft.taskId = value;
        draft.taskName = tasks.find((t) => t.id === value)?.name ?? '';
      }
      renderTaskField();
    });
    taskFieldHost.appendChild(field('What did you do?', taskSelect));

    if (draft.isCustomTask) {
      const customInput = el('input', {
        type: 'text', placeholder: 'Describe the task briefly',
        value: draft.customTaskName,
        on: { input: (e) => { draft.customTaskName = e.target.value; } },
      });
      taskFieldHost.appendChild(field('Task name (not on the list)', customInput, {
        hint: "This goes to an admin review queue so we can add it to the list if it keeps coming up.",
      }));
    }
  }

  function renderPickers() {
    clear(pickerHost.impact);
    pickerHost.impact.appendChild(pickerRow(IMPACT_LEVELS, draft.impact, (v) => { draft.impact = v; renderPickers(); }));
    clear(pickerHost.proof);
    pickerHost.proof.appendChild(pickerRow(PROOF_LEVELS, draft.proof, (v) => { draft.proof = v; renderPickers(); }));
  }

  const categorySelect = select(
    [{ value: '', label: 'Select a category...' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    draft.categoryId,
    (value) => {
      draft.categoryId = value;
      draft.categoryName = categories.find((c) => c.id === value)?.name ?? '';
      draft.taskId = '';
      draft.taskName = '';
      renderTaskField();
    },
  );

  const dateInput = el('input', {
    type: 'date', value: draft.date,
    on: { input: (e) => { draft.date = e.target.value; } },
  });

  const descriptionInput = el('textarea', {
    rows: '3', placeholder: 'What did you do, briefly?', text: draft.description,
    on: { input: (e) => { draft.description = e.target.value; } },
  });

  const evidenceInput = el('input', {
    type: 'text', placeholder: 'A link, or just describe it - e.g. "Ask Sam, she was in the meeting" (optional)', value: draft.evidenceUrl,
    on: { input: (e) => { draft.evidenceUrl = e.target.value; } },
  });

  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: initialValues ? 'Save changes' : 'Log it' });

  form.append(
    el('h3', { text: initialValues ? 'Edit entry' : 'What did you do?' }),
    el('p', { class: 'muted', text: 'New here? See the "How to use" tab for a walkthrough and scoring examples.' }),
    errorBanner,
    field('Category', categorySelect),
    taskFieldHost,
    field('When did you do it?', dateInput),
    field('How much impact did you think it had?', pickerHost.impact),
    field('What proof do you have?', pickerHost.proof),
    field('Description', descriptionInput),
    field('Evidence', evidenceInput, { hint: 'Optional - a link, document, or minutes of a meeting.' }),
    submitBtn,
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clear(errorBanner);
    const { valid, errors } = validateEntryDraft(draft);
    if (!valid) {
      errorBanner.appendChild(el('div', { class: 'banner banner-danger', text: Object.values(errors)[0] }));
      return;
    }
    submitBtn.disabled = true;
    onSubmit({ ...draft }).then((result) => {
      toast(`Logged - ${result.points} points`);
      if (onCancel) onCancel();
      else {
        Object.assign(draft, {
          categoryId: '', categoryName: '', taskId: '', taskName: '',
          isCustomTask: false, customTaskName: '', impact: 0, proof: 0,
          description: '', evidenceUrl: '',
        });
        categorySelect.value = '';
        renderTaskField();
        renderPickers();
        descriptionInput.value = '';
        evidenceInput.value = '';
        submitBtn.disabled = false;
      }
    }).catch((err) => {
      errorBanner.appendChild(el('div', { class: 'banner banner-danger', text: err.message || 'Could not save - try again.' }));
      submitBtn.disabled = false;
    });
  });

  renderTaskField();
  renderPickers();
  return form;
}
