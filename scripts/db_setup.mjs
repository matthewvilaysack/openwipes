// Creates the schema and imports prototype/seed.js into Postgres. Idempotent.
// Run with: bun scripts/db_setup.mjs  (reads DATABASE_URL from .env.local)
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const sql = neon(process.env.DATABASE_URL);

await sql`CREATE TABLE IF NOT EXISTS spots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Public / city facility',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT DEFAULT '',
  hours TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'community',
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, lat, lng)
)`;
await sql`CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  spot_id INT REFERENCES spots(id) ON DELETE CASCADE,
  who TEXT DEFAULT 'anonymous',
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  body TEXT DEFAULT '',
  flagged INT DEFAULT 0,
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
)`;
await sql`CREATE TABLE IF NOT EXISTS votes (
  review_id INT REFERENCES reviews(id) ON DELETE CASCADE,
  ip_hash TEXT,
  PRIMARY KEY (review_id, ip_hash)
)`;
await sql`CREATE TABLE IF NOT EXISTS reports (
  review_id INT REFERENCES reviews(id) ON DELETE CASCADE,
  ip_hash TEXT,
  PRIMARY KEY (review_id, ip_hash)
)`;
await sql`CREATE INDEX IF NOT EXISTS reviews_spot_idx ON reviews(spot_id)`;

const seedSrc = readFileSync(new URL("../prototype/seed.js", import.meta.url), "utf8");
const seed = JSON.parse(seedSrc.replace("const SEED_SPOTS = ", "").replace(/;\s*$/, ""));

// Curated well-known spots from the prototype, imported as real unrated listings.
const curated = [
  { name: "Dolores Park Restroom", type: "Public / city facility", lat: 37.7598, lng: -122.4271, tags: ["Free", "Gender-neutral"] },
  { name: "Ferry Building", type: "Public / city facility", lat: 37.7955, lng: -122.3937, tags: ["Free", "Wheelchair accessible", "Baby changing", "No code"] },
  { name: "SF Main Library", type: "Public / city facility", lat: 37.7787, lng: -122.4157, tags: ["Free", "Wheelchair accessible", "No code"] },
  { name: "Blue Bottle Mint Plaza", type: "Cafe / coffee shop", lat: 37.7827, lng: -122.4090, tags: ["Requires purchase", "Code required"] },
  { name: "Westfield Level 4", type: "Retail / store", lat: 37.7841, lng: -122.4076, tags: ["Free", "Wheelchair accessible"] },
  { name: "Alamo Square Restroom", type: "Public / city facility", lat: 37.7767, lng: -122.4345, tags: ["Free"] },
  { name: "Zeitgeist", type: "Bar", lat: 37.7702, lng: -122.4223, tags: ["Requires purchase"] },
  { name: "Salesforce Park", type: "Public / city facility", lat: 37.7897, lng: -122.3963, tags: ["Free", "Wheelchair accessible", "Gender-neutral", "Baby changing", "No code"] },
  { name: "Crissy Field East Beach", type: "Public / city facility", lat: 37.8039, lng: -122.4519, tags: ["Free", "No code"] },
  { name: "Pit Stop at 16th & Mission", type: "Public / city facility", lat: 37.7648, lng: -122.4194, tags: ["Free", "No code"] },
];

let inserted = 0;
for (const s of [...curated, ...seed]) {
  const rows = await sql`
    INSERT INTO spots (name, type, lat, lng, address, hours, tags, source)
    VALUES (${s.name}, ${s.type}, ${s.lat}, ${s.lng}, ${s.address || ""}, ${s.hours || ""},
            ${s.tags || []}, ${s.source || "seed_curated"})
    ON CONFLICT (name, lat, lng) DO NOTHING RETURNING id`;
  inserted += rows.length;
}
const total = await sql`SELECT count(*)::int AS n FROM spots`;
console.log(`inserted ${inserted} new spots, ${total[0].n} total`);
