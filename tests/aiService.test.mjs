import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/tsLoader.mjs';
const { diagnosePlant, askPlantExpert, AIUserError } = await import('../services/aiService.ts');

let response;
globalThis.fetch = async () => response;

for (const [action, call] of [
  ['diagnóstico', () => diagnosePlant('imagen-de-prueba')],
  ['pregunta', () => askPlantExpert('¿Qué planta es?')]
]) {
  describe(`429 de ${action}`, () => {
    beforeEach(() => {
      response = null;
    });

    test('daily-limit muestra el mensaje de tope diario y su tipo propio', async () => {
      response = new Response(JSON.stringify({ error: 'Límite diario alcanzado', code: 'daily-limit' }), { status: 429 });
      await assert.rejects(call(), error => {
        assert.ok(error instanceof AIUserError);
        assert.equal(error.kind, 'daily-limit');
        const expectedMessage = action === 'pregunta'
          ? 'Has llegado al límite de preguntas de hoy. Vuelve mañana.'
          : 'Has llegado al límite de diagnósticos de hoy. Vuelve mañana.';
        assert.equal(error.message, expectedMessage);
        return true;
      });
    });

    test('429 sin cuerpo conserva el rate limit de consultas seguidas', async () => {
      response = new Response(null, { status: 429 });
      await assert.rejects(call(), error => {
        assert.ok(error instanceof AIUserError);
        assert.equal(error.kind, 'rate-limit');
        assert.match(error.message, /varias consultas muy seguidas/);
        return true;
      });
    });

    test('429 con JSON sin code conserva el mensaje de servicio no disponible', async () => {
      response = new Response(JSON.stringify({ error: 'quota exceeded' }), { status: 429 });
      await assert.rejects(call(), error => {
        assert.ok(error instanceof AIUserError);
        assert.equal(error.kind, 'unavailable');
        assert.match(error.message, /servicio de diagnóstico no está disponible/);
        return true;
      });
    });
  });
}

describe('historial del asistente', () => {
  let sent;
  beforeEach(() => {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/ai');
      sent = JSON.parse(init.body);
      return new Response(JSON.stringify({ text: 'Respuesta' }));
    };
  });

  test('sin historial conserva la petición original', async () => {
    await askPlantExpert('¿Riego?', 'Monstera');
    assert.deepEqual(sent, { action: 'ask', question: '¿Riego?', plantContext: 'Monstera' });
  });

  for (const count of [0, 6, 8]) {
    test(`envía las últimas seis parejas de ${count}`, async () => {
      const history = Array.from({ length: count }, (_, i) => ({ question: `Pregunta ${i}`, answer: `Respuesta ${i}` }));
      await askPlantExpert('¿Y ahora?', undefined, history);
      assert.deepEqual(sent.history, history.slice(-6));
      assert.equal(history.length, count);
    });
  }

  test('acota el texto de cada mensaje sin mutar el historial', async () => {
    const history = [{ question: 'q'.repeat(501), answer: 'a'.repeat(2000) }];
    await askPlantExpert('¿Y ahora?', undefined, history);
    assert.equal(sent.history[0].question.length, 500);
    assert.equal(sent.history[0].answer.length, 500);
    assert.equal(history[0].answer.length, 2000);
  });
});
