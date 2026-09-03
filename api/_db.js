import { neon } from "@neondatabase/serverless";
import { createHash } from "node:crypto";

export const sql = neon(process.env.DATABASE_URL);

export function ipHash(req) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  return createHash("sha256").update((process.env.IP_SALT || "dev") + ip).digest("hex").slice(0, 32);
}

export async function overRateLimit(table, hash, perHour) {
  const rows = await sql`
    SELECT count(*)::int AS n FROM ${sql.unsafe(table)}
    WHERE ip_hash = ${hash} AND created_at > now() - interval '1 hour'`;
  return rows[0].n >= perHour;
}

export function json(res, status, body) {
  res.status(status).setHeader("content-type", "application/json").end(JSON.stringify(body));
}

export const SF_BBOX = { latMin: 37.70, latMax: 37.835, lngMin: -122.53, lngMax: -122.345 };
