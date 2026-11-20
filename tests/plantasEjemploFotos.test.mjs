import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import './helpers/tsLoader.mjs';

const { MOCK_PLANTS } = await import('../constants.tsx');

test('las tres plantas de ejemplo usan fotos locales existentes', () => {
  assert.equal(MOCK_PLANTS.length, 3);
  for (const plant of MOCK_PLANTS) {
    assert.ok(plant.image.startsWith('/plantas-ejemplo/'), plant.image);
    assert.ok(existsSync(resolve('public', `.${plant.image}`)), plant.image);
  }
});
