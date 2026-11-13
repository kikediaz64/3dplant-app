import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessPhoto } from '../services/photoQuality.mjs';

const fixture = (width, height, blurry) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const position = x / width;
    const value = blurry
      ? 130 + 70 * Math.sin(position * Math.PI * 8)
      : Math.floor(position * 32) % 2 ? 200 : 60;
    const i = (y * width + x) * 4;
    pixels[i] = pixels[i + 1] = pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }
  return { width, height, pixels };
};

// Canvas mínimo con interpolación bilineal para ejercitar el análisis de píxeles
// real tras el escalado, sin depender de un navegador ni de imágenes externas.
async function assessFixture(source) {
  const originalImage = globalThis.Image;
  const originalDocument = globalThis.document;
  let drawnSize;
  globalThis.Image = class {
    naturalWidth = source.width;
    naturalHeight = source.height;
    async decode() {}
  };
  globalThis.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = {
        width: 0, height: 0,
        getContext() {
          return {
            drawImage(_image, x, y, width, height) {
              assert.equal(x, 0);
              assert.equal(y, 0);
              drawnSize = [width, height];
            },
            getImageData(x, y, width, height) {
              assert.deepEqual([x, y, width, height], [0, 0, canvas.width, canvas.height]);
              const data = new Uint8ClampedArray(width * height * 4);
              for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
                const sx = Math.max(0, Math.min(source.width - 1, (col + .5) * source.width / width - .5));
                const sy = Math.max(0, Math.min(source.height - 1, (row + .5) * source.height / height - .5));
                const x0 = Math.floor(sx), y0 = Math.floor(sy);
                const x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
                const sample = (px, py) => source.pixels[(py * source.width + px) * 4];
                const top = sample(x0, y0) * (1 - sx + x0) + sample(x1, y0) * (sx - x0);
                const bottom = sample(x0, y1) * (1 - sx + x0) + sample(x1, y1) * (sx - x0);
                const i = (row * width + col) * 4;
                data[i] = data[i + 1] = data[i + 2] = top * (1 - sy + y0) + bottom * (sy - y0);
                data[i + 3] = 255;
              }
              return { data };
            },
          };
        },
      };
      return canvas;
    },
  };
  try {
    return { verdict: await assessPhoto('fixture'), drawnSize };
  } finally {
    if (originalImage === undefined) delete globalThis.Image;
    else globalThis.Image = originalImage;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
}

for (const blurry of [false, true]) {
  test(`foto ${blurry ? 'borrosa' : 'nítida'} de 256 px mantiene el veredicto de la grande`, async () => {
    for (const [width, height] of [[256, 256], [256, 128], [128, 256]]) {
      const small = await assessFixture(fixture(width, height, blurry));
      const reference = await assessFixture(fixture(width * 2, height * 2, blurry));
      const large = await assessFixture(fixture(width * 4, height * 4, blurry));
      assert.deepEqual(small.drawnSize, [width * 2, height * 2]);
      assert.deepEqual(reference.drawnSize, small.drawnSize);
      assert.deepEqual(large.drawnSize, small.drawnSize);
      assert.equal(small.verdict, reference.verdict);
      assert.equal(small.verdict, large.verdict);
      if (blurry) assert.match(small.verdict, /borrosa/);
      else assert.equal(small.verdict, null);
    }
  });
}
