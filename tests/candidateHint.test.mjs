import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCandidateHint } from '../netlify/lib/plantnet.mjs';

test('limita y limpia los nombres comunes de la pista', () => {
  const longName = 'x'.repeat(100);
  const hint = formatCandidateHint({
    scientificName: 'Rosa canina', score: 0.876,
    commonNames: [longName, 'Escaramujo', 'escaramujo', '', 'Nombre cuatro', 'Nombre cinco', 'Nombre seis', 'Nombre siete', 'Nombre ocho', 'Nombre nueve']
  });
  assert.equal(hint, `Rosa canina (${longName.slice(0, 60)}, Escaramujo, Nombre cuatro) (88 %)`);
  const commonNames = hint.match(/\((.*)\) \(88 %\)/)[1].split(', ');
  assert.equal(commonNames.length, 3);
  assert.ok(commonNames.every(name => name.length <= 60 && name.trim() !== ''));
  assert.equal(new Set(commonNames.map(name => name.toLowerCase())).size, commonNames.length);
  assert.equal(formatCandidateHint({ scientificName: 'Rosa canina', score: 0.42, commonNames: [] }), 'Rosa canina (42 %)');
});
