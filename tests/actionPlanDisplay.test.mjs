import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { canReturnToOriginal, getActionPlanDisplay, getOriginalDiagnosis, shouldShowReturnToOriginal } = await import('../utils/actionPlanDisplay.ts');

test('gestiona un plan de acción ausente', () => {
  assert.deepEqual(getActionPlanDisplay(undefined), { actionPlan: [], topActions: [] });
  assert.deepEqual(getActionPlanDisplay(null), { actionPlan: [], topActions: [] });
});

test('limita las acciones principales a tres y conserva el plan completo', () => {
  const actions = Array.from({ length: 5 }, (_, index) => ({ title: `Acción ${index + 1}` }));
  const result = getActionPlanDisplay(actions);
  assert.equal(result.topActions.length, 3);
  assert.deepEqual(result.topActions, actions.slice(0, 3));
  assert.equal(result.actionPlan.length, 5);
});

test('conserva el primer diagnóstico al elegir varias especies y solo ofrece volver si cambió', () => {
  const initial = { speciesName: 'Propuesta IA' };
  const choiceA = { speciesName: 'Especie A' };
  const choiceB = { speciesName: 'Especie B' };

  const originalAfterA = getOriginalDiagnosis(null, initial);
  const originalAfterB = getOriginalDiagnosis(originalAfterA, choiceA);
  assert.equal(originalAfterA, initial);
  assert.equal(originalAfterB, initial);
  assert.equal(shouldShowReturnToOriginal(initial, originalAfterB), false);
  assert.equal(shouldShowReturnToOriginal(choiceA, originalAfterB), true);
  assert.equal(shouldShowReturnToOriginal(choiceB, originalAfterB), true);
});

test('solo permite volver al diagnóstico original si no hay un re-diagnóstico en marcha', () => {
  const original = { speciesName: 'Propuesta IA' };
  const current = { speciesName: 'Especie elegida' };

  assert.equal(canReturnToOriginal(current, original, true), false);
  assert.equal(canReturnToOriginal(current, null, false), false);
  assert.equal(canReturnToOriginal(original, original, false), false);
  assert.equal(canReturnToOriginal(current, original, false), true);
});
