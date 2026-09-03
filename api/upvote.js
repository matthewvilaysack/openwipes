import { sql, ipHash, json } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });
  const hash = ipHash(req);
  const reviewId = Number((req.body || {}).review_id);
  if (!Number.isInteger(reviewId)) return json(res, 400, { error: "review_id required" });

  const removed = await sql`
    DELETE FROM votes WHERE review_id = ${reviewId} AND ip_hash = ${hash} RETURNING review_id`;
  if (!removed.length) {
    const added = await sql`
      INSERT INTO votes (review_id, ip_hash)
      SELECT ${reviewId}, ${hash}
      WHERE EXISTS (SELECT 1 FROM reviews WHERE id = ${reviewId})
      ON CONFLICT DO NOTHING RETURNING review_id`;
    if (!added.length) return json(res, 404, { error: "That review doesn't exist." });
  }
  const rows = await sql`SELECT count(*)::int AS up FROM votes WHERE review_id = ${reviewId}`;
  return json(res, 200, { up: rows[0].up, voted: !removed.length });
}
