const SOURCES = [
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/New_Permit_Zone_2024/FeatureServer/0/query',
  'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/Gainesville_Parking_Map_6_August_2024_WFL1/FeatureServer/4/query'
];

async function getZones(url) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: '*',
    returnGeometry: 'true',
    outSR: '4326',
    f: 'geojson',
    resultRecordCount: '2000'
  });
  const upstream = await fetch(`${url}?${params.toString()}`, {
    headers: { 'User-Agent': 'GNV-Parking-Navigator/1.0' }
  });
  if (!upstream.ok) throw new Error(`GIS ${upstream.status}`);
  const data = await upstream.json();
  if (!Array.isArray(data?.features) || !data.features.some(f => /Polygon/.test(f?.geometry?.type || ''))) {
    throw new Error('No permit-zone polygons');
  }
  return data;
}

export default async function handler(req, res) {
  for (const source of SOURCES) {
    try {
      const data = await getZones(source);
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
      res.status(200).json(data);
      return;
    } catch {}
  }
  res.status(502).json({ error: 'Permit-zone GIS unavailable' });
}
