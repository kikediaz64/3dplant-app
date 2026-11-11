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

const { getPlantDetailTones } = await import('../utils/plantDetailTones.ts');

const greenClasses = {
  box: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/30',
  title: 'text-green-900 dark:text-green-300',
  text: 'text-green-800 dark:text-green-200',
};

for (const [status, color, icon] of [
  ['sick', 'red', '🔴'],
  ['warning', 'orange', '⚠️'],
  ['healthy', 'green', '✅'],
]) {
  test(`${status}: recomendaciones verdes con 💡 y problemas con su tono de estado`, () => {
    const { diagnosisTone, recommendationsTone } = getPlantDetailTones(status);
    assert.deepEqual(recommendationsTone, { ...greenClasses, icon: '💡' });
    assert.deepEqual(diagnosisTone, {
      box: `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-900/30`,
      title: `text-${color}-900 dark:text-${color}-300`,
      text: `text-${color}-800 dark:text-${color}-200`,
      icon,
    });
  });
}
