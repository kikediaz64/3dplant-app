import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const entries = new Map();
let version = 0;
const store = {
  async getWithMetadata(key) {
    const entry = entries.get(key);
    return entry ? { data: entry.value, etag: entry.etag } : null;
  },
  async setJSON(key, value, options = {}) {
    const entry = entries.get(key);
    if (options.onlyIfNew && entry) return { modified: false };
    if (options.onlyIfMatch && (!entry || entry.etag !== options.onlyIfMatch)) return { modified: false };
    const etag = String(++version);
    entries.set(key, { value, etag });
    return { modified: true, etag };
  }
};
mock.module('@netlify/blobs', { exports: { getStore: () => store } });

const bytes = Buffer.alloc(5000, 7);
bytes.set([0xff, 0xd8, 0xff, 0xe0]);
const IMAGE = `data:image/jpeg;base64,${bytes.toString('base64')}`;
const CONTENT = '{"speciesName":"Prueba"}';
let finishReason;
let openAiPayload;

globalThis.fetch = async (url, init) => {
  assert.equal(String(url), 'https://api.openai.com/v1/chat/completions');
  openAiPayload = JSON.parse(init.body);
  return new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content: CONTENT } }] }), { status: 200 });
};
process.env.OPENAI_API_KEY = 'openai-test-key';
delete process.env.PLANTNET_API_KEY;
const { default: handler } = await import('../netlify/functions/ai.mjs');

const post = () => handler(new Request('https://example.test/api/ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'diagnose', imageBase64: IMAGE })
}), { ip: '1.2.3.4', deploy: { context: 'production' } });

describe('diagnose response length', () => {
  beforeEach(() => { entries.clear(); version = 0; finishReason = 'stop'; openAiPayload = null; });

  test('returns 502 with truncated code when OpenAI finishes at the length limit', async () => {
    finishReason = 'length';
    const response = await post();
    assert.equal(response.status, 502);
    assert.equal(response.headers.get('Content-Type'), 'application/json');
    assert.deepEqual(await response.json(), {
      error: 'La respuesta de la IA llegó incompleta. Vuelve a intentarlo.',
      code: 'truncated'
    });
  });

  test('passes through text when OpenAI finishes normally', async () => {
    const response = await post();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: CONTENT });
  });

  test('sends max_tokens 2000 for diagnose', async () => {
    await post();
    assert.equal(openAiPayload.max_tokens, 2000);
  });
});
