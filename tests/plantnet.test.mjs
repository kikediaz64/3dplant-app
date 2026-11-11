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
let receivedImages;
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
  assert.equal(url.searchParams.get('nb-results'), '4');
  assert.equal(url.searchParams.get('include-related-images'), 'true');
  assert.equal(init.body.get('organs'), 'auto');
  receivedImages = init.body.getAll('images');
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
const { HINT_MIN_SCORE } = await import('../netlify/lib/plantnet.mjs');

const post = () => handler(new Request('https://example.test/api/ai', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'diagnose', imageBase64: IMAGE })
}), { ip: '1.2.3.4', deploy: { context: 'production' } });
const identifyResponse = results => new Response(JSON.stringify({ results }), { status: 200 });
const candidate = (name, score, commonNames = [], images) => ({ species: { scientificNameWithoutAuthor: name, commonNames }, score, ...(images ? { images } : {}) });

describe('integración opcional con Pl@ntNet', () => {
  test('el umbral de pista a la IA es 0.2', () => {
    assert.equal(HINT_MIN_SCORE, 0.2);
  });

  beforeEach(() => {
    stores.clear(); openAiCalls.length = 0;
    plantnetCalls = 0;
    plantnetResponse = identifyResponse([]);
    plantnetFailure = null;
    plantnetDelay = false;
    process.env.PLANTNET_API_KEY = SECRET;
  });

  test('envía las tres fotos completas a ambos proveedores y cuenta una consulta', async () => {
    const response = await handler(new Request('https://example.test/api/ai', {
      method: 'POST', body: JSON.stringify({ action: 'diagnose', imagesBase64: [IMAGE, IMAGE, IMAGE] })
    }), { ip: '1.2.3.4', deploy: { context: 'production' } });
    assert.equal(response.status, 200);
    assert.equal(receivedImages.length, 3);
    for (const image of receivedImages) assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(validBase64(), 'base64'));
    assert.equal(openAiCalls[0].messages[0].content.filter(part => part.type === 'image_url').length, 3);
    assert.equal([...stores.entries()].find(([key]) => key.endsWith('/global'))[1].count, 1);
  });

  test('los 5 s de Pl@ntNet dejan solo 19 s para OpenAI, incluida la lectura del cuerpo', async () => {
    const realFetch = globalThis.fetch;
    const realTimeout = globalThis.setTimeout;
    const realClear = globalThis.clearTimeout;
    const timers = new Map();
    let clock = 0;
    const dateMock = mock.method(Date, 'now', () => clock);
    const timerMock = mock.method(globalThis, 'setTimeout', (fn, ms) => {
      const id = realTimeout(fn, ms);
      timers.set(id, ms);
      return id;
    });
    const clearMock = mock.method(globalThis, 'clearTimeout', id => { timers.delete(id); realClear(id); });
    globalThis.fetch = async (url, init) => {
      if (String(url).startsWith('https://my-api.plantnet.org/')) {
        clock += 5000;
        return identifyResponse([]);
      }
      assert.equal([...timers.values()].includes(19000), true);
      return { ok: true, async json() {
        assert.equal([...timers.values()].includes(19000), true);
        return { choices: [{ message: { content: '{}' } }] };
      } };
    };
    try {
      assert.equal((await post()).status, 200);
      assert.equal(timers.size, 0);
    } finally {
      globalThis.fetch = realFetch;
      dateMock.mock.restore(); timerMock.mock.restore(); clearMock.mock.restore();
      for (const id of timers.keys()) realClear(id);
    }
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
    assert.equal(output.candidates.length, 2);
    assert.deepEqual(output.candidates[0], { scientificName: 'Monstera deliciosa', commonNames: ['costilla de Adán'], score: 0.85, imageUrl: 'https://images.test/monstera.jpg' });
    assert.match(openAiCalls[0].messages[0].content[0].text, /Monstera deliciosa \(costilla de Adán\) \(85 %\)/);
    assert.equal(openAiCalls[0].messages[0].content[0].text.includes('Philodendron'), false);
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
      let response;
      if (scenario[0] === 'tiempo agotado') {
        const realTimeout = globalThis.setTimeout;
        const timerMock = mock.method(globalThis, 'setTimeout', (callback, ms, ...args) =>
          ms === 5000 ? realTimeout(callback, 0, ...args) : realTimeout(callback, ms, ...args)
        );
        try {
          response = await Promise.race([
            post(),
            new Promise((_, reject) => realTimeout(() => reject(new Error('Pl@ntNet no agotó el tiempo')), 400))
          ]);
        } finally {
          timerMock.mock.restore();
        }
      } else {
        response = await post();
      }
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

  test('con score entre 0.05 y 0.2 devuelve la alternativa pero no la pista a la IA', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.07, ['escaramujo'])]);
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(openAiCalls[0].messages[0].content.length, 2);
    assert.deepEqual((await response.json()).candidates.map(c => c.scientificName), ['Rosa canina']);
  });

  test('no devuelve candidatos con score inferior a 0.05', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.03, ['escaramujo'])]);
    const response = await post();
    assert.equal(response.status, 200);
    assert.equal(openAiCalls[0].messages[0].content.length, 2);
    assert.equal((await response.json()).candidates, undefined);
  });

  test('la pista a la IA solo incluye candidatos con score >= 0.2', async () => {
    plantnetResponse = identifyResponse([
      candidate('Rosa canina', 0.2), candidate('Rosa gallica', 0.1),
      candidate('Rosa rubiginosa', 0.05), candidate('Rosa chinensis', 0.01)
    ]);
    const output = await (await post()).json();
    const hint = openAiCalls[0].messages[0].content[0].text;
    assert.match(hint, /Rosa canina \(20 %\)/);
    assert.equal(hint.includes('Rosa gallica'), false);
    assert.equal(hint.includes('Rosa rubiginosa'), false);
    assert.equal(output.candidates.length, 3);
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

  const postWith = confirmedSpecies => handler(new Request('https://example.test/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'diagnose', imageBase64: IMAGE, confirmedSpecies })
  }), { ip: '1.2.3.4', deploy: { context: 'production' } });

  test('con especie confirmada no llama a Pl@ntNet, lo indica a la IA y no devuelve candidatos', async () => {
    plantnetResponse = identifyResponse([candidate('Rosa canina', 0.9, ['Rosal'])]);
    const response = await postWith({ scientificName: ' Nerium oleander ', commonName: 'Adelfa' });
    assert.equal(response.status, 200);
    assert.equal(plantnetCalls, 0);
    assert.equal(openAiCalls.length, 1);
    const content = openAiCalls[0].messages[0].content;
    assert.equal(content[0].type, 'text');
    assert.match(content[0].text, /^El usuario ha confirmado que la especie es Nerium oleander \(Adelfa\)\. Usa exactamente esos valores en speciesName y scientificName/);
    assert.equal(content.length, 3);
    assert.equal((await response.json()).candidates, undefined);
  });

  test('con especie confirmada sin nombre común omite el paréntesis', async () => {
    await postWith({ scientificName: 'Ficus × carica' });
    assert.match(openAiCalls[0].messages[0].content[0].text, /es Ficus × carica\. Usa exactamente/);
  });

  test('un nombre común con caracteres no admitidos se descarta sin fallar', async () => {
    for (const commonName of ['Costilla de Adán, monstera', 'b'.repeat(101), 'Ro\nsal']) {
      openAiCalls.length = 0;
      const response = await postWith({ scientificName: 'Monstera deliciosa', commonName });
      assert.equal(response.status, 200);
      assert.match(openAiCalls[0].messages[0].content[0].text, /es Monstera deliciosa\. Usa exactamente/);
    }
  });

  test('una especie confirmada no válida devuelve 400 sin gastar cuota ni llamar a nadie', async () => {
    const invalid = [
      { scientificName: 'a'.repeat(101) }, { scientificName: '' }, { scientificName: 42 },
      { scientificName: 'Rosa', commonName: 5 }, { scientificName: 'Rosa', commonName: {} },
      { scientificName: 'Rosa <b>' }, { scientificName: 'Rosa\ncanina' },
      'Rosa canina', ['Rosa'], null
    ];
    for (let i = 0; i < 3; i++) {
      for (const value of invalid) {
        const response = await postWith(value);
        assert.equal(response.status, 400, JSON.stringify(value));
        assert.deepEqual(await response.json(), { error: 'Petición no válida.' });
      }
    }
    assert.equal(plantnetCalls, 0);
    assert.equal(openAiCalls.length, 0);
    for (let i = 0; i < 10; i++) assert.equal((await postWith({ scientificName: 'Rosa canina' })).status, 200);
    assert.equal((await postWith({ scientificName: 'Rosa canina' })).status, 429);
  });
});

