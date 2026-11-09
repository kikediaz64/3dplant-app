// Heurística local: aconseja repetir, nunca impide enviar la foto.
// Umbral calibrado con fotos reales de plantas del 2026-11-09.
const BLUR_LAPLACIAN_VARIANCE = 100;

export function assessPixels(pixels, width, height) {
  const gray = new Float32Array(width * height);
  let sum = 0;
  for (let i = 0; i < gray.length; i++) {
    gray[i] = .299 * pixels[i * 4] + .587 * pixels[i * 4 + 1] + .114 * pixels[i * 4 + 2];
    sum += gray[i];
  }
  if (sum / gray.length < 40) return 'Esta foto está muy oscura, ¿repetir?';
  let gradient = 0, laplacian = 0, laplacianSum = 0, count = 0;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x;
    const dx = gray[i + 1] - gray[i - 1], dy = gray[i + width] - gray[i - width];
    const lap = gray[i - 1] + gray[i + 1] + gray[i - width] + gray[i + width] - 4 * gray[i];
    gradient += dx * dx + dy * dy;
    laplacian += lap * lap;
    laplacianSum += lap;
    count++;
  }
  const laplacianVariance = laplacian / count - (laplacianSum / count) ** 2;
  // Solo avisamos si hay estructura visible pero sus bordes son muy extendidos.
  // Una superficie uniforme no contiene información suficiente para juzgar el foco.
  return gradient / count > 4 && laplacianVariance < BLUR_LAPLACIAN_VARIANCE
    ? 'Esta foto está muy borrosa, ¿repetir?' : null;
}

export async function assessPhoto(dataUrl) {
  const img = new Image();
  img.src = dataUrl;
  try {
    await img.decode();
    const scale = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return assessPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  } catch { return null; }
}
