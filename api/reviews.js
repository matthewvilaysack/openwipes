import { sql, ipHash, overRateLimit, json } from "./_db.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const hash = ipHash(req);
    const spotId = req.query.spot_id ? Number(req.query.spot_id) : null;
    const rows = spotId
      ? await sql`
          SELECT r.id, r.spot_id, s.name AS spot, r.who, r.stars, r.body, r.created_at,
                 count(v.ip_hash)::int AS up,
                 bool_or(v.ip_hash = ${hash}) AS voted
          FROM reviews r
          JOIN spots s ON s.id = r.spot_id
          LEFT JOIN votes v ON v.review_id = r.id
          WHERE r.spot_id = ${spotId} AND r.flagged < 3
          GROUP BY r.id, s.name ORDER BY up DESC, r.created_at DESC LIMIT 100`
      : await sql`
          SELECT r.id, r.spot_id, s.name AS spot, r.who, r.stars, r.body, r.created_at,
                 count(v.ip_hash)::int AS up,
                 bool_or(v.ip_hash = ${hash}) AS voted
          FROM reviews r
          JOIN spots s ON s.id = r.spot_id
          LEFT JOIN votes v ON v.review_id = r.id
          WHERE r.flagged < 3
          GROUP BY r.id, s.name ORDER BY up DESC, r.created_at DESC LIMIT 100`;
    return json(res, 200, rows);
  }

  if (req.method === "POST") {
    const hash = ipHash(req);
    if (await overRateLimit("reviews", hash, 5)) {
      return json(res, 429, { error: "Five reviews an hour is plenty. Try again later." });
    }
    const { spot_id, stars, body = "", who = "" } = req.body || {};
    const spotId = Number(spot_id);
    const starNum = Number(stars);
    if (!Number.isInteger(spotId) || !Number.isInteger(starNum) || starNum < 1 || starNum > 5) {
      return json(res, 400, { error: "A star rating from 1 to 5 is required." });
    }
    if (String(body).length > 600) return json(res, 400, { error: "Reviews max out at 600 characters." });
    const rows = await sql`
      INSERT INTO reviews (spot_id, who, stars, body, ip_hash)
      SELECT ${spotId}, ${String(who).trim().slice(0, 40) || "anonymous"}, ${starNum},
             ${String(body).trim().slice(0, 600)}, ${hash}
      WHERE EXISTS (SELECT 1 FROM spots WHERE id = ${spotId})
      RETURNING id`;
    if (!rows.length) return json(res, 404, { error: "That bathroom doesn't exist." });
    return json(res, 201, { id: rows[0].id });
  }

  return json(res, 405, { error: "Method not allowed" });
}
