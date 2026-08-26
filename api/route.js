const VALHALLA = 'https://valhalla1.openstreetmap.de/route';
const UA = 'GNV-Parking-Navigator/2.0 (+https://github.com/kitch-bets/portfolio2)';

function decodePolyline6(encoded) {
  let index = 0, lat = 0, lon = 0;
  const coords = [];
  while (index < encoded.length) {
    let result = 0, shift = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && index <= encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    result = 0; shift = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && index <= encoded.length);
    lon += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lon / 1e6, lat / 1e6]);
  }
  return coords;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST required' });
  try {
    const locations = Array.isArray(req.body?.locations) ? req.body.locations : [];
    if (locations.length < 2 || locations.length > 20) return res.status(400).json({ error: 'Provide 2–20 route locations' });
    const clean = locations.map((p, i) => {
      const lat = Number(p.lat), lon = Number(p.lon ?? p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error(`Invalid location ${i + 1}`);
      return { lat, lon, type: i === 0 || i === locations.length - 1 ? 'break' : 'through' };
    });
    const payload = {
      locations: clean,
      costing: 'auto',
      units: 'miles',
      directions_options: { units: 'miles', language: 'en-US' }
    };
    const upstream = await fetch(VALHALLA, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA, 'X-Client-Id': 'gnv-parking-navigator' },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json().catch(() => null);
    if (!upstream.ok || !data?.trip?.legs) return res.status(502).json({ error: data?.error || data?.error_code ? String(data.error || data.error_code) : 'Valhalla routing failed' });
    const coordinates = [], maneuvers = [];
    let offset = 0;
    for (const leg of data.trip.legs) {
      const c = decodePolyline6(leg.shape || '');
      if (coordinates.length && c.length && coordinates.at(-1)[0] === c[0][0] && coordinates.at(-1)[1] === c[0][1]) coordinates.push(...c.slice(1)); else coordinates.push(...c);
      for (const m of leg.maneuvers || []) maneuvers.push({
        type: m.type,
        instruction: m.instruction,
        verbal_pre_transition_instruction: m.verbal_pre_transition_instruction,
        verbal_transition_alert_instruction: m.verbal_transition_alert_instruction,
        street_names: m.street_names || [],
        length: m.length || 0,
        time: m.time || 0,
        begin_shape_index: (m.begin_shape_index || 0) + offset,
        end_shape_index: (m.end_shape_index || 0) + offset
      });
      offset = Math.max(0, coordinates.length - 1);
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      geometry: { type: 'LineString', coordinates },
      summary: { time: data.trip.summary?.time || 0, length: data.trip.summary?.length || 0 },
      maneuvers
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
