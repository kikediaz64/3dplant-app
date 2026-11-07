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
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }
      }).outputText
    };
    return next(url, context);
  }
});

const { normalizeActionPlanIcon } = await import('../services/aiService.ts');

test('conserva iconos permitidos del plan de acción', () => {
  assert.equal(normalizeActionPlanIcon('content_cut'), 'content_cut');
});

test('mapea sinónimos frecuentes de iconos', () => {
  assert.equal(normalizeActionPlanIcon('scissors'), 'content_cut');
  assert.equal(normalizeActionPlanIcon('water'), 'water_drop');
  assert.equal(normalizeActionPlanIcon('sun'), 'wb_sunny');
  assert.equal(normalizeActionPlanIcon('bug'), 'pest_control');
});

test('usa task_alt para iconos desconocidos o valores que no son texto', () => {
  assert.equal(normalizeActionPlanIcon('made_up_icon'), 'task_alt');
  assert.equal(normalizeActionPlanIcon(42), 'task_alt');
  assert.equal(normalizeActionPlanIcon(null), 'task_alt');
});
