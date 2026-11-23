// usage: node convert.js <rawDir> <outDir>
const fs = require("fs"), path = require("path");
const osmtogeojson = require("osmtogeojson");
const [raw, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const roundCoords = (c) => (typeof c[0] === "number" ? [r6(c[0]), r6(c[1])] : c.map(roundCoords));
const nameOf = (t = {}) => t["name:ko"] || t.name || null;

for (const cat of ["subway", "school", "hospital"]) {
  const els = JSON.parse(fs.readFileSync(path.join(raw, cat + ".json"), "utf8")).elements;
  const features = els.map((e) => {
    const lon = e.lon ?? e.center?.lon, lat = e.lat ?? e.center?.lat;
    if (lon == null) return null;
    return { type: "Feature", geometry: { type: "Point", coordinates: [r6(lon), r6(lat)] },
      properties: { osmId: `${e.type}/${e.id}`, name: nameOf(e.tags) } };
  }).filter(Boolean);
  fs.writeFileSync(path.join(out, cat + ".geojson"), JSON.stringify({ type: "FeatureCollection", features }));
  console.log(cat, features.length, "named:", features.filter((f) => f.properties.name).length);
}

const parkRaw = JSON.parse(fs.readFileSync(path.join(raw, "park.json"), "utf8"));
const gj = osmtogeojson(parkRaw);
const parks = gj.features
  .filter((f) => f.geometry && /Polygon/.test(f.geometry.type))
  .map((f) => ({ type: "Feature", geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    properties: { osmId: f.id, name: nameOf(f.properties) } }));
fs.writeFileSync(path.join(out, "park.geojson"), JSON.stringify({ type: "FeatureCollection", features: parks }));
const types = {}; gj.features.forEach((f) => (types[f.geometry?.type] = (types[f.geometry?.type] || 0) + 1));
console.log("park", parks.length, "geometry types in source:", JSON.stringify(types));
