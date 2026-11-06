// Pruebas de A1 (validación de imagen y tope diario). Sin red: Netlify Blobs y OpenAI están simulados.
// Ejecutar: node --test --experimental-test-module-mocks tests/
import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validateImage, consumeDailyQuota, dailyStoreName, DAILY_LIMITS, MAX_IMAGE_BASE64_CHARS } from '../netlify/lib/limites.mjs';

// --- Utilidades -------------------------------------------------------------

const tick = () => new Promise(resolve => setImmediate(resolve));

// Almacén falso con la misma semántica que Netlify Blobs: ETag, onlyIfNew y onlyIfMatch.
class FakeStore {
  constructor() { this.entries = new Map(); this.version = 0; }
  async getWithMetadata(key) {
    await tick();
    const entry = this.entries.get(key);
    return entry ? { data: JSON.parse(entry.value), etag: entry.etag, metadata: {} } : null;
  }
  async setJSON(key, value, options = {}) {
    await tick();
    const entry = this.entries.get(key);
    if (options.onlyIfNew && entry) return { modified: false };
    if (options.onlyIfMatch && (!entry || entry.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = `"${++this.version}"`;
    this.entries.set(key, { value: JSON.stringify(value), etag });
    return { modified: true, etag };
  }
  count(fragment) {
    for (const [key, entry] of this.entries) if (key.includes(fragment)) return JSON.parse(entry.value).count;
    return 0;
  }
}

const jpegBase64 = (bytes = 5000) => {
  const buf = Buffer.alloc(bytes, 7);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; buf[3] = 0xe0;
  return buf.toString('base64');
};
const JPEG_DATA_URL = `data:image/jpeg;base64,${jpegBase64()}`;

// --- validateImage -----------------------------------------------------------

describe('validateImage', () => {
  test('rechaza imagen ausente, vacía o que no es texto (400)', () => {
    for (const raw of [undefined, null, '', 123, {}]) {
      const r = validateImage(raw);
      assert.equal(r.ok, false);
      assert.equal(r.status, 400);
    }
  });

  test('rechaza imagen por encima del tope (413)', () => {
    const r = validateImage('A'.repeat(MAX_IMAGE_BASE64_CHARS + 4));
    assert.equal(r.status, 413);
  });

  test('rechaza tipos que no son JPEG (PNG por cabecera data: y PDF por contenido)', () => {
    const png = validateImage(`data:image/png;base64,${jpegBase64()}`);
    assert.equal(png.ok, false);
    assert.match(png.error, /JPEG/);
    const pdf = Buffer.alloc(5000, 7); pdf.write('%PDF-1.7');
    const r = validateImage(`data:image/jpeg;base64,${pdf.toString('base64')}`);
    assert.equal(r.ok, false);
    assert.match(r.error, /JPEG/);
  });

  test('rechaza base64 basura', () => {
    for (const raw of ['hola mundo!!', 'data:image/jpeg;base64,@@@@', 'abc']) {
      const r = validateImage(raw);
      assert.equal(r.ok, false);
      assert.equal(r.status, 400);
    }
  });

  test('rechaza JPEG demasiado pequeño', () => {
    const r = validateImage(`data:image/jpeg;base64,${jpegBase64(200)}`);
    assert.equal(r.ok, false);
    assert.match(r.error, /pequeña/);
  });

  test('acepta JPEG como data URL (formato real de la app) y como base64 sin prefijo', () => {
    const a = validateImage(JPEG_DATA_URL);
    assert.equal(a.ok, true);
    assert.equal(a.base64, jpegBase64());
    const b = validateImage(jpegBase64());
    assert.equal(b.ok, true);
    assert.equal(validateImage(`data:image/jpg;base64,${jpegBase64()}`).ok, true);
  });
});

// --- dailyStoreName ----------------------------------------------------------

describe('dailyStoreName', () => {
  test('producción conserva el nombre original; cada otro contexto tiene el suyo', () => {
    assert.equal(dailyStoreName('production'), 'consultas-diarias');
    assert.equal(dailyStoreName('deploy-preview'), 'consultas-diarias-deploy-preview');
    assert.equal(dailyStoreName('branch-deploy'), 'consultas-diarias-branch-deploy');
    assert.equal(dailyStoreName('dev'), 'consultas-diarias-dev');
    assert.equal(dailyStoreName(undefined), 'consultas-diarias-desconocido');
  });

  test('nombres válidos para Blobs aunque el contexto sea una rama rara (sin "/" ni ":", máx. 64 bytes)', () => {
    const name = dailyStoreName('feature/a1:prueba-' + 'x'.repeat(100));
    assert.ok(!/[/:]/.test(name), name);
    assert.ok(Buffer.byteLength(name) <= 64, name);
  });
});

// --- consumeDailyQuota -------------------------------------------------------

describe('consumeDailyQuota', () => {
  const now = new Date('2026-10-29T12:00:00Z');

  test('por IP: 10 diagnósticos y el 11.º se rechaza', async () => {
    const store = new FakeStore();
    for (let i = 0; i < DAILY_LIMITS.diagnose.perIp; i++) {
      assert.deepEqual(await consumeDailyQuota(store, { action: 'diagnose', ip: '1.1.1.1', now }), { allowed: true });
    }
    assert.deepEqual(await consumeDailyQuota(store, { action: 'diagnose', ip: '1.1.1.1', now }), { allowed: false, scope: 'ip' });
    // Otra IP sigue pudiendo.
    assert.equal((await consumeDailyQuota(store, { action: 'diagnose', ip: '2.2.2.2', now })).allowed, true);
  });

  test('global: 30 diagnósticos entre varias IP y el 31.º se rechaza', async () => {
    const store = new FakeStore();
    let allowed = 0;
    for (let i = 0; i < 35; i++) {
      const r = await consumeDailyQuota(store, { action: 'diagnose', ip: `10.0.0.${i % 5}`, now });
      if (r.allowed) allowed++; else assert.equal(r.scope, 'global');
    }
    assert.equal(allowed, DAILY_LIMITS.diagnose.global);
    assert.equal(store.count('/diagnose/global'), 30);
  });

  test('una IP bloqueada no gasta el cupo global', async () => {
    const store = new FakeStore();
    for (let i = 0; i < 15; i++) await consumeDailyQuota(store, { action: 'diagnose', ip: '6.6.6.6', now });
    assert.equal(store.count('/diagnose/global'), 10);
  });

  test('preguntas: 30 por IP y 100 globales, con contadores separados de los diagnósticos', async () => {
    const store = new FakeStore();
    for (let i = 0; i < 30; i++) assert.equal((await consumeDailyQuota(store, { action: 'ask', ip: '3.3.3.3', now })).allowed, true);
    assert.deepEqual(await consumeDailyQuota(store, { action: 'ask', ip: '3.3.3.3', now }), { allowed: false, scope: 'ip' });
    assert.equal((await consumeDailyQuota(store, { action: 'diagnose', ip: '3.3.3.3', now })).allowed, true);
    let allowed = 30;
    for (let i = 0; i < 80; i++) if ((await consumeDailyQuota(store, { action: 'ask', ip: `20.0.${i % 8}.1`, now })).allowed) allowed++;
    assert.equal(allowed, DAILY_LIMITS.ask.global);
  });

  test('el contador se reinicia al cambiar el día (UTC)', async () => {
    const store = new FakeStore();
    for (let i = 0; i < 10; i++) await consumeDailyQuota(store, { action: 'diagnose', ip: '4.4.4.4', now });
    assert.equal((await consumeDailyQuota(store, { action: 'diagnose', ip: '4.4.4.4', now })).allowed, false);
    const tomorrow = new Date('2026-10-30T00:00:01Z');
    assert.equal((await consumeDailyQuota(store, { action: 'diagnose', ip: '4.4.4.4', now: tomorrow })).allowed, true);
  });

  test('la IP no se guarda en claro', async () => {
    const store = new FakeStore();
    await consumeDailyQuota(store, { action: 'diagnose', ip: '83.45.12.200', now });
    for (const key of store.entries.keys()) assert.ok(!key.includes('83.45.12.200'), key);
  });

  test('peticiones simultáneas moderadas (5 a la vez) se cuentan todas sin pisarse', async () => {
    const store = new FakeStore();
    const results = await Promise.all(Array.from({ length: 5 }, (_, i) =>
      consumeDailyQuota(store, { action: 'diagnose', ip: `7.7.7.${i}`, now })));
    assert.ok(results.every(r => r.allowed));
    assert.equal(store.count('/diagnose/global'), 5);
  });

  test('ráfaga simultánea grande: nunca se supera el tope (lo que no se cuenta falla, no pasa)', async () => {
    const store = new FakeStore();
    const settled = await Promise.allSettled(Array.from({ length: 40 }, (_, i) =>
      consumeDailyQuota(store, { action: 'diagnose', ip: `8.8.${i}.8`, now })));
    const allowed = settled.filter(s => s.status === 'fulfilled' && s.value.allowed).length;
    const failed = settled.filter(s => s.status === 'rejected').length;
    assert.ok(allowed <= DAILY_LIMITS.diagnose.global, `permitidas ${allowed}`);
    assert.equal(store.count('/diagnose/global'), allowed);
    console.log(`  ráfaga de 40: permitidas ${allowed}, fallidas por contador ocupado ${failed}`);
  });

  test('si el contador está siempre ocupado, lanza error (para responder 503)', async () => {
    const busy = new FakeStore();
    busy.setJSON = async () => ({ modified: false });
    await assert.rejects(consumeDailyQuota(busy, { action: 'diagnose', ip: '5.5.5.5', now }), /Contador ocupado/);
  });
});

// --- Función ai.mjs completa (Blobs y OpenAI simulados) -------------------------

describe('ai.mjs con Blobs y OpenAI simulados', async () => {
  // Un almacén falso por nombre, como Blobs. `currentStore` sustituye a todos cuando se quiere simular un fallo.
  let stores = new Map();
  let currentStore = null;
  const storeNames = [];
  const getStore = ({ name }) => {
    storeNames.push(name);
    if (currentStore) return currentStore;
    if (!stores.has(name)) stores.set(name, new FakeStore());
    return stores.get(name);
  };
  mock.module('@netlify/blobs', { namedExports: { getStore } });
  const prod = () => stores.get('consultas-diarias') ?? new FakeStore();

  const openAICalls = [];
  globalThis.fetch = async (url, init) => {
    if (!String(url).startsWith('https://api.openai.com/')) throw new Error(`Red no permitida en pruebas: ${url}`);
    openAICalls.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"speciesName":"Prueba"}' } }] }), { status: 200 });
  };
  process.env.OPENAI_API_KEY = 'sk-falsa-solo-pruebas';
  const { default: handler } = await import('../netlify/functions/ai.mjs');

  // Por defecto, como en producción: con IP y contexto "production".
  const post = (body, ctx = { ip: '9.9.9.9', deploy: { context: 'production' } }) => handler(
    new Request('https://ejemplo.test/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    ctx
  );

  beforeEach(() => { stores = new Map(); currentStore = null; storeNames.length = 0; openAICalls.length = 0; });

  test('diagnóstico sin imagen → 400 y no llama a OpenAI ni cuenta', async () => {
    const res = await post({ action: 'diagnose' });
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /imagen/);
    assert.equal(openAICalls.length, 0);
    assert.equal(stores.size, 0);
  });

  test('diagnóstico con PNG → 400 y no llama a OpenAI', async () => {
    const res = await post({ action: 'diagnose', imageBase64: `data:image/png;base64,${jpegBase64()}` });
    assert.equal(res.status, 400);
    assert.equal(openAICalls.length, 0);
  });

  test('diagnóstico válido → 200, una llamada simulada con la imagen y contador a 1', async () => {
    const res = await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL });
    assert.equal(res.status, 200);
    assert.equal(openAICalls.length, 1);
    assert.equal(openAICalls[0].messages[0].content[1].image_url.url, JPEG_DATA_URL);
    assert.deepEqual(storeNames, ['consultas-diarias']);
    assert.equal(prod().count('/diagnose/global'), 1);
  });

