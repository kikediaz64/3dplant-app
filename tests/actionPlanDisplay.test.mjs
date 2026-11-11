import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.tsx']) {
        if (existsSync(new URL(url.href + ext))) return next(url.href + ext, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        fileName: new URL(url).pathname,
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText
    };
    return next(url, context);
  }
});

const { getActionPlanDisplay, getOriginalDiagnosis, shouldShowReturnToOriginal } = await import('../utils/actionPlanDisplay.ts');

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
