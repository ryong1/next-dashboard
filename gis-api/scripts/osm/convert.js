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

// ---- 지하철 노선 (route=subway 관계 → 호선별 MultiLineString) ----
// 같은 호선이 운행 계통/방향별로 여러 관계로 나뉘어 있어서, 호선(ref)별로 선로(way)를 모아 중복 제거한다.
const lineFile = path.join(raw, "subway_line.json");
if (fs.existsSync(lineFile)) {
  const rels = JSON.parse(fs.readFileSync(lineFile, "utf8")).elements.filter((e) => e.type === "relation");
  const lines = new Map(); // ref -> { colour, ways: Map(wayId -> coords) }
  for (const r of rels) {
    const ref = r.tags?.ref;
    if (!/^[1-9]$/.test(ref ?? "")) continue; // 1~9호선만
    if (!lines.has(ref)) lines.set(ref, { colour: r.tags.colour, ways: new Map() });
    const line = lines.get(ref);
    for (const m of r.members) {
      if (m.type !== "way" || !m.geometry || m.role === "platform") continue;
      if (!line.ways.has(m.ref)) line.ways.set(m.ref, m.geometry.map((p) => [r6(p.lon), r6(p.lat)]));
    }
  }
  const features = [...lines.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([ref, l]) => ({
      type: "Feature",
      geometry: { type: "MultiLineString", coordinates: [...l.ways.values()].filter((c) => c.length > 1) },
      properties: { ref, name: `${ref}호선`, colour: l.colour },
    }));
  fs.writeFileSync(path.join(out, "subway_line.geojson"), JSON.stringify({ type: "FeatureCollection", features }));
  console.log("subway_line", features.map((f) => `${f.properties.name}(${f.geometry.coordinates.length} ways)`).join(", "));
}
