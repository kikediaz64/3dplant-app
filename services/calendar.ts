export type CalendarReminderKind = 'riego' | 'abono';

const escapeText = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/\r?\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

const formatUtc = (date: Date): string => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export function createRecurringReminderIcs({
  plantName,
  kind,
  intervalDays,
  start = new Date()
}: {
  plantName: string;
  kind: CalendarReminderKind;
  intervalDays: number;
  start?: Date;
}): string {
  if (!Number.isInteger(intervalDays) || intervalDays <= 0) throw new RangeError('intervalDays debe ser un entero positivo');
  if (Number.isNaN(start.getTime())) throw new RangeError('start debe ser una fecha válida');
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const uid = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}@3dplant`;
  const summary = kind === 'riego' ? `Regar ${plantName}` : `Abonar ${plantName}`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//3dPlant//Recordatorios//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${formatUtc(new Date())}`, `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`, `RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`, `SUMMARY:${escapeText(summary)}`,
    'END:VEVENT', 'END:VCALENDAR', ''
  ].join('\r\n');
}

export function fertilizerIntervalDays(value?: string): number | undefined {
  if (!value) return undefined;
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const every = text.match(/(?:cada|cada\s+)\s*(\d+)\s*(dias?|semanas?|mes(?:es)?)/);
  if (every) {
    const amount = Number(every[1]);
    const unit = every[2];
    return amount * (unit.startsWith('semana') ? 7 : unit.startsWith('mes') ? 30 : 1);
  }
  if (/\bsemanal(?:mente)?\b/.test(text)) return 7;
  if (/\bquincenal(?:mente)?\b/.test(text)) return 15;
  if (/\bmensual(?:mente)?\b/.test(text)) return 30;
  return undefined;
}

export function downloadCalendarReminder(ics: string, filename: string): void {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
