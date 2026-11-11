export type CalendarReminderKind = 'riego' | 'abono';
export { createRecurringReminderIcs } from './calendarIcs.mjs';

const pad = (value: number): string => String(value).padStart(2, '0');

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

export function downloadCalendarReminder(ics: string, filename: string, serverParams?: { plantName: string; kind: CalendarReminderKind; intervalDays: number; start: Date }): void {
  if (isIOS(navigator.userAgent, navigator.platform, navigator.maxTouchPoints) && serverParams) {
    const start = serverParams.start;
    const params = new URLSearchParams({
      nombre: serverParams.plantName,
      tipo: serverParams.kind,
      cada: String(serverParams.intervalDays),
      inicio: `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}T${pad(start.getHours())}${pad(start.getMinutes())}${pad(start.getSeconds())}`
    });
    const url = `/api/recordatorio?${params}`;
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) window.open(url, '_blank');
    else window.location.href = url;
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