  test('vista previa y producción no comparten cupo', async () => {
    const preview = { ip: '9.9.9.9', deploy: { context: 'deploy-preview' } };
    // Gasta el cupo diario de la IP en la vista previa...
    for (let i = 0; i < 10; i++) assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, preview)).status, 200);
    assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, preview)).status, 429);
    assert.equal(stores.get('consultas-diarias-deploy-preview').count('/diagnose/global'), 10);
    assert.equal(stores.has('consultas-diarias'), false);
    // ...y la misma IP sigue pudiendo en producción, con su contador a 1.
    assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL })).status, 200);
    assert.equal(prod().count('/diagnose/global'), 1);
    // Una rama (branch deploy) tampoco toca producción.
    assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, { ip: '9.9.9.9', deploy: { context: 'branch-deploy' } })).status, 200);
    assert.equal(prod().count('/diagnose/global'), 1);
  });

  test('sin IP (context.ip vacío): aviso claro en el log y todas comparten el cupo "desconocida"', async () => {
    const warnings = mock.method(console, 'warn', () => {});
    try {
      for (const ctx of [{ deploy: { context: 'production' } }, { ip: '', deploy: { context: 'production' } }, {}]) {
        assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, ctx)).status, 200);
      }
      assert.equal(warnings.mock.callCount(), 3);
      assert.match(warnings.mock.calls[0].arguments[0], /AVISO A1: no ha llegado la IP del visitante \(context\.ip vacío\)/);
      // Sin contexto de despliegue va a un almacén aparte, nunca al de producción.
      assert.equal(stores.get('consultas-diarias-desconocido').count('/diagnose/global'), 1);
      // Las dos de producción sin IP cuentan en el mismo grupo: 8 más y el cupo de 10 se agota.
      for (let i = 0; i < 8; i++) await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, { deploy: { context: 'production' } });
      assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL }, { deploy: { context: 'production' } })).status, 429);
    } finally {
      warnings.mock.restore();
    }
  });

  test('con IP no se registra el aviso', async () => {
    const warnings = mock.method(console, 'warn', () => {});
    await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL });
    warnings.mock.restore();
    assert.equal(warnings.mock.callCount(), 0);
  });

  test('11.º diagnóstico de la misma IP → 429 con JSON {error, code:"daily-limit"} y sin llamada', async () => {
    for (let i = 0; i < 10; i++) assert.equal((await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL })).status, 200);
    const res = await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL });
    assert.equal(res.status, 429);
    const body = await res.json();
    assert.equal(body.code, 'daily-limit');
    assert.ok(body.error);
    assert.equal(openAICalls.length, 10);
  });

  test('preguntas: la 31.ª de la misma IP → 429', async () => {
    for (let i = 0; i < 30; i++) assert.equal((await post({ action: 'ask', question: '¿Riego?' })).status, 200);
    assert.equal((await post({ action: 'ask', question: '¿Riego?' })).status, 429);
    assert.equal(openAICalls.length, 30);
  });

  test('si el almacén falla → 503 y no llama a OpenAI', async () => {
    currentStore = { getWithMetadata: async () => { throw new Error('Blobs caído'); }, setJSON: async () => ({ modified: false }) };
    const errors = mock.method(console, 'error', () => {});
    const res = await post({ action: 'diagnose', imageBase64: JPEG_DATA_URL });
    errors.mock.restore();
    assert.equal(res.status, 503);
    assert.equal(openAICalls.length, 0);
  });

  test('acción desconocida y GET no tocan el contador', async () => {
    assert.equal((await post({ action: 'otra' })).status, 400);
    assert.equal((await handler(new Request('https://ejemplo.test/api/ai'), {})).status, 200);
    assert.equal(stores.size, 0);
    assert.equal(openAICalls.length, 0);
  });
});
