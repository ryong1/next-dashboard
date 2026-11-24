import type { PoiCategory } from "../types";

// 지도 시설 레이어 (켜고 끄는 버튼과 점 색)
export const POI_LAYERS: { key: PoiCategory; label: string; color: string }[] = [
  { key: "subway", label: "지하철", color: "#00A23F" },
  { key: "school", label: "학교", color: "#6f42c1" },
  { key: "hospital", label: "병원", color: "#d63939" },
  { key: "park", label: "공원", color: "#2f9e44" },
];

// 반경 분석에서 고를 수 있는 반경(m). 백엔드 허용 범위는 100~3000m
export const RADIUS_OPTIONS = [500, 1000, 2000];
