// usage: node convert.js <rawDir> <outDir>
// raw 파일: school, hospital, park, station, rail_line, rail_stop (.json, fetch.sh가 받음)
const fs = require("fs"), path = require("path");
const osmtogeojson = require("osmtogeojson");
const [raw, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const r6 = (n) => Math.round(n * 1e6) / 1e6;
const roundCoords = (c) => (typeof c[0] === "number" ? [r6(c[0]), r6(c[1])] : c.map(roundCoords));
const nameOf = (t = {}) => t["name:ko"] || t.name || null;
const readRaw = (name) => JSON.parse(fs.readFileSync(path.join(raw, name + ".json"), "utf8")).elements;
const writeOut = (file, data) => fs.writeFileSync(path.join(out, file), JSON.stringify(data));
// 역 이름 정규화: 괄호와 끝의 "역"을 뗀다 (DB의 subway_station 뷰도 같은 규칙)
const norm = (s) => s.replace(/\s*\(.*?\)\s*/g, "").replace(/역$/, "").trim();

// ---------- 점 시설 (학교, 병원) ----------
const toPoints = (els) =>
  els.map((e) => {
    const lon = e.lon ?? e.center?.lon, lat = e.lat ?? e.center?.lat;
    if (lon == null) return null;
    return { type: "Feature", geometry: { type: "Point", coordinates: [r6(lon), r6(lat)] },
      properties: { osmId: `${e.type}/${e.id}`, name: nameOf(e.tags) } };
  }).filter(Boolean);

for (const cat of ["school", "hospital"]) {
  const features = toPoints(readRaw(cat));
  writeOut(cat + ".geojson", { type: "FeatureCollection", features });
  console.log(cat, features.length);
}

// ---------- 공원 (폴리곤) ----------
const gj = osmtogeojson({ elements: readRaw("park") });
const parks = gj.features
  .filter((f) => f.geometry && /Polygon/.test(f.geometry.type))
  .map((f) => ({ type: "Feature", geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates) },
    properties: { osmId: f.id, name: nameOf(f.properties) } }));
writeOut("park.geojson", { type: "FeatureCollection", features: parks });
console.log("park", parks.length);

// ---------- 전철 노선 ----------
// 서울을 지나는 수도권 전철 노선 정의. ref는 우리 쪽 코드, match는 OSM 관계를 알아보는 규칙.
// (KTX/ITX/무궁화 같은 장거리 열차는 목록에 없으므로 자동으로 빠진다)
const LINES = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
    ref: String(n), name: `${n}호선`, short: String(n), match: (t) => t.ref === String(n) && t.route === "subway",
  })),
  { ref: "GJ", name: "경의중앙선", short: "경의중앙", match: (t) => /경의.?중앙/.test(t.name ?? "") },
  { ref: "AR", name: "공항철도", short: "공항", match: (t) => /공항철도/.test(t.name ?? "") },
  { ref: "SB", name: "신분당선", short: "신분당", match: (t) => /^신분당선/.test(t.name ?? "") },
  { ref: "SU", name: "수인분당선", short: "수인분당", match: (t) => /수인.?분당/.test(t.name ?? "") },
  { ref: "GC", name: "경춘선", short: "경춘", match: (t) => /경춘선/.test(t.name ?? "") && !/ITX/.test(t.name ?? "") },
  { ref: "SH", name: "서해선", short: "서해", match: (t) => /서해선/.test(t.name ?? "") },
  { ref: "GA", name: "GTX-A", short: "GTX-A", match: (t) => t.ref === "GTX-A" },
  { ref: "UI", name: "우이신설선", short: "우이신설", match: (t) => /우이신설/.test(t.name ?? "") },
  { ref: "SL", name: "신림선", short: "신림", match: (t) => /신림선/.test(t.name ?? "") },
  { ref: "GG", name: "김포골드라인", short: "김포골드", match: (t) => /골드라인/.test(t.name ?? "") },
];
const lineOf = (tags = {}) => LINES.find((l) => l.match(tags)) ?? null;

// 급행/특급/직통은 완행과 같은 구간을 별도 선로로 달려서 겹쳐 보이므로 제외
// ("광역급행철도"는 GTX의 공식 이름이라 급행으로 보지 않음)
const isExpress = (t) => /(급행|특급|직통)(?!철도)/.test(t.name ?? "");

// 같은 계통의 반대 방향(A→B / B→A, 내선/외선)은 하나만 쓴다: 방향을 뺀 "계통 키"
function serviceKey(t) {
  const name = (t.name ?? "").replace(/\s+/g, " ");
  const m = name.match(/^(.*?):\s*(.+?)\s*→\s*(.+?)\s*$/);
  if (m) return `${m[1]}|${[m[2], m[3]].sort().join("~")}`;
  return name.replace(/(내선|외선)(순환)?/, "순환");
}

const lineRels = readRaw("rail_line").filter((e) => e.type === "relation");
const lines = new Map(); // ref -> { def, colour, ways: Map(wayId -> coords), services: Set }
const usedRels = { total: 0, kept: 0 };
for (const r of lineRels) {
  const def = lineOf(r.tags);
  if (!def) continue;
  usedRels.total++;
  if (isExpress(r.tags)) continue;
  if (!lines.has(def.ref)) lines.set(def.ref, { def, colour: r.tags.colour, rels: [], services: new Set() });
  const line = lines.get(def.ref);
  const key = serviceKey(r.tags);
  if (line.services.has(key)) continue; // 반대 방향은 건너뜀
  line.services.add(key);
  usedRels.kept++;
  line.colour ??= r.tags.colour;
  const ways = r.members
    .filter((m) => m.type === "way" && m.geometry && m.role !== "platform")
    .map((m) => ({ id: m.ref, coords: m.geometry.map((p) => [r6(p.lon), r6(p.lat)]) }));
  line.rels.push(ways);
}

