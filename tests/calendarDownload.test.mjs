import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../services/calendar.ts', import.meta.url), 'utf8')
  .replace("'./calendarIcs.mjs'", JSON.stringify(new URL('../services/calendarIcs.mjs', import.meta.url).href));
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { downloadCalendarReminder } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('descarga recordatorios en Safari, pantalla de inicio y mediante Blob', async t => {
  const params = { plantName: 'Rosa; roja, bonita\n🌱', kind: 'riego', intervalDays: 4, start: new Date(2026, 10, 11, 23, 45) };
  for (const scenario of ['safari', 'standalone', 'android', 'desktop', 'ios-without-params']) {
    await t.test(scenario, async t => {
      const replaceGlobal = (key, value) => {
        const original = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
        t.after(() => original ? Object.defineProperty(globalThis, key, original) : delete globalThis[key]);
      };
      const ios = !['android', 'desktop'].includes(scenario);
      replaceGlobal('navigator', { userAgent: ios ? 'iPhone' : scenario, platform: ios ? 'iPhone' : '', maxTouchPoints: ios ? 5 : 0, standalone: scenario === 'standalone' });
      const location = { href: '' };
      const open = t.mock.fn();
      replaceGlobal('window', { location, open });
      const link = { click: t.mock.fn(), remove: t.mock.fn() };
      const appendChild = t.mock.fn();
      replaceGlobal('document', { createElement: () => link, body: { appendChild } });
      const create = t.mock.method(URL, 'createObjectURL', () => 'blob:calendar');
      const revoke = t.mock.method(URL, 'revokeObjectURL', () => {});
      downloadCalendarReminder('BEGIN:VCALENDAR', 'riego-rosa.ics', scenario === 'ios-without-params' ? undefined : params);
      if (scenario === 'safari' || scenario === 'standalone') {
        const target = scenario === 'safari' ? location.href : open.mock.calls[0].arguments[0];
        const url = new URL(target, 'https://example.test');
        assert.equal(url.pathname, '/api/recordatorio');
        assert.deepEqual(Object.fromEntries(url.searchParams), { nombre: params.plantName, tipo: 'riego', cada: '4', inicio: '20261111T234500' });
        assert.equal(create.mock.callCount(), 0);
        if (scenario === 'standalone') {
          assert.equal(open.mock.calls[0].arguments[1], '_blank');
          assert.equal(location.href, '');
        } else assert.equal(open.mock.callCount(), 0);
      } else {
        assert.equal(await create.mock.calls[0].arguments[0].text(), 'BEGIN:VCALENDAR');
        assert.equal(link.href, 'blob:calendar');
        assert.equal(link.download, 'riego-rosa.ics');
        assert.equal(appendChild.mock.callCount(), 1);
        assert.equal(link.click.mock.callCount(), 1);
        assert.equal(link.remove.mock.callCount(), 1);
        await new Promise(resolve => setTimeout(resolve, 1100));
        assert.equal(revoke.mock.calls[0].arguments[0], 'blob:calendar');
      }
    });
  }
});

test('la URL de recordatorio en iOS incluye el nombre limitado a 80 unidades UTF-16', () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'iPhone', platform: 'iPhone', maxTouchPoints: 5 } });
  const location = { href: '' };
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { location, open() {} } });
  try {
    for (const [plantName, expected] of [
      ['  ' + 'a'.repeat(79) + '🌱x  ', 'a'.repeat(79)],
      ['a'.repeat(81), 'a'.repeat(80)],
      ['  Rosa  ', 'Rosa'],
      ['   ', 'Planta'],
    ]) {
      downloadCalendarReminder('', '', { plantName, kind: 'riego', intervalDays: 4, start: new Date(2026, 10, 11, 9) });
      const url = new URL(location.href, 'https://example.test');
      assert.equal(url.searchParams.get('nombre'), expected);
    }
  } finally {
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});
