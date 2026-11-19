import { test } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';

const { occurrenceKeys } = await import('../utils/occurrenceKeys.ts');

test('genera claves por texto y ocurrencia', () => {
  assert.deepEqual(occurrenceKeys(['A', 'B'], item => item), [
    JSON.stringify(['A', 0]), JSON.stringify(['B', 0]),
  ]);
  assert.deepEqual(occurrenceKeys(['A', 'A', 'B', 'A'], item => item), [
    JSON.stringify(['A', 0]), JSON.stringify(['A', 1]),
    JSON.stringify(['B', 0]), JSON.stringify(['A', 2]),
  ]);
});

test('las claves de cada texto se conservan al reordenar y la lista vacía no genera claves', () => {
  const keyMap = items => new Map(items.map((item, index) => [item.id, occurrenceKeys(items, entry => entry.title)[index]]));
  const original = [{ id: 'a1', title: 'A' }, { id: 'b', title: 'B' }, { id: 'a2', title: 'A' }];
  const reordered = [original[2], original[1], original[0]];
  const before = keyMap(original);
  const after = keyMap(reordered);

  assert.equal(before.get('a1'), after.get('a1'));
  assert.equal(before.get('a2'), after.get('a2'));
  assert.equal(before.get('b'), after.get('b'));
  assert.deepEqual(occurrenceKeys([], item => item), []);
});
