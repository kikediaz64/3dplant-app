import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import './helpers/tsLoader.mjs';

const { MOCK_PLANTS } = await import('../constants.tsx');

test('las cuatro plantas de ejemplo usan fotos locales existentes', () => {
  assert.equal(MOCK_PLANTS.length, 4);
  assert.deepEqual(MOCK_PLANTS.map(plant => plant.id), ['1', '2', '3', '4']);
  for (const plant of MOCK_PLANTS) {
    assert.ok(plant.image.startsWith('/plantas-ejemplo/'), plant.image);
    assert.ok(existsSync(resolve('public', `.${plant.image}`)), plant.image);
  }
});
