import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MIN_ALTERNATIVE_SCORE as serverThreshold } from '../netlify/functions/ai.mjs';
import { MIN_ALTERNATIVE_SCORE as clientThreshold } from '../services/diagnosisCandidates.ts';

test('el umbral de candidatas del servidor y del cliente coincide', () => {
  assert.equal(serverThreshold, clientThreshold);
});
