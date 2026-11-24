// 지도 색칠 기준(지표). 지표 하나에 한 색 계열, 낮음 → 높음 5단계.

export type MetricKey = "areaKm2" | "subway" | "school" | "hospital" | "parkRatio";

export type Metric = {
  key: MetricKey;
  label: string;
  unit: string;
  decimals: number;
  colors: string[];
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
