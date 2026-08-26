const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const UA = 'GNV-Parking-Navigator/2.0 (+https://github.com/kitch-bets/portfolio2)';

export default async function handler(req, res) {
  try {
    let q = String(req.query?.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Search text required' });
    if (q.length > 160) q = q.slice(0, 160);
    if (/infinity hall/i.test(q)) q = '978 SW 2nd Ave, Gainesville, FL 32601';
    const params = new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'us', viewbox: '-82.45,29.735,-82.245,29.57', bounded: '1' });
    const upstream = await fetch(`${NOMINATIM}?${params}`, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.8' } });
    const data = await upstream.json().catch(() => null);
    const hit = Array.isArray(data) ? data[0] : null;
    if (!upstream.ok || !hit) return res.status(404).json({ error: 'No Gainesville destination found' });
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
