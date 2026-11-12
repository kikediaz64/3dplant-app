import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

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
