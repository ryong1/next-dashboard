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
