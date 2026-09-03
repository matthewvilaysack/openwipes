import { sql, ipHash, json } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const hash = ipHash(req);
  const reviewId = Number((req.body || {}).review_id);
  if (!Number.isInteger(reviewId)) return json(res, 400, { error: "review_id required" });
  await sql`
    INSERT INTO reports (review_id, ip_hash)
    SELECT ${reviewId}, ${hash}
    WHERE EXISTS (SELECT 1 FROM reviews WHERE id = ${reviewId})
    ON CONFLICT DO NOTHING`;
  await sql`
    UPDATE reviews SET flagged = (SELECT count(*) FROM reports WHERE review_id = ${reviewId})
    WHERE id = ${reviewId}`;
  return json(res, 200, { ok: true });
}
