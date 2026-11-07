import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      if (existsSync(new URL(url.href + '.ts'))) return next(url.href + '.ts', context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (/\.tsx?$/.test(url)) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext }
      }).outputText
    };
    return next(url, context);
  }
});

const { createRecurringReminderIcs, fertilizerIntervalDays } = await import('../services/calendar.ts');

test('crea un VCALENDAR válido con repetición cada N días y nombre de planta', () => {
  const ics = createRecurringReminderIcs({
    plantName: 'Tomate', kind: 'riego', intervalDays: 4,
    start: new Date('2026-11-07T09:00:00.000Z')
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(ics, /BEGIN:VEVENT\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=4\r\n/);
  assert.match(ics, /SUMMARY:Regar Tomate\r\n/);
  assert.match(ics, /DTSTART:20261107T090000Z\r\n/);
  assert.match(ics, /END:VEVENT\r\nEND:VCALENDAR\r\n$/);
});

test('escapa coma, punto y coma, barras inversas y saltos de línea en el título', () => {
  for (const count of [1, 2]) {
    const plantName = 'Rosa, roja; ' + '\\'.repeat(count) + '\r\nbonita\rfin';
    const ics = createRecurringReminderIcs({ plantName, kind: 'abono', intervalDays: 30 });
    const summary = ics.split('\r\n').find(line => line.startsWith('SUMMARY:'));
    assert.equal(summary, 'SUMMARY:Abonar Rosa\\, roja\\; ' + '\\'.repeat(count * 2) + '\\nbonita\\nfin');
  }
});

test('pliega nombres largos a 75 bytes sin romper caracteres UTF-8', () => {
  const name = '🌱 Árbol, limón; '.repeat(20);
  const ics = createRecurringReminderIcs({ plantName: name, kind: 'riego', intervalDays: 7 });
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
  const unfolded = ics.replace(/\r\n /g, '');
  assert.ok(unfolded.includes('SUMMARY:Regar ' + name.replace(/,/g, '\\,').replace(/;/g, '\\;') + '\r\n'));
});

test('rechaza intervalos y fechas inválidos', () => {
  for (const intervalDays of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => createRecurringReminderIcs({ plantName: 'Rosa', kind: 'riego', intervalDays }), RangeError);
  }
  assert.throws(() => createRecurringReminderIcs({ plantName: 'Rosa', kind: 'riego', intervalDays: 3, start: new Date('invalid') }), RangeError);
});

test('solo extrae intervalos de abono claros', () => {
  assert.equal(fertilizerIntervalDays('Abonar cada 2 semanas durante primavera'), 14);
  assert.equal(fertilizerIntervalDays('Aplicar mensualmente en temporada de crecimiento'), 30);
  assert.equal(fertilizerIntervalDays('Abono ocasional según necesidad'), undefined);
  for (const text of ['Cada 0 días', 'Cada 2-3 semanas', 'Cada 2 o 3 semanas', 'Cada 1,5 meses', 'No abonar mensualmente', 'Cada 2 meses o cada 3 semanas']) {
    assert.equal(fertilizerIntervalDays(text), undefined, text);
  }
});
