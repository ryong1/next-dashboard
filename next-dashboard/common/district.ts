import { apiGet } from "./api";

// ---------- gis-api 응답 타입 ----------

export type DistrictStats = {
  subway: number;
  school: number;
  hospital: number;
  park: number;
  parkAreaKm2: number;
  parkRatio: number;
};

export type DistrictProperties = DistrictStats & {
  code: string;
  name: string;
  nameEng: string;
  areaKm2: number;
};

export type DistrictFeature = {
  type: "Feature";
  id: number;
  geometry: { type: "MultiPolygon"; coordinates: number[][][][] };
  properties: DistrictProperties;
};

export type DistrictCollection = {
  type: "FeatureCollection";
  features: DistrictFeature[];
};

export type DistrictRef = { code: string; name: string };

export type SubwayStation = { name: string; lines: string[] };

export type DistrictDetail = DistrictRef & {
  nameEng: string;
  areaKm2: number;
  perimeterKm: number;
  center: [number, number];
  stats: DistrictStats;
  subwayStations: SubwayStation[];
  neighbors: DistrictRef[];
};

export type DistrictSummary = {
  count: number;
  totalAreaKm2: number;
  largest: { name: string; areaKm2: number };
  smallest: { name: string; areaKm2: number };
  totals: DistrictStats;
};

export type PoiCategory = "subway" | "school" | "hospital" | "park";

export type PoiCollection = {
  type: "FeatureCollection";
  features: {
    type: "Feature";
    id: number;
    geometry: GeoJSON.Geometry;
    properties: { name: string | null; category: PoiCategory };
  }[];
};

export const getDistricts = () => apiGet<DistrictCollection>("/api/districts");
export const getDistrictSummary = () => apiGet<DistrictSummary>("/api/districts/summary");
export const getDistrictDetail = (code: string) =>
  apiGet<DistrictDetail>(`/api/districts/${code}`);
export const getPois = (category: PoiCategory) =>
  apiGet<PoiCollection>(`/api/pois?category=${category}`);
export const getSubwayLines = () => apiGet<GeoJSON.FeatureCollection>("/api/subway/lines");
export const getSubwayStations = () => apiGet<GeoJSON.FeatureCollection>("/api/subway/stations");

// 전철 노선 정보 (gis-api/scripts/osm/convert.js의 LINES, OSM colour 태그와 같게 맞춤). 표시 순서대로.
export type SubwayLine = { ref: string; name: string; short: string; color: string };
export const SUBWAY_LINES: SubwayLine[] = [
  { ref: "1", name: "1호선", short: "1", color: "#004A85" },
  { ref: "2", name: "2호선", short: "2", color: "#00A23F" },
  { ref: "3", name: "3호선", short: "3", color: "#ED6C00" },
  { ref: "4", name: "4호선", short: "4", color: "#009BCE" },
  { ref: "5", name: "5호선", short: "5", color: "#794698" },
  { ref: "6", name: "6호선", short: "6", color: "#7C4932" },
  { ref: "7", name: "7호선", short: "7", color: "#6E7E31" },
  { ref: "8", name: "8호선", short: "8", color: "#D11D70" },
  { ref: "9", name: "9호선", short: "9", color: "#A49D87" },
  { ref: "GJ", name: "경의중앙선", short: "경의중앙", color: "#6AC2B3" },
  { ref: "AR", name: "공항철도", short: "공항", color: "#0079AC" },
  { ref: "SB", name: "신분당선", short: "신분당", color: "#B81B30" },
  { ref: "SU", name: "수인분당선", short: "수인분당", color: "#ECA300" },
  { ref: "GC", name: "경춘선", short: "경춘", color: "#007A62" },
  { ref: "SH", name: "서해선", short: "서해", color: "#5EAC41" },
  { ref: "GA", name: "GTX-A", short: "GTX-A", color: "#AB087D" },
  { ref: "UI", name: "우이신설선", short: "우이신설", color: "#BACC50" },
  { ref: "SL", name: "신림선", short: "신림", color: "#6789CA" },
  { ref: "GG", name: "김포골드라인", short: "김포골드", color: "#957326" },
];

const LINE_BY_REF = new Map(SUBWAY_LINES.map((l) => [l.ref, l]));
export const lineOf = (ref: string): SubwayLine =>
  LINE_BY_REF.get(ref) ?? { ref, name: ref, short: ref, color: "#888888" };

/** "2·6호선", "2호선·경의중앙선·공항철도"처럼 사람이 읽는 노선 목록 */
export function lineNames(refs: string[]) {
  if (refs.length && refs.every((r) => /^[1-9]$/.test(r))) return `${refs.join("·")}호선`;
  return refs.map((r) => lineOf(r).name).join("·");
}

// ---------- 지도 색칠 기준(지표) ----------

export type MetricKey = "areaKm2" | "subway" | "school" | "hospital" | "parkRatio";

export type Metric = {
  key: MetricKey;
  label: string;
  unit: string;
  decimals: number;
  colors: string[]; // 낮음 → 높음, 5단계
};

const BLUES = ["#e3e9fb", "#b8c6f2", "#8ea3e6", "#6680d4", "#3f58ad"];

export const METRICS: Metric[] = [
  { key: "areaKm2", label: "면적", unit: "km²", decimals: 2, colors: BLUES },
  { key: "subway", label: "지하철역", unit: "개", decimals: 0,
    colors: ["#fff1e6", "#ffd2ad", "#ffab70", "#f7823a", "#d9580d"] },
  { key: "school", label: "학교", unit: "개", decimals: 0,
    colors: ["#f1edfd", "#d6cbf8", "#b3a0ef", "#8c72e2", "#6447c4"] },
  { key: "hospital", label: "병원", unit: "개", decimals: 0,
    colors: ["#fdecec", "#f8c4c4", "#f09494", "#e26464", "#c23a3a"] },
  { key: "parkRatio", label: "공원 면적 비율", unit: "%", decimals: 1,
    colors: ["#eaf6ec", "#c4e6ca", "#93cf9e", "#5fb26f", "#2f8a45"] },
];

export const metricOf = (key: MetricKey) => METRICS.find((m) => m.key === key)!;

export const formatMetric = (m: Metric, v: number) =>
  `${v.toLocaleString(undefined, { maximumFractionDigits: m.decimals })}${m.unit === "%" ? "%" : ` ${m.unit}`}`;

/**
 * 5분위(quantile) 경계값. 반환값은 4개 이하의 오름차순 경계(중복 제거).
 * 지도 step 식과 범례가 같은 경계를 쓴다.
 */
export function quantileBreaks(values: number[], decimals: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const f = 10 ** decimals;
  const breaks = [0.2, 0.4, 0.6, 0.8].map(
    (q) => Math.round(sorted[Math.floor(q * (sorted.length - 1))] * f) / f,
  );
  return breaks.filter((b, i) => b > sorted[0] && b !== breaks[i - 1]);
}

// ---------- 시설 레이어 ----------

export const POI_LAYERS: { key: PoiCategory; label: string; color: string }[] = [
  { key: "subway", label: "지하철", color: "#00A23F" },
  { key: "school", label: "학교", color: "#6f42c1" },
  { key: "hospital", label: "병원", color: "#d63939" },
  { key: "park", label: "공원", color: "#2f9e44" },
];
