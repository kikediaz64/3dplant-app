import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      if (existsSync(new URL(url.href + '.ts'))) return next(url.href + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.ts$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext }
      }).outputText
    };
    return next(url, context);
  }
});

const { getHealthTrend } = await import('../services/healthTrend.ts');

test('compara la puntuación más reciente con la anterior usando margen de cinco puntos', () => {
  assert.equal(getHealthTrend([80, 74]), 'Mejorando');
  assert.equal(getHealthTrend([74, 80]), 'Empeorando');
  assert.equal(getHealthTrend([75, 80]), 'Igual');
  assert.equal(getHealthTrend([85, 80]), 'Igual');
  assert.equal(getHealthTrend([85, 79]), 'Mejorando');
  assert.equal(getHealthTrend([79, 85]), 'Empeorando');
  assert.equal(getHealthTrend([null, 70, 60]), 'Mejorando');
  assert.equal(getHealthTrend([70]), null);
  assert.equal(getHealthTrend([undefined, 101]), null);
});
