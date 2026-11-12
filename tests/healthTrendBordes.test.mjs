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

const { getHealthTrend, isValidScore } = await import('../services/healthTrend.ts');

test('aplica la tolerancia personalizada al comparar puntuaciones', () => {
  assert.equal(getHealthTrend([88, 80], 10), 'Igual');
  assert.equal(getHealthTrend([88, 80]), 'Mejorando');
});

test('ignora NaN, Infinity, negativos y valores superiores a 100', () => {
  for (const score of [NaN, Infinity, -1, 101]) {
    assert.equal(isValidScore(score), false);
  }

  assert.equal(getHealthTrend([NaN, 90, Infinity, 80, -1, 101]), 'Mejorando');
  assert.equal(getHealthTrend([NaN, Infinity, -1, 101, 70]), null);
});
