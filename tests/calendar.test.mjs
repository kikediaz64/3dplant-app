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

const { createRecurringReminderIcs, fertilizerIntervalDays, isIOS, nextReminderStart, reminderPlantName } = await import('../services/calendar.ts');

test('normaliza el nombre de planta para el endpoint de recordatorios', () => {
  assert.equal(reminderPlantName('Tomate'), 'Tomate');
  assert.equal(reminderPlantName('  Tomate  '), 'Tomate');
  assert.equal(reminderPlantName('   '), 'Planta');
  assert.equal(reminderPlantName('a'.repeat(81)), 'a'.repeat(80));
  assert.equal(reminderPlantName('a'.repeat(80)), 'a'.repeat(80));
  assert.equal(reminderPlantName('a'.repeat(78) + '🌱x'), 'a'.repeat(78) + '🌱');
  assert.equal(reminderPlantName('🌱'.repeat(41)), '🌱'.repeat(40));
  assert.equal(reminderPlantName('a'.repeat(78) + '  x'), 'a'.repeat(78));
  const emojiName = 'a'.repeat(79) + '🌱x';
  const shortened = reminderPlantName(emojiName);
  assert.ok(shortened.length <= 80);
  assert.equal(shortened, 'a'.repeat(79));
  assert.equal(/(?:[\uD800-\uDBFF]$|^[\uDC00-\uDFFF])/.test(shortened), false);
});

test('crea un VCALENDAR válido con repetición cada N días y nombre de planta', () => {
  const ics = createRecurringReminderIcs({
    plantName: 'Tomate', kind: 'riego', intervalDays: 4,
    start: new Date(2026, 10, 7, 9, 0, 0)
  });
  assert.match(ics, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\n/);
  assert.match(ics, /BEGIN:VEVENT\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=4\r\n/);
  assert.match(ics, /SUMMARY:Regar Tomate\r\n/);
  assert.match(ics, /DTSTART:20261107T090000\r\n/);
  assert.match(ics, /DTEND:20261107T093000\r\n/);
  assert.match(ics, /DTSTAMP:\d{8}T\d{6}Z\r\n/);
  assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:Regar Tomate\r\nTRIGGER:PT0M\r\nEND:VALARM\r\n/);
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

test('isIOS detecta iPhone, iPad como Mac y descarta Android y escritorio', () => {
  assert.equal(isIOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1', 'iPhone', 5), true);
  assert.equal(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 'MacIntel', 5), true);
  assert.equal(isIOS('Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/120', 'Linux armv81', 5), false);
  assert.equal(isIOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120', 'Win32', 0), false);
  assert.equal(isIOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', 'MacIntel', 0), false);
});

test('nextReminderStart usa la próxima fecha de riego a las 09:00 o mañana', () => {
  const now = new Date(2026, 10, 7, 15, 30, 0);
  const at = (y, m, d) => new Date(y, m, d, 9, 0, 0, 0).getTime();
  assert.equal(nextReminderStart({ lastWateredAt: new Date(2026, 10, 6, 12).toISOString(), intervalDays: 5, now }).getTime(), at(2026, 10, 11));
  assert.equal(nextReminderStart({ lastWateredAt: new Date(2026, 9, 1, 12).toISOString(), intervalDays: 3, now }).getTime(), at(2026, 10, 8));
  assert.equal(nextReminderStart({ intervalDays: 3, now }).getTime(), at(2026, 10, 8));
  assert.equal(nextReminderStart({ lastWateredAt: 'no-fecha', intervalDays: 3, now }).getTime(), at(2026, 10, 8));
});

test('solo extrae intervalos de abono claros', () => {
  assert.equal(fertilizerIntervalDays('Abonar cada 2 semanas durante primavera'), 14);
  assert.equal(fertilizerIntervalDays('Aplicar mensualmente en temporada de crecimiento'), 30);
  assert.equal(fertilizerIntervalDays('Abono ocasional según necesidad'), undefined);
  for (const text of ['Cada 0 días', 'Cada 2-3 semanas', 'Cada 2 o 3 semanas', 'Cada 1,5 meses', 'No abonar mensualmente', 'Cada 2 meses o cada 3 semanas']) {
    assert.equal(fertilizerIntervalDays(text), undefined, text);
  }
});