// ---------- 평행 선로 제거 (노선을 한 줄로) ----------
// 상하행·급행 선로가 나란히 있으면 여러 줄로 겹쳐 보인다. 긴 계통부터 선로를 그리면서,
// 이미 그린 선에서 PARALLEL_M 안쪽으로 나란히 달리는 구간(샘플 점의 80% 이상)은 건너뛴다.
const PARALLEL_M = 30;
const toXY = ([lon, lat]) => [lon * 111320 * Math.cos((37.55 * Math.PI) / 180), lat * 110540];
function segDist([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function dedupeParallel(rels) {
  const CELL = 60;
  const grid = new Map(); // "cx,cy" -> 선분 목록
  const cellKey = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const addSeg = (a, b) => {
    const xs = [a[0], b[0]], ys = [a[1], b[1]];
    for (let cx = Math.floor(Math.min(...xs) / CELL); cx <= Math.floor(Math.max(...xs) / CELL); cx++)
      for (let cy = Math.floor(Math.min(...ys) / CELL); cy <= Math.floor(Math.max(...ys) / CELL); cy++) {
        const k = `${cx},${cy}`;
        if (!grid.has(k)) grid.set(k, []);
        grid.get(k).push([a, b]);
      }
  };
  const nearDrawn = (p) => {
    const [cx, cy] = cellKey(p[0], p[1]).split(",").map(Number);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
      for (const [a, b] of grid.get(`${cx + i},${cy + j}`) ?? []) if (segDist(p, a, b) <= PARALLEL_M) return true;
    return false;
  };
  const kept = new Map();
  const relLen = (ways) => ways.reduce((s, w) => s + w.coords.length, 0);
  for (const ways of [...rels].sort((a, b) => relLen(b) - relLen(a))) {
    for (const w of ways) {
      if (kept.has(w.id) || w.coords.length < 2) continue;
      const xy = w.coords.map(toXY);
      // 선을 따라 약 15m 간격으로 샘플
      const samples = [];
      for (let i = 0; i < xy.length - 1; i++) {
        const [a, b] = [xy[i], xy[i + 1]];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 15));
        for (let k = 0; k < n; k++) samples.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
      }
      samples.push(xy[xy.length - 1]);
      const near = samples.filter(nearDrawn).length;
      if (near / samples.length >= 0.8) continue; // 이미 그린 선과 나란함 → 생략
      kept.set(w.id, w.coords);
      for (let i = 0; i < xy.length - 1; i++) addSeg(xy[i], xy[i + 1]);
    }
  }
  return [...kept.values()];
}
const lineFeatures = LINES.filter((d) => lines.has(d.ref)).map((d, i) => {
  const l = lines.get(d.ref);
  const before = new Set(l.rels.flat().map((w) => w.id)).size;
  const coords = dedupeParallel(l.rels);
  l.stat = `${before}→${coords.length}`;
  return {
    type: "Feature",
    geometry: { type: "MultiLineString", coordinates: coords },
    properties: { ref: d.ref, name: d.name, short: d.short, colour: l.colour, sort: i + 1 },
  };
});
writeOut("subway_line.geojson", { type: "FeatureCollection", features: lineFeatures });
console.log(`subway_line: 관계 ${usedRels.total}개 중 ${usedRels.kept}개 사용 →`,
  lineFeatures.map((f) => `${f.properties.name}(${lines.get(f.properties.ref).stat})`).join(", "));
const missing = LINES.filter((d) => !lines.has(d.ref)).map((d) => d.name);
if (missing.length) console.log("  ! 찾지 못한 노선:", missing.join(", "));

// ---------- 정차역 목록 [{ ref, name }] ----------
const stopEls = readRaw("rail_stop");
const stopNodes = new Map(stopEls.filter((e) => e.type === "node").map((n) => [n.id, n]));
const pairs = new Map();
for (const r of stopEls.filter((e) => e.type === "relation")) {
  const def = lineOf(r.tags);
  if (!def) continue;
  for (const m of r.members) {
    if (m.type !== "node" || !/^stop/.test(m.role)) continue;
    const name = nameOf(stopNodes.get(m.ref)?.tags);
    if (name) pairs.set(`${def.ref}|${norm(name)}`, { ref: def.ref, name: norm(name) });
  }
}
const stops = [...pairs.values()].sort((a, b) => a.ref.localeCompare(b.ref) || a.name.localeCompare(b.name));
writeOut("subway_stop.json", stops);
console.log("subway_stop", stops.length, "pairs");

// ---------- 전철역 (poi category 'subway') ----------
// 지하철/경전철/일반철도 역 점 중에서, 위 노선의 정차역 이름과 일치하는 것만 남긴다
// (KTX만 서는 역, 화물역 등은 제외)
const stopNames = new Set(stops.map((s) => s.name));
const stationEls = readRaw("station").filter((e) => {
  const n = nameOf(e.tags);
  return n && stopNames.has(norm(n));
});
const stationFeatures = toPoints(stationEls);
writeOut("subway.geojson", { type: "FeatureCollection", features: stationFeatures });
console.log("subway(전철역 점)", stationFeatures.length, "/ 이름 종류", new Set(stationFeatures.map((f) => norm(f.properties.name))).size);
