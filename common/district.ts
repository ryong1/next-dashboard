import { apiGet } from "./api";

// gis-api 응답 타입

export type DistrictProperties = {
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
  neighbors: DistrictRef[];
};

export type DistrictSummary = {
  count: number;
  totalAreaKm2: number;
  largest: { name: string; areaKm2: number };
  smallest: { name: string; areaKm2: number };
};

export const getDistricts = () => apiGet<DistrictCollection>("/api/districts");
export const getDistrictSummary = () => apiGet<DistrictSummary>("/api/districts/summary");
export const getDistrictDetail = (code: string) =>
  apiGet<DistrictDetail>(`/api/districts/${code}`);

// 면적 단계 구분 색 (지도 범례와 공유)
export const AREA_STEPS: { min: number; color: string }[] = [
  { min: 0, color: "#e3e9fb" },
  { min: 15, color: "#b8c6f2" },
  { min: 20, color: "#8ea3e6" },
  { min: 25, color: "#6680d4" },
  { min: 35, color: "#4560b8" },
];
