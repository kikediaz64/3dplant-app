import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessPixels, assessPhoto } from '../services/photoQuality.mjs';
const fixture = fn => {
  const size = 256, pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = fn(x, y); pixels[i + 3] = 255;
  }
  return assessPixels(pixels, size, size);
};
test('foto oscura avisa', () => assert.match(fixture(() => 15), /oscura/));
test('superficie lisa y gradiente suave no implican desenfoque', () => {
  assert.equal(fixture(() => 140), null);
  assert.equal(fixture(x => 80 + x / 3), null);
});
test('bordes nítidos no avisan', () => assert.equal(fixture(x => x < 128 ? 60 : 220), null));
test('bordes muy extendidos avisan de desenfoque', () => assert.match(fixture(x => 140 + 80 * Math.tanh((x - 128) / 12)), /borrosa/));
test('un fallo de decodificación no bloquea el diagnóstico', async () => {
  const original = globalThis.Image;
  globalThis.Image = class { async decode() { throw new Error('decode'); } };
  try { assert.equal(await assessPhoto('invalid'), null); } finally { globalThis.Image = original; }
});
