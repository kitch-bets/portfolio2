const SOURCES = [
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/New_Permit_Zone_2024/FeatureServer/0/query',
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/Gainesville_Parking_Map_6_August_2024_WFL1/FeatureServer/4/query'
];

async function getZones(url, timeoutMs = 7000) {
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
    if (!upstream.ok) throw new Error(`GIS ${upstream.status}`);
    const data = await upstream.json();
    if (!Array.isArray(data?.features) || !data.features.some(f => /Polygon/.test(f?.geometry?.type || ''))) {
      throw new Error('No permit-zone polygons');
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
      const data = await getZones(source);
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      res.status(200).json(data);
      return;
    } catch (error) {
      failures.push(String(error?.name === 'AbortError' ? 'zone GIS timed out' : error?.message || error));
    }
  }
  res.status(502).json({ error: 'Permit-zone GIS unavailable', detail: failures.join(' | ') });
}
