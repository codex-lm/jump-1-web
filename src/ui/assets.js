/** Local artwork lookup. All media are optional; missing files preserve a legible procedural plate. */
let manifest = Object.create(null);
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export async function loadAssets() {
  try {
    const response = await fetch('./assets/manifest.json');
    if (response.ok) {
      const data = await response.json();
      manifest = data.assets || data;
    }
  } catch { /* Procedural plates remain available offline and in restricted previews. */ }
  return manifest;
}
export function getAsset(key) {
  const entry = manifest[key];
  if (entry && typeof entry.src === 'string' && entry.src.startsWith('assets/')) return entry;
  return null;
}
export function assetMarkup(key, label = '', className = '') {
  const entry = getAsset(key);
  return `<figure class="asset ${escape(className)}" data-asset="${escape(key)}"><div class="asset-fallback" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1"><circle cx="60" cy="60" r="34"/><ellipse cx="60" cy="60" rx="51" ry="15" transform="rotate(-25 60 60)"/><path d="M60 4v12m0 88v12M4 60h12m88 0h12"/></svg><span>${escape(label)}</span></div>${entry ? `<img src="./${escape(entry.src)}" alt="${escape(label)}" loading="lazy" decoding="async"${entry.width ? ` width="${entry.width}" height="${entry.height}"` : ''}>` : ''}</figure>`;
}
export function attachAssetFallbacks(root = document) {
  for (const img of root.querySelectorAll('[data-asset] img')) {
    const fail = () => { img.hidden = true; img.closest('[data-asset]')?.classList.add('asset-missing'); };
    const loaded = () => { if (img.naturalWidth) img.closest('[data-asset]')?.classList.add('asset-loaded'); else fail(); };
    img.addEventListener('error', fail, { once: true });
    img.addEventListener('load', loaded, { once: true });
    if (img.complete) loaded();
  }
}
export function worldAsset(world = {}) {
  const profile = world.uwpData || world.profile || world;
  const codes = world.tradeCodes || world.codes || [];
  const has = code => Array.isArray(codes) ? codes.includes(code) : String(codes).split(/[ ,]+/).includes(code);
  const atmosphere = profile.atmosphere ?? profile.atmo ?? 6;
  const hydro = profile.hydrographics ?? profile.hydro ?? 5;
  if (has('As') || profile.size === 0) return 'worlds/asteroids';
  if (has('Hi')) return 'worlds/city';
  if (has('Fl') || atmosphere >= 13) return 'worlds/exotic';
  if (hydro >= 8 && atmosphere <= 3) return 'worlds/frozen-ocean';
  if (has('Ic')) return 'worlds/ice';
  if (atmosphere === 0) return 'worlds/vacuum';
  if (atmosphere >= 10 && hydro <= 2) return 'worlds/volcanic';
  if (hydro === 10 || has('Wa')) return 'worlds/ocean';
  if (hydro <= 1 || has('De') || has('Po')) return 'worlds/desert';
  if (has('Ga') || has('Ag') || has('Ri')) return 'worlds/garden';
  if (atmosphere >= 7 && atmosphere <= 9 && hydro >= 5) return 'worlds/jungle';
  return 'worlds/rocky';
}
