// 3dPlant — Protección del gasto en OpenAI (A1): validación de la imagen y tope diario de consultas.
import { createHash } from 'node:crypto';

export const MAX_IMAGE_BASE64_CHARS = 1_500_000; // ~1,1 MB reales; la app envía 150-500 KB
const MIN_IMAGE_BYTES = 1000; // una foto real de la app pesa decenas de KB
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

// Topes diarios (día UTC). Por IP y global, separados por acción.
export const DAILY_LIMITS = {
  diagnose: { perIp: 10, global: 30 },
  ask: { perIp: 30, global: 100 }
};

// Un almacén por contexto de despliegue (context.deploy.context): las pruebas en vista previa no gastan
// el cupo de producción. Producción conserva el nombre original. Nombres de Blobs: sin "/" ni ":", máx. 64 bytes.
export function dailyStoreName(deployContext) {
  if (deployContext === 'production') return 'consultas-diarias';
  const safe = String(deployContext || 'desconocido').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 40);
  return `consultas-diarias-${safe}`;
}

const invalid = (error, status = 400) => ({ ok: false, status, error });

// La app siempre envía JPEG (CameraView.tsx lo genera con canvas.toDataURL('image/jpeg')).
export function validateImage(raw) {
  if (typeof raw !== 'string' || raw === '') {
    return invalid('No se ha recibido ninguna imagen. Haz una foto e inténtalo de nuevo.');
  }
  if (raw.length > MAX_IMAGE_BASE64_CHARS) {
    return invalid('La imagen es demasiado grande. Haz otra foto e inténtalo de nuevo.', 413);
  }
  let base64 = raw;
  if (raw.startsWith('data:')) {
    const prefix = /^data:image\/jpe?g;base64,/i.exec(raw);
    if (!prefix) return invalid('Formato de imagen no válido. Solo se admiten fotos JPEG.');
    base64 = raw.slice(prefix[0].length);
  }
  if (base64.length % 4 !== 0 || !BASE64_RE.test(base64)) {
    return invalid('La imagen está dañada. Haz otra foto e inténtalo de nuevo.');
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  if ((base64.length / 4) * 3 - padding < MIN_IMAGE_BYTES) {
    return invalid('La imagen es demasiado pequeña. Haz otra foto e inténtalo de nuevo.');
  }
  const head = Buffer.from(base64.slice(0, 8), 'base64');
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) {
    return invalid('Formato de imagen no válido. Solo se admiten fotos JPEG.');
  }
  return { ok: true, base64 };
}

// La IP se guarda resumida (hash con el día), nunca en claro.
const hashIp = (ip, day) => createHash('sha256').update(`${day}:${ip}`).digest('hex').slice(0, 32);

// Suma 1 con escritura condicional (ETag): si otra petición escribe a la vez, se vuelve a leer y reintenta.
async function increment(store, key, limit) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const count = current?.data?.count ?? 0;
    if (count >= limit) return false;
    const { modified } = current
      ? await store.setJSON(key, { count: count + 1 }, { onlyIfMatch: current.etag })
      : await store.setJSON(key, { count: count + 1 }, { onlyIfNew: true });
    if (modified) return true;
  }
  throw new Error(`Contador ocupado: ${key}`);
}

// Primero la IP: si una IP abusa, se frena sin gastar el cupo global de los demás.
export async function consumeDailyQuota(store, { action, ip, now = new Date() }) {
  const limits = DAILY_LIMITS[action];
  const day = now.toISOString().slice(0, 10);
  if (!(await increment(store, `${day}/${action}/ip/${hashIp(ip || 'desconocida', day)}`, limits.perIp))) {
    return { allowed: false, scope: 'ip' };
  }
  if (!(await increment(store, `${day}/${action}/global`, limits.global))) {
    return { allowed: false, scope: 'global' };
  }
  return { allowed: true };
}
