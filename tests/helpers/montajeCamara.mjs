import { montarPantalla } from './montajePantalla.mjs';

export function montarCamara({
  url = 'https://plant.test/scan',
  globals = {},
  pixelValue = () => 0,
  createObjectURL,
  revokeObjectURL,
} = {}) {
  const pantalla = montarPantalla({
    url,
    globals: {
      Image: class {
        naturalWidth = 256;
        naturalHeight = 256;
        set src(value) {
          this.source = value;
          queueMicrotask(() => this.onload?.());
        }
        decode() { return Promise.resolve(); }
      },
      ...globals,
    },
  });
  const canvas = pantalla.dom.window.HTMLCanvasElement.prototype;
  canvas.getContext = function () {
    return {
      drawImage: image => { this.source = image.source; },
      getImageData: () => {
        const data = new Uint8ClampedArray(this.width * this.height * 4);
        for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
          const i = (y * this.width + x) * 4;
          data[i] = data[i + 1] = data[i + 2] = pixelValue(x, y);
          data[i + 3] = 255;
        }
        return { data };
      },
    };
  };
  canvas.toDataURL = function () {
    return `data:image/jpeg;base64,${Buffer.from(this.source).toString('base64')}`;
  };

  const urlDescriptors = new Map();
  if (createObjectURL) {
    urlDescriptors.set('createObjectURL', Object.getOwnPropertyDescriptor(URL, 'createObjectURL'));
    URL.createObjectURL = createObjectURL;
  }
  if (revokeObjectURL) {
    urlDescriptors.set('revokeObjectURL', Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL'));
    URL.revokeObjectURL = revokeObjectURL;
  }

  return {
    ...pantalla,
    restaurar() {
      try {
        pantalla.restaurar();
      } finally {
        for (const [key, descriptor] of urlDescriptors) {
          if (descriptor) Object.defineProperty(URL, key, descriptor);
          else delete URL[key];
        }
      }
    },
  };
}
