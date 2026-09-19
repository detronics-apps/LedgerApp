import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntryDraft } from '../js/validation.js';

const baseDraft = {
  categoryId: 'culture', taskId: 'culture--team-event', isCustomTask: false,
  customTaskName: '', date: '2026-09-17', impact: 3, proof: 2,
  description: 'Organised a team lunch.',
};

test('a fully filled-in draft is valid', () => {
  const result = validateEntryDraft(baseDraft);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('missing category and task are reported', () => {
  const result = validateEntryDraft({ ...baseDraft, categoryId: '', taskId: '' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.categoryId, 'Select a category.');
  assert.equal(result.errors.taskId, 'Select a task.');
});

test('a custom task requires free text', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: true, customTaskName: '  ' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.customTaskName, 'Describe what you did.');
});

test('a custom task with text is valid', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: true, customTaskName: 'Fixed the coffee machine' });
  assert.equal(result.valid, true);
});

test('a custom task with empty taskId and valid customTaskName is valid', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: true, taskId: '', customTaskName: 'Reviewed security logs' });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('a non-custom task with empty taskId is invalid', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: false, taskId: '' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.taskId, 'Select a task.');
});

test('impact and proof out of range are reported', () => {
  const result = validateEntryDraft({ ...baseDraft, impact: 0, proof: 4 });
  assert.equal(result.errors.impact, 'Choose an impact level.');
  assert.equal(result.errors.proof, 'Choose a proof level.');
});

test('a blank description is reported', () => {
  const result = validateEntryDraft({ ...baseDraft, description: '   ' });
  assert.equal(result.errors.description, 'Add a short description.');
});

test('a missing date is reported', () => {
  const result = validateEntryDraft({ ...baseDraft, date: '' });
  assert.equal(result.errors.date, 'Pick a date.');
});

test('a http(s) evidence link is valid', () => {
  const result = validateEntryDraft({ ...baseDraft, evidenceUrl: 'https://example.com/doc' });
  assert.equal(result.valid, true);
  assert.equal(result.errors.evidenceUrl, undefined);
});

test('a javascript: evidence URL is rejected', () => {
  const result = validateEntryDraft({ ...baseDraft, evidenceUrl: 'javascript:alert(1)' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.evidenceUrl, 'Evidence must be a http(s) link, or left blank.');
});

test('an empty evidence URL is valid (optional)', () => {
  const result = validateEntryDraft({ ...baseDraft, evidenceUrl: '' });
  assert.equal(result.valid, true);
  assert.equal(result.errors.evidenceUrl, undefined);
});
