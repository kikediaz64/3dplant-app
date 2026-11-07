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
const SECRET = crypto.randomUUID();
const openAiCalls = [];
let plantnetCalls;
let plantnetResponse;
let plantnetFailure;
let plantnetDelay;

globalThis.fetch = async (url, init) => {
  if (String(url).startsWith('https://api.openai.com/')) {
    openAiCalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"speciesName":"Respuesta habitual"}' } }] }));
  }
  if (!String(url).startsWith('https://my-api.plantnet.org/')) throw new Error('URL inesperada');
  plantnetCalls++;
  assert.equal(init.method, 'POST');
  assert.equal(url.searchParams.get('lang'), 'es');
  assert.equal(url.searchParams.get('nb-results'), '3');
  assert.equal(url.searchParams.get('include-related-images'), 'true');
  assert.equal(init.body.get('organs'), 'auto');
  const image = init.body.get('images');
  assert.equal(image.type, 'image/jpeg');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(validBase64(), 'base64'));
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
const candidate = (name, score, commonNames = [], images) => ({ species: { scientificNameWithoutAuthor: name, commonNames }, score, ...(images ? { images } : {}) });

describe('integración opcional con Pl@ntNet', () => {
  beforeEach(() => {
    stores.clear(); openAiCalls.length = 0;
    plantnetCalls = 0;
    plantnetResponse = identifyResponse([]);
    plantnetFailure = null;
    plantnetDelay = false;
    process.env.PLANTNET_API_KEY = SECRET;
  });

  test('añade nombres comunes y porcentajes cuando hay resultados útiles', async () => {
    plantnetResponse = identifyResponse([
      candidate('Monstera deliciosa', 0.85, ['costilla de Adán'], [{ url: { m: 'https://images.test/monstera.jpg' } }]),
      candidate('Philodendron bipinnatifidum', 0.1, ['filodendro'])
    ]);
    const response = await post();
    assert.equal(response.status, 200);
    const output = await response.json();
    assert.equal(output.text, '{"speciesName":"Respuesta habitual"}');
    assert.deepEqual(output.candidates[0], { scientificName: 'Monstera deliciosa', commonNames: ['costilla de Adán'], score: 0.85, imageUrl: 'https://images.test/monstera.jpg' });
    assert.match(openAiCalls[0].messages[0].content[0].text, /Monstera deliciosa \(costilla de Adán\) \(85 %\)/);
    assert.match(openAiCalls[0].messages[0].content[0].text, /Philodendron bipinnatifidum.*10 %/);
    assert.equal(JSON.stringify(openAiCalls).includes(SECRET), false);
  });

  test('devuelve candidatas sin foto con imageUrl null', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.42, ['escaramujo'])]);
    const output = await (await post()).json();
    assert.deepEqual(output.candidates, [{ scientificName: 'Rosa canina', commonNames: ['escaramujo'], score: 0.42, imageUrl: null }]);
  });

  for (const scenario of [
    ['sin clave', () => { delete process.env.PLANTNET_API_KEY; }],
    ['404', () => { plantnetResponse = new Response('{}', { status: 404 }); }],
    ['429', () => { plantnetResponse = new Response('{}', { status: 429 }); }],
    ['JSON no válido', () => { plantnetResponse = new Response('invalid'); }],
    ['estructura inesperada', () => { plantnetResponse = new Response('{"results":{}}'); }],
    ['candidatos no válidos', () => { plantnetResponse = identifyResponse([null, { score: 0.9 }]); }],
    ['error de red', () => { plantnetFailure = new Error('red caída'); }],
    ['tiempo agotado', () => { plantnetDelay = true; }]
  ]) {
    test(`${scenario[0]}: OpenAI responde sin pista y sin error al usuario`, async () => {
      scenario[1]();
      const response = await post();
      assert.equal(response.status, 200);
      const output = await response.json();
      assert.equal(output.text, '{"speciesName":"Respuesta habitual"}');
      assert.equal(output.candidates, undefined);
      assert.equal(openAiCalls.length, 1);
      assert.equal(openAiCalls[0].messages[0].content.length, 2);
      assert.equal(JSON.stringify(openAiCalls).includes(SECRET), false);
      if (scenario[0] === 'sin clave') assert.equal(plantnetCalls, 0);
    });
  }

  test('no añade candidatos con score inferior a 0.2', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.19, ['escaramujo'])]);
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(openAiCalls[0].messages[0].content.length, 2);
  });

  test('incluye como máximo tres candidatos y acepta el umbral de 0.2', async () => {
    plantnetResponse = identifyResponse([
      candidate('Rosa canina', 0.2), candidate('Rosa gallica', 0.1),
      candidate('Rosa rubiginosa', 0.05), candidate('Rosa chinensis', 0.01)
    ]);
    await post();
    const hint = openAiCalls[0].messages[0].content[0].text;
    assert.match(hint, /Rosa canina \(20 %\)/);
    assert.match(hint, /Rosa rubiginosa/);
    assert.equal(hint.includes('Rosa chinensis'), false);
  });

  test('una cuota agotada impide llamar a Pl@ntNet y OpenAI', async () => {
    for (let i = 0; i < 10; i++) {
      plantnetResponse = identifyResponse([]);
      assert.equal((await post()).status, 200);
    }
    assert.equal((await post()).status, 429);
    assert.equal(plantnetCalls, 10);
    assert.equal(openAiCalls.length, 10);
  });
});
