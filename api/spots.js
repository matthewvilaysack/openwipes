import { sql, ipHash, overRateLimit, json, SF_BBOX } from "./_db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await sql`
      SELECT s.id, s.name, s.type, s.lat, s.lng, s.address, s.hours, s.tags, s.source,
             round(avg(r.stars)::numeric, 1)::float AS score,
             count(r.id)::int AS reviews
      FROM spots s
      LEFT JOIN reviews r ON r.spot_id = s.id AND r.flagged < 3
      GROUP BY s.id
      ORDER BY s.id`;
    return json(res, 200, rows);
  }

  if (req.method === "POST") {
    const hash = ipHash(req);
    if (await overRateLimit("spots", hash, 3)) {
      return json(res, 429, { error: "Easy there. Try again in an hour." });
    }
    const { name, type, lat, lng, address = "", tags = [] } = req.body || {};
    if (!name || typeof name !== "string" || name.length > 80) {
      return json(res, 400, { error: "Name is required, 80 characters max." });
    }
    if (typeof lat !== "number" || typeof lng !== "number" ||
        lat < SF_BBOX.latMin || lat > SF_BBOX.latMax ||
        lng < SF_BBOX.lngMin || lng > SF_BBOX.lngMax) {
      return json(res, 400, { error: "OpenWipes is San Francisco only for now." });
    }
    const cleanTags = (Array.isArray(tags) ? tags : []).slice(0, 8).map(String);
    const rows = await sql`
      INSERT INTO spots (name, type, lat, lng, address, tags, source, ip_hash)
      VALUES (${name.trim()}, ${String(type || "Other").slice(0, 40)}, ${lat}, ${lng},
              ${String(address).slice(0, 120)}, ${cleanTags}, 'community', ${hash})
      ON CONFLICT (name, lat, lng) DO NOTHING
      RETURNING id`;
    if (!rows.length) return json(res, 409, { error: "That spot is already on the map." });
    return json(res, 201, { id: rows[0].id });
  }

  return json(res, 405, { error: "Method not allowed" });
}
