import { el, field, select, clear, toast } from './dom.js';
import { IMPACT_LEVELS, PROOF_LEVELS } from '../scoring.js';
import { validateEntryDraft } from '../validation.js';

const CUSTOM_TASK_ID = '__custom__';

function buildHowItWorks() {
  return el('details', { class: 'panel explain' }, [
    el('summary', { text: 'How does this work?' }),
    el('p', {}, 'Pick the category that best matches what you did, then the specific task under it. Nothing fits? Choose "Other - not listed" and describe it - an admin reviews those and can add it to the list or link it to an existing task.'),
    el('p', {}, 'Impact and Proof are about the actual thing you did, not how impressive it sounds - be honest, this is a measurement tool, not a leaderboard. You never have to calculate anything: points = impact x proof x the task\'s weight, and they only show up after you submit.'),
    el('h4', { text: 'Worked examples' }),
    el('p', {}, [
      el('strong', { text: 'A 15-30 minute chat helping a colleague' }),
      ' (mentoring, a design question, general advice) - pick whichever category fits the conversation (Technical Coaching, Leadership Development, or Culture). Impact: 1 (small help) or 2 (noticeable help), depending on how much it actually helped them. Proof: 1 ("trust me") if it was just a chat, or 2 if you wrote it up afterwards - e.g. minutes of the meeting saying what you helped with and why.',
    ]),
    el('p', {}, [
      el('strong', { text: 'Helping with a design, and writing up why in a short note or minutes of meeting' }),
      ' - Impact: up to 2 (noticeable help). Proof: up to 2 (here is the data), since the write-up is real evidence. That\'s impact 2 x proof 2 = 4 points, and the write-up can become a reusable guide for the next person.',
    ]),
  ]);
}

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
    type: 'url', placeholder: 'Link, document, or MoM (optional)', value: draft.evidenceUrl,
    on: { input: (e) => { draft.evidenceUrl = e.target.value; } },
  });

  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: initialValues ? 'Save changes' : 'Log it' });

  form.append(
    el('h3', { text: initialValues ? 'Edit entry' : 'What did you do?' }),
    buildHowItWorks(),
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
