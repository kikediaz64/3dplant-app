import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidFloatingDate } from '../services/calendarIcs.mjs';

test('isValidFloatingDate validates leap days, clock values, and format', () => {
  assert.equal(isValidFloatingDate('20240229T120000'), true);
  assert.equal(isValidFloatingDate('20230229T120000'), false);
  assert.equal(isValidFloatingDate('20240229T240000'), false);
  assert.equal(isValidFloatingDate('2024-02-29T120000'), false);
});
