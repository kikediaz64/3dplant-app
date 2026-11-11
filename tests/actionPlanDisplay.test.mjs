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

const { getActionPlanDisplay } = await import('../utils/actionPlanDisplay.ts');

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
