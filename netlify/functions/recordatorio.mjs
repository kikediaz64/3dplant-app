import { createRecurringReminderIcs } from '../../services/calendarIcs.mjs';

const badRequest = () => new Response('Parámetros no válidos.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

function validFloatingDate(value) {
  if (!/^\d{8}T\d{6}$/.test(value)) return false;
  const year = Number(value.slice(0, 4)), month = Number(value.slice(4, 6)), day = Number(value.slice(6, 8));
  const hour = Number(value.slice(9, 11)), minute = Number(value.slice(11, 13)), second = Number(value.slice(13, 15));
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    && hour <= 23 && minute <= 59 && second <= 59;
}

function safeFilename(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'planta';
}

export default async request => {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  const params = new URL(request.url).searchParams;
  const nombre = params.get('nombre')?.trim();
  const tipo = params.get('tipo');
  const cadaText = params.get('cada');
  const inicio = params.get('inicio');
  const cada = cadaText && /^\d+$/.test(cadaText) ? Number(cadaText) : NaN;
  if (!nombre || nombre.length > 80 || !['riego', 'abono'].includes(tipo) || !Number.isInteger(cada) || cada < 1 || cada > 365 || !inicio || !validFloatingDate(inicio)) return badRequest();

  const ics = createRecurringReminderIcs({ plantName: nombre, kind: tipo, intervalDays: cada, start: inicio });
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${tipo}-${safeFilename(nombre)}.ics"`,
      'Cache-Control': 'no-store'
    }
  });
};

export const config = { path: '/api/recordatorio' };
