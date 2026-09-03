# OpenWipes

https://openwipes.vercel.app

A community map of every public-usable bathroom in San Francisco, rated by people who have actually been.
Anonymous by design: no accounts, star ratings required, everything else optional.

## How it works

- `prototype/index.html` is the whole front-end: Leaflet + CARTO tiles with a neo-retro skin, vanilla JS.
- `api/` holds Vercel serverless functions (spots, reviews, upvotes, reports) backed by Neon Postgres.
- `scripts/fetch_seed.py` pulls live bathroom locations from DataSF Pit Stops and OpenStreetMap.
- `scripts/db_setup.mjs` creates the schema and imports the seed (idempotent).

Abuse control is a salted IP hash with hourly rate limits; reviews hidden after three reports.

## Develop

```sh
bun install
vercel dev
```

## License

MIT
