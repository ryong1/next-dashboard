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

export type DistrictDetail = DistrictRef & {
  nameEng: string;
  areaKm2: number;
  perimeterKm: number;
  center: [number, number];
  stats: DistrictStats;
  subwayStations: string[];
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
  { key: "subway", label: "지하철역", color: "#e8590c" },
  { key: "school", label: "학교", color: "#6f42c1" },
  { key: "hospital", label: "병원", color: "#d63939" },
  { key: "park", label: "공원", color: "#2f9e44" },
];
