import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasoningLevels } from '../src/lib/models.ts';

test('reasoning choices omit Ultra without changing the catalog', () => {
  const model = { supportedReasoningEfforts: ['low','medium','high','ultra'].map(reasoningEffort => ({reasoningEffort})) };
  assert.deepEqual(reasoningLevels(model).map(level => level.reasoningEffort), ['low','medium','high']);
  assert.equal(model.supportedReasoningEfforts.length, 4);
  assert.deepEqual(reasoningLevels(), []);
});
