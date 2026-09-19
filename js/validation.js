export function validateEntryDraft(draft) {
  const errors = {};

  if (!draft.categoryId) errors.categoryId = 'Select a category.';
  if (!draft.isCustomTask && !draft.taskId) errors.taskId = 'Select a task.';
  if (draft.isCustomTask && !(draft.customTaskName || '').trim()) {
    errors.customTaskName = 'Describe what you did.';
  }
  if (!draft.date) errors.date = 'Pick a date.';
  if (!Number.isInteger(draft.impact) || draft.impact < 1 || draft.impact > 5) {
    errors.impact = 'Choose an impact level.';
  }
  if (!Number.isInteger(draft.proof) || draft.proof < 1 || draft.proof > 3) {
    errors.proof = 'Choose a proof level.';
  }
  if (!(draft.description || '').trim()) errors.description = 'Add a short description.';

  return { valid: Object.keys(errors).length === 0, errors };
}
