const escapeText = value => value
  .replace(/\\/g, '\\\\')
  .replace(/\r\n|\r|\n/g, '\\n')
  .replace(/,/g, '\\,')
  .replace(/;/g, '\\;');

// RFC 5545 limits physical lines to 75 octets; never split a UTF-8 character.
const foldLine = line => {
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

const pad = value => String(value).padStart(2, '0');
const formatUtc = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const formatLocal = date => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

// Add minutes to calendar fields as UTC arithmetic, without consulting the server timezone.
function addMinutesFloating(value, minutes) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(9, 11));
  const minute = Number(value.slice(11, 13));
  const second = Number(value.slice(13, 15));
  const date = new Date(Date.UTC(year, month, day, hour, minute + minutes, second));
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
}

/**
 * @param {{ plantName: string, kind: 'riego' | 'abono', intervalDays: number, start?: Date | string }} options
 * @returns {string}
 */
export function createRecurringReminderIcs({ plantName, kind, intervalDays, start = new Date() }) {
  if (!Number.isInteger(intervalDays) || intervalDays <= 0) throw new RangeError('intervalDays debe ser un entero positivo');
  let startText;
  let endText;
  if (typeof start === 'string') {
    if (!/^\d{8}T\d{6}$/.test(start)) throw new RangeError('start debe ser una fecha válida');
    const year = Number(start.slice(0, 4)), month = Number(start.slice(4, 6)), day = Number(start.slice(6, 8));
    const hour = Number(start.slice(9, 11)), minute = Number(start.slice(11, 13)), second = Number(start.slice(13, 15));
    const check = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) throw new RangeError('start debe ser una fecha válida');
    startText = start;
    endText = addMinutesFloating(start, 30);
  } else {
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) throw new RangeError('start debe ser una fecha válida');
    startText = formatLocal(start);
    endText = formatLocal(new Date(start.getTime() + 30 * 60 * 1000));
  }
  const uid = `${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}@3dplant`;
  const summary = kind === 'riego' ? `Regar ${plantName}` : `Abonar ${plantName}`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//3dPlant//Recordatorios//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${formatUtc(new Date())}`, `DTSTART:${startText}`,
    `DTEND:${endText}`, `RRULE:FREQ=DAILY;INTERVAL=${intervalDays}`, `SUMMARY:${escapeText(summary)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(summary)}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', ''
  ].map(foldLine).join('\r\n');
}
