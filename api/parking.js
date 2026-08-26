const SOURCES = [
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/On_Street_Parking_Nov_25_2024/FeatureServer/0/query',
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/New_Street_Parking_2024/FeatureServer/0/query'
];

async function fetchParking(url, timeoutMs = 9000) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '2000'
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(`${url}?${params.toString()}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'GNV-Parking-Navigator/2.0' }
    });
    if (!upstream.ok) throw new Error(`GIS HTTP ${upstream.status}`);
    const data = await upstream.json();
    if (!Array.isArray(data?.features) || !data.features.length) {
      throw new Error('GIS returned no parking features');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const failures = [];
  for (const source of SOURCES) {
    try {
      const data = await fetchParking(source);
      res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
      res.status(200).json(data);
      return;
    } catch (error) {
      failures.push(String(error?.name === 'AbortError' ? 'GIS timed out' : error?.message || error));
    }
  }
  res.status(502).json({ error: 'Gainesville parking GIS unavailable', detail: failures.join(' | ') });
}
