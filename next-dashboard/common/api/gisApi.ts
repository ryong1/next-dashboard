import { apiGet } from "./client";
import type {
  DistrictCollection,
  DistrictDetail,
  DistrictSummary,
  PoiCategory,
  PoiCollection,
  RadiusResult,
} from "../types";

// gis-api 엔드포인트 호출 (경로와 응답 타입을 한곳에서 관리)

export const getDistricts = () => apiGet<DistrictCollection>("/api/districts");

export const getDistrictSummary = () => apiGet<DistrictSummary>("/api/districts/summary");

export const getDistrictDetail = (code: string) => apiGet<DistrictDetail>(`/api/districts/${code}`);

export const getPois = (category: PoiCategory) => apiGet<PoiCollection>(`/api/pois?category=${category}`);

export const getSubwayLines = () => apiGet<GeoJSON.FeatureCollection>("/api/subway/lines");

export const getSubwayStations = () => apiGet<GeoJSON.FeatureCollection>("/api/subway/stations");

export const getRadiusAnalysis = (lng: number, lat: number, r: number) =>
  apiGet<RadiusResult>(`/api/analysis/radius?lng=${lng.toFixed(6)}&lat=${lat.toFixed(6)}&r=${r}`);
