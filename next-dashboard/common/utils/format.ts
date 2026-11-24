import type { Metric } from "../constants/metrics";

/**
 * 천 단위 구분 숫자. maxDigits까지 소수 표시, minDigits만큼은 0으로 채움.
 * 예: formatNumber(1234.5, 2) → "1,234.5", formatNumber(0.4, 2, 2) → "0.40"
 */
export const formatNumber = (v: number, maxDigits = 0, minDigits = 0) =>
  v.toLocaleString(undefined, { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits });

/** 지표 값 + 단위 (예: "23.97 km²", "13 개", "6.1%") */
export const formatMetric = (m: Metric, v: number) =>
  `${formatNumber(v, m.decimals)}${m.unit === "%" ? "%" : ` ${m.unit}`}`;

/** 거리 (1km 미만은 m, 이상은 소수 1자리 km) */
export const formatDistance = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`);
