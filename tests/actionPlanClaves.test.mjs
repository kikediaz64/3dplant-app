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

const { diagnosePlant } = await import('../services/aiService.ts');

test('descarta claves ajenas en acciones válidas del plan', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({
    text: JSON.stringify({
      actionPlan: [{ title: 'Poda', description: 'Retira hojas secas', icon: 'content_cut', extra: 1 }]
    })
  }), { status: 200 });

  const result = await diagnosePlant('imagen-de-prueba');
  assert.deepEqual(result.actionPlan, [
    { title: 'Poda', description: 'Retira hojas secas', icon: 'content_cut' }
  ]);
});
