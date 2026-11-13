import { JSDOM } from 'jsdom';

export function montarPantalla({ html = '<!doctype html><div id="root"></div>', url = 'https://plant.test/result', globals = {} } = {}) {
  const dom = new JSDOM(html, { url });
  const values = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
    ...globals,
  };
  const originals = new Map();
  for (const [key, value] of Object.entries(values)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }

  let cerrado = false;
  return {
    dom,
    container: dom.window.document.getElementById('root'),
    restaurar() {
      if (cerrado) return;
      cerrado = true;
      try {
        dom.window.close();
      } finally {
        for (const [key, descriptor] of originals) {
          if (descriptor) Object.defineProperty(globalThis, key, descriptor);
          else delete globalThis[key];
        }
      }
    },
  };
}
