# OpenWipes · Product Requirements

Name: **OpenWipes**.

One-liner: a free, no-account map of every public-usable bathroom in San Francisco, seeded from SF open data and grown by community ratings, reviews, and submissions.

## Problem

Finding a usable bathroom in SF is a real daily problem, and the information that exists (city datasets, scattered Yelp mentions) is stale, incomplete, and never answers the questions that matter in the moment: is it open, is it free, is it clean, do I need a code.
Curb.guide proved that a single-purpose SF map with a friendly face and open data underneath can become a beloved utility.
This is the same move for bathrooms.

## Goals

- A stranger with a full bladder can open the site and find the nearest decent bathroom in under 15 seconds, no signup.
- The community can correct and extend the map: add missing spots, rate existing ones, flag what changed.
- The map is never empty: DataSF's public restroom dataset seeds it on day one.

## Non-goals (v1)

- No accounts, profiles, or reputation systems.
- No admin/moderation dashboard (rate limiting only, revisit if abuse appears).
- No native app; responsive web only.
- No directions/routing beyond a link out to Google/Apple Maps.

## Core objects

### 1. Bathrooms

The unit of the map.
Each bathroom has a name, a type, a location, structured tags, an aggregate rating derived from its reviews, and photos.
Source is tracked: `seed_datasf` rows come from the import, `community` rows from user submissions.

### 2. Bathroom types

Every bathroom has exactly one type, shown on the pin's detail card and usable as a filter:

- Public / city facility (park, library, JCDecaux, Pit Stop)
- Restaurant
- Cafe / coffee shop
- Bar
- Retail / store
- Hotel lobby
- Gas station
- Transit station
- Other

### 3. Location

Latitude/longitude plus a human address string.
Seed rows get coordinates from DataSF.
Community submissions place a pin by tapping the map (address reverse-geocoded best-effort, editable before submit).
v1 is hard-scoped to San Francisco: submissions outside a city bounding box are rejected.

### 4. Reviews

A review is a required 1-to-5 star rating, an optional short text body, and an optional free-text display name (defaults to "anonymous").
No login, no edit/delete after posting.
A bathroom's displayed score is the average of its review stars, computed on read.
Score bands drive pin color: green "sparkling" at 4★ and up, amber "decent" from 2.5 to 4★, red "dicey" under 2.5★, gray for unrated seed rows.

### 5. Photos

Placeholder in v1 UI, wired for real upload:

- Schema and storage (Vercel Blob) built in v1 so photos attach to a bathroom or a review.
- Detail card shows a photo strip when photos exist and an "add a photo" placeholder tile when none do.
- Upload form accepts one photo per submission, client-resized, 5 MB cap.

### Tags

Structured checkboxes on both bathrooms and the add/review forms: Free, Gender-neutral, Wheelchair accessible, Requires purchase, Code required, Baby changing station.

## User flows

**Find**: land on map (welcome card first visit only), see color-banded pins, filter by tag chips or type, tap pin, read detail card (score, type, tags, reviews, photos, "open in Maps" link).

**Rate**: from detail card, tap "Rate it", pick stars (required), optionally add text, name, tags-confirmation, photo. Submit posts instantly.

**Add**: tap "Add a bathroom", tap map to drop pin, fill name, type, tags, optional first rating and photo. Submit posts instantly.

## Architecture

- **Frontend**: Next.js (App Router), bun for tooling, deployed on Vercel.
- **Map**: Leaflet with CARTO Voyager raster tiles warmed toward the paper palette by a CSS filter (the same stack curb.guide uses).
  Free CARTO tiles carry an "API key required" watermark; before launch either register a free CARTO key or switch the tile source to Protomaps.
- **Database**: Postgres on Neon. Tables: `bathrooms`, `tags`, `bathroom_tags`, `reviews`, `photos`.
- **Photos**: Vercel Blob, URL stored on the photo row.
- **Seed**: one-off import script for the DataSF public restroom dataset, tagged `seed_datasf`.
- **Abuse control**: salted IP hash stored on submissions, N-per-hour rate limit enforced in the API route, never displayed.

## Visual design

Theme uses curb.guide's exact design tokens, captured from the live site:

- Paper #F2ECDF, ink #17150F, soft ink #4A4536, gray #8C8678.
- Score bands: green #1F9E5A, amber #E08A1E, red #C1121F; blue #2F5BD0 reserved for the "you are here" dot.
- Chrome: 2.5px ink borders, 15px radii, hard offset shadow `5px 5px 0` ink, pill buttons, paper panels.
- Type: Hanken Grotesk (400 to 800) for UI and body, Anton for the logo badge and condensed label chips.
- Accent semantics: green/amber/red are score bands only; the red logo badge is the one brand accent.
- Pins: rounded-square toilet-glyph markers colored by score band, gray for unrated.
- Working prototype lives at `prototype/index.html` (Leaflet, sample data, live filtering); the static artifact mockup preceded it and is superseded.

## Success measures

- Weekly unique visitors.
- New bathrooms added per week.
- Reviews posted per week.

---

## Q&A

All questions are answered; this section records the decisions.

**Q1. App name?**
A: OpenWipes.

**Q2. Real app or prototype?**
A: Real deployed app with live persistent data, on Vercel.

**Q3. What can users do in v1?**
A: Browse map with ratings, add bathrooms, rate/review, structured tags, photo upload (placeholder UI, real storage).

**Q4. Auth?**
A: None. Fully anonymous, optional free-text display name on reviews.

**Q5. Seed data?**
A: Yes, DataSF public restroom dataset imported at launch.

**Q6. Success metrics?**
A: Weekly unique visitors, community submissions per week, reviews posted per week.

**Q7. Moderation?**
A: IP-hash rate limiting only for v1. Flagging and admin tooling deferred until abuse appears.

**Q8. Domain / hosting account?**
A: Launch on the free Vercel URL (openwipes.vercel.app or nearest available); buy a custom domain only if it gets traction. Remember the commit-author gate: commit as topdogmatthew@gmail.com.

**Q9. Rating required, review text optional?**
A: Yes. Stars are mandatory, everything else optional.

**Q10. Photo rules?**
A: One photo per submission, 5 MB cap, client-side resize. Photos may attach directly to a bathroom, so seed rows can get photos before any review exists.

**Q11. Bathroom types list final?**
A: Final as drafted in "Bathroom types" above.

**Q12. Launch scope?**
A: San Francisco only, enforced by bounding box. Expansion is a later conversation.
