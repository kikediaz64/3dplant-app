import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const stores = new Map();
const fakeStore = {
  async getWithMetadata(key) {
    const value = stores.get(key);
    return value ? { data: value, etag: String(value.count) } : null;
  },
  async setJSON(key, value) { stores.set(key, value); return { modified: true }; }
};
mock.module('@netlify/blobs', { namedExports: { getStore: () => fakeStore } });

const validBase64 = () => {
  const bytes = Buffer.alloc(5000, 7);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes.toString('base64');
};
const IMAGE = `data:image/jpeg;base64,${validBase64()}`;
const SECRET = 'plantnet-key-secret-for-tests';
const openAiCalls = [];
let plantnetResponse;
let plantnetFailure;
let plantnetDelay;

globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.openai.com/')) {
    openAiCalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"speciesName":"Respuesta habitual"}' } }] }));
  }
  if (!String(url).startsWith('https://my-api.plantnet.org/')) throw new Error('URL inesperada');
  if (plantnetFailure) throw plantnetFailure;
  if (plantnetDelay) {
    await new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    });
  }
  return plantnetResponse;
};
process.env.OPENAI_API_KEY = 'openai-test-key';
const { default: handler } = await import('../netlify/functions/ai.mjs');

const post = () => handler(new Request('https://example.test/api/ai', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'diagnose', imageBase64: IMAGE })
}), { ip: '1.2.3.4', deploy: { context: 'production' } });
const identifyResponse = results => new Response(JSON.stringify({ results }), { status: 200 });
const candidate = (name, score, commonNames = []) => ({ species: { scientificNameWithoutAuthor: name, commonNames }, score });

describe('integración opcional con Pl@ntNet', () => {
  beforeEach(() => {
    stores.clear(); openAiCalls.length = 0;
    plantnetResponse = identifyResponse([]);
    plantnetFailure = null;
    plantnetDelay = false;
    process.env.PLANTNET_API_KEY = SECRET;
  });

  test('añade nombres comunes y porcentajes cuando hay resultados útiles', async () => {
    plantnetResponse = identifyResponse([
      candidate('Monstera deliciosa', 0.85, ['costilla de Adán']),
      candidate('Philodendron bipinnatifidum', 0.1, ['filodendro'])
    ]);
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).text, '{"speciesName":"Respuesta habitual"}');
    assert.match(openAiCalls[0].messages[0].content[0].text, /Monstera deliciosa \(costilla de Adán\) \(85 %\)/);
    assert.match(openAiCalls[0].messages[0].content[0].text, /Philodendron bipinnatifidum.*10 %/);
    assert.equal(JSON.stringify(openAiCalls).includes(SECRET), false);
  });

  for (const scenario of [
    ['sin clave', () => { delete process.env.PLANTNET_API_KEY; }],
    ['404', () => { plantnetResponse = new Response('{}', { status: 404 }); }],
    ['429', () => { plantnetResponse = new Response('{}', { status: 429 }); }],
    ['error de red', () => { plantnetFailure = new Error('red caída'); }],
    ['tiempo agotado', () => { plantnetDelay = true; }]
  ]) {
    test(`${scenario[0]}: OpenAI responde sin pista y sin error al usuario`, async () => {
      scenario[1]();
      const response = await post();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).text, '{"speciesName":"Respuesta habitual"}');
      assert.equal(openAiCalls.length, 1);
      assert.equal(openAiCalls[0].messages[0].content.length, 2);
      assert.equal(JSON.stringify(openAiCalls).includes(SECRET), false);
    });
  }

  test('no añade candidatos con score inferior a 0.2', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.19, ['escaramujo'])]);
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(openAiCalls[0].messages[0].content.length, 2);
  });
});
