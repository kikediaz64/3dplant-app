export type CalendarReminderKind = 'riego' | 'abono';

const escapeText = (value: string): string => value
  .replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

// RFC 5545 limits physical lines to 75 octets; never split a UTF-8 character.
const foldLine = (line: string): string => {
  const encoder = new TextEncoder();
  let result = '';
  let octets = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    if (octets + size > 75) {
      result += '\r\n ';
      octets = 1;
    }
    result += character;
    octets += size;
  }
  return result;
};

const formatUtc = (date: Date): string => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const pad = (value: number): string => String(value).padStart(2, '0');

// Floating local time (no Z): 09:00 stays 09:00 in the user's calendar.
const formatLocal = (date: Date): string => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const atNineLocal = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);

export function nextReminderStart({ lastWateredAt, intervalDays, now = new Date() }: {
  lastWateredAt?: string;
  intervalDays: number;
  now?: Date;
}): Date {
  const tomorrow = atNineLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  if (!lastWateredAt || !Number.isInteger(intervalDays) || intervalDays <= 0) return tomorrow;
  const last = new Date(lastWateredAt);
  if (Number.isNaN(last.getTime())) return tomorrow;
  const next = atNineLocal(new Date(last.getFullYear(), last.getMonth(), last.getDate() + intervalDays));
  return next.getTime() >= tomorrow.getTime() ? next : tomorrow;
}

export function isIOS(userAgent: string = '', platform: string = '', maxTouchPoints: number = 0): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

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
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${formatUtc(new Date())}`, `DTSTART:${formatLocal(start)}`,
    `DTEND:${formatLocal(end)}`, `RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`, `SUMMARY:${escapeText(summary)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(summary)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', ''
  ].map(foldLine).join('\r\n');
}

export function fertilizerIntervalDays(value?: string): number | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const text = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  // Ranges, alternatives and negations do not describe one reliable interval.
  if (/\b(?:no|nunca|sin|o)\b|\d\s*(?:[-–—/,.]|a\b|o\b)\s*\d/.test(text)) return undefined;
  const every = text.match(/\bcada\s+(\d+)\s*(dias?|semanas?|mes(?:es)?)\b/);
  if (every) {
    const amount = Number(every[1]);
    const unit = every[2];
    const days = amount * (unit.startsWith('semana') ? 7 : unit.startsWith('mes') ? 30 : 1);
    return Number.isSafeInteger(days) && days > 0 ? days : undefined;
  }
  if (/\bsemanal(?:mente)?\b/.test(text)) return 7;
  if (/\bquincenal(?:mente)?\b/.test(text)) return 15;
  if (/\bmensual(?:mente)?\b/.test(text)) return 30;
  return undefined;
}

export function downloadCalendarReminder(ics: string, filename: string): void {
  if (isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
    // iOS Safari saves downloads to Files; opening the data URL offers "Add to Calendar".
    window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
    return;
  }
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser time to start reading the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
