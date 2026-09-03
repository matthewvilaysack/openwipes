"""Fetch live SF bathroom locations into prototype/seed.js.

Sources: DataSF Pit Stops (mr6h-cr3u, updated daily) and OpenStreetMap
amenity=toilets via Overpass. OSM points within 60m of a Pit Stop are dropped
as duplicates.
"""
import json
import math
import urllib.request

BBOX = (37.70, -122.53, 37.835, -122.345)
OUT = __file__.rsplit("/scripts/", 1)[0] + "/prototype/seed.js"


def get(url, data=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "openwipes-seed"})
    return urllib.request.urlopen(req, timeout=timeout).read()


def dist_m(a, b):
    dx = (a[1] - b[1]) * 111320 * math.cos(math.radians(a[0]))
    dy = (a[0] - b[0]) * 110540
    return math.hypot(dx, dy)


spots = []

# DataSF Pit Stops
pits = json.loads(get("https://data.sfgov.org/resource/mr6h-cr3u.json?$limit=200"))
for p in pits:
    loc = p.get("location") or {}
    coords = loc.get("coordinates")
    if not coords:
        continue
    spots.append({
        "name": p.get("name") or "Pit Stop",
        "type": "Public / city facility",
        "lat": coords[1],
        "lng": coords[0],
        "address": p.get("address", ""),
        "hours": p.get("hours", ""),
        "source": "datasf_pitstop",
    })

pit_coords = [(s["lat"], s["lng"]) for s in spots]

# OSM toilets
query = f"""
[out:json][timeout:50];
(
  node["amenity"="toilets"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
  way["amenity"="toilets"]({BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]});
);
out center tags;
"""
osm = json.loads(get("https://overpass-api.de/api/interpreter", data=query.encode()))
skipped = 0
for el in osm.get("elements", []):
    lat = el.get("lat") or el.get("center", {}).get("lat")
    lng = el.get("lon") or el.get("center", {}).get("lon")
    if lat is None:
        continue
    if any(dist_m((lat, lng), pc) < 60 for pc in pit_coords):
        skipped += 1
        continue
    tags = el.get("tags", {})
    fee = tags.get("fee") == "yes"
    wheelchair = tags.get("wheelchair") == "yes"
    spot_tags = [] if fee else ["Free"]
    if wheelchair:
        spot_tags.append("Wheelchair accessible")
    if tags.get("unisex") == "yes" or tags.get("gender_segregated") == "no":
        spot_tags.append("Gender-neutral")
    if tags.get("changing_table") == "yes":
        spot_tags.append("Baby changing")
    spots.append({
        "name": tags.get("name") or "Public toilet",
        "type": "Public / city facility",
        "lat": lat,
        "lng": lng,
        "address": tags.get("addr:street", ""),
        "hours": tags.get("opening_hours", ""),
        "tags": spot_tags,
        "source": "osm",
    })

with open(OUT, "w") as f:
    f.write("const SEED_SPOTS = " + json.dumps(spots, indent=None) + ";\n")
print(f"{len(spots)} seed spots ({len(pit_coords)} pit stops, {skipped} OSM duplicates dropped) -> {OUT}")
