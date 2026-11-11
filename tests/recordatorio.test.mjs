import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/recordatorio.mjs';

const request = (values = {}, method = 'GET') => {
  const url = new URL('https://example.test/api/recordatorio');
  for (const [key, value] of Object.entries({ nombre: 'Monstera', tipo: 'riego', cada: '4', inicio: '20261107T090000', ...values })) url.searchParams.set(key, value);
  return new Request(url, { method });
};

test('devuelve un calendario válido usando una hora local flotante', async () => {
  const response = await handler(request());
  const ics = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/calendar; charset=utf-8$/);
  assert.match(response.headers.get('content-disposition'), /inline; filename="riego-Monstera\.ics"/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(ics, /SUMMARY:Regar Monstera\r\n/);
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=4\r\n/);
  assert.match(ics, /DTSTART:20261107T090000\r\n/);
  assert.match(ics, /DTEND:20261107T093000\r\n/);
});

test('el fin del evento pasa al día siguiente para un inicio a las 23:45', async () => {
  const response = await handler(request({ inicio: '20261231T234500' }));
  const ics = await response.text();
  assert.equal(response.status, 200);
  assert.match(ics, /DTSTART:20261231T234500\r\n/);
  assert.match(ics, /DTEND:20270101T001500\r\n/);
});

test('rechaza parámetros fuera de rango, formatos inválidos y nombres inválidos', async () => {
  const invalid = [
    { cada: '0' }, { cada: 'abc' }, { tipo: 'otro' }, { inicio: '20261107' },
    { inicio: '20260230T090000' }, { nombre: '   ' }, { nombre: 'x'.repeat(81) }
  ];
  for (const values of invalid) assert.equal((await handler(request(values))).status, 400, JSON.stringify(values));
  assert.equal((await handler(request({}, 'POST'))).status, 405);
});

test('escapa coma, punto y coma y saltos de línea en nombres', async () => {
  const response = await handler(request({ nombre: 'Rosa; roja, bonita\nfin' }));
  const ics = await response.text();
  assert.equal(response.status, 200);
  assert.match(ics, /SUMMARY:Regar Rosa\\; roja\\, bonita\\nfin\r\n/);
});

test('admite abono y nombres de 80 caracteres tras trim', async () => {
  const nombre = 'á'.repeat(80);
  const response = await handler(request({ nombre: ` ${nombre} `, tipo: 'abono', cada: '365' }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^inline; filename="abono-a{80}\.ics"$/);
  const ics = (await response.text()).replace(/\r\n /g, '');
  assert.ok(ics.includes(`SUMMARY:Abonar ${nombre}\r\n`));
  assert.match(ics, /RRULE:FREQ=DAILY;INTERVAL=365\r\n/);
});

test('valida límites y fechas reales, incluido febrero bisiesto', async () => {
  for (const values of [{ cada: '366' }, { cada: '1.5' }, { inicio: '20261111T240000' }, { inicio: '20261111T096000' }, { inicio: '20261111T090060' }, { inicio: '20260229T090000' }]) {
    assert.equal((await handler(request(values))).status, 400, JSON.stringify(values));
  }
  const response = await handler(request({ inicio: '20280229T234500' }));
  assert.equal(response.status, 200);
  assert.match(await response.text(), /DTEND:20280301T001500\r\n/);
});
