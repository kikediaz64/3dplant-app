const ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all';
const TIMEOUT_MS = 5000;

export function formatCandidateHint(candidate) {
  const commonNames = (Array.isArray(candidate.commonNames) ? candidate.commonNames : [])
    .filter(name => typeof name === 'string')
    .map(name => name.slice(0, 60).trim())
    .filter(Boolean)
    .filter((name, index, names) => names.findIndex(other => other.toLowerCase() === name.toLowerCase()) === index)
    .slice(0, 3);
  const names = commonNames.length ? ` (${commonNames.join(', ')})` : '';
  return `${candidate.scientificName}${names} (${Math.round(candidate.score * 100)} %)`;
}

/** Returns up to four Pl@ntNet candidates, or null when identification is unavailable. */
export async function identifyPlant(images, apiKey = process.env.PLANTNET_API_KEY) {
  if (!apiKey || !(typeof images === 'string' || (Array.isArray(images) && images.length > 0 && images.length <= 3))) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set('api-key', apiKey);
  url.searchParams.set('lang', 'es');
  url.searchParams.set('nb-results', '4');
  url.searchParams.set('include-related-images', 'true');

  const form = new FormData();
  for (const [index, base64] of (Array.isArray(images) ? images : [images]).entries()) {
    form.append('images', new Blob([Buffer.from(base64, 'base64')], { type: 'image/jpeg' }), `plant-${index + 1}.jpg`);
    form.append('organs', 'auto');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'POST', body: form, signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data?.results)) return null;
    return data.results.slice(0, 4).flatMap(result => {
      const scientificName = result?.species?.scientificNameWithoutAuthor;
      const score = result?.score;
      if (typeof scientificName !== 'string' || !scientificName.trim() || !Number.isFinite(score)) return [];
      const commonNames = Array.isArray(result.species.commonNames)
        ? result.species.commonNames.filter(name => typeof name === 'string')
        : [];
      const relatedImage = Array.isArray(result.images) ? result.images[0] : null;
      const imageUrl = typeof relatedImage?.url === 'string'
        ? relatedImage.url
        : relatedImage?.url && typeof relatedImage.url === 'object'
          ? relatedImage.url.m || relatedImage.url.o || relatedImage.url.s || null
          : null;
      return [{ scientificName: scientificName.trim(), commonNames, score, imageUrl: typeof imageUrl === 'string' ? imageUrl : null }];
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
