import { createRecurringReminderIcs, isValidFloatingDate } from '../../services/calendarIcs.mjs';

const badRequest = () => new Response('Parámetros no válidos.', { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

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
  if (!nombre || nombre.length > 80 || !['riego', 'abono'].includes(tipo) || !Number.isInteger(cada) || cada < 1 || cada > 365 || !inicio || !isValidFloatingDate(inicio)) return badRequest();

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
