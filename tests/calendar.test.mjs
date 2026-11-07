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

test('escapa coma, punto y coma, barra inversa y saltos de línea en el título', () => {
  const ics = createRecurringReminderIcs({ plantName: 'Rosa, roja; \u005c\u005c\nbonita', kind: 'abono', intervalDays: 30, start: new Date('2026-11-07T09:00:00Z') });
  assert.match(ics, /SUMMARY:Abonar Rosa\\, roja\\; \\\\\\nbonita\r\n/);
});

test('solo extrae intervalos de abono claros', () => {
  assert.equal(fertilizerIntervalDays('Abonar cada 2 semanas durante primavera'), 14);
  assert.equal(fertilizerIntervalDays('Aplicar mensualmente en temporada de crecimiento'), 30);
  assert.equal(fertilizerIntervalDays('Abono ocasional según necesidad'), undefined);
});
