const PRIMARY = 'https://services2.arcgis.com/Zzhtlau4ccHkQgTu/ArcGIS/rest/services/On_Street_Parking_Nov_25_2024/FeatureServer/0/query';

export default async function handler(req, res) {
  try {
    const params = new URLSearchParams({
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
      f: 'geojson',
      resultRecordCount: '2000'
    });

    const upstream = await fetch(`${PRIMARY}?${params.toString()}`, {
      headers: { 'User-Agent': 'GNV-Parking-Navigator/1.0' }
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      res.status(502).json({ error: 'City GIS request failed', status: upstream.status, detail: text.slice(0, 500) });
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      res.status(502).json({ error: 'City GIS returned invalid JSON' });
      return;
    }

    if (!data || !Array.isArray(data.features)) {
      res.status(502).json({ error: 'City GIS returned no parking features', detail: data?.error || null });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Parking proxy failed', detail: String(error?.message || error) });
  }
}
