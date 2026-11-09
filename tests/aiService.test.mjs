import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

const { options: compilerOptions } = ts.convertCompilerOptionsFromJson(
  JSON.parse(readFileSync(new URL('../tsconfig.json', import.meta.url), 'utf8')).compilerOptions,
  process.cwd()
);

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const ext of ['.ts', '.tsx']) {
        if (existsSync(new URL(url.href + ext))) return next(url.href + ext, context);
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions
      }).outputText
    };
    return next(url, context);
  }
});
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
