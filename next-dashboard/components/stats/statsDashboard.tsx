"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./stats.module.css";
import ServerErrorNotice from "../serverErrorNotice";
import LineBadge from "../lineBadge";
import {
  SUBWAY_LINES,
  lineOf,
  getDistricts,
  getSubwayStations,
  type DistrictProperties,
} from "../../common/district";

type Station = { name: string; lines: string[]; transfer: boolean };

// 구별 비교 지표: 모두 "면적당" 또는 "비율"이라 크기가 다른 구끼리 공정하게 비교된다
type DensityKey = "subwayDensity" | "schoolDensity" | "hospitalDensity" | "parkRatio";
type Row = DistrictProperties & Record<DensityKey, number>;

const DENSITY: { key: DensityKey; label: string; unit: string; decimals: number; explain: (r: Row) => string }[] = [
  {
    key: "subwayDensity", label: "지하철역 밀도", unit: "곳/km²", decimals: 2,
    explain: (r) => `지하철역 ${r.subway}곳 ÷ 면적 ${r.areaKm2} km²`,
  },
  {
    key: "schoolDensity", label: "학교 밀도", unit: "곳/km²", decimals: 2,
    explain: (r) => `학교 ${r.school}곳 ÷ 면적 ${r.areaKm2} km²`,
  },
  {
    key: "hospitalDensity", label: "병원 밀도", unit: "곳/km²", decimals: 2,
    explain: (r) => `병원 ${r.hospital}곳 ÷ 면적 ${r.areaKm2} km²`,
  },
  {
    key: "parkRatio", label: "공원 면적 비율", unit: "%", decimals: 1,
    explain: (r) => `공원 ${r.parkAreaKm2} km² ÷ 면적 ${r.areaKm2} km²`,
  },
];

const fmt = (v: number, d: number) => v.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

export default function StatsDashboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [metricKey, setMetricKey] = useState<DensityKey>("subwayDensity");
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDistricts(), getSubwayStations()])
      .then(([geo, st]) => {
        setRows(
          geo.features.map(({ properties: p }) => ({
            ...p,
            subwayDensity: p.subway / p.areaKm2,
            schoolDensity: p.school / p.areaKm2,
            hospitalDensity: p.hospital / p.areaKm2,
          })),
        );
        setStations(st.features.map((f) => f.properties as Station));
      })
      .catch((e) => setError(e));
  }, [reloadKey]);

  const metric = DENSITY.find((m) => m.key === metricKey)!;

  // 서울 전체 값 = 합계 ÷ 총면적 (구 평균의 평균이 아님)
  const seoul = useMemo(() => {
    if (!rows) return null;
    const sum = (k: keyof DistrictProperties) => rows.reduce((s, r) => s + (r[k] as number), 0);
    const area = sum("areaKm2");
    return {
      area,
      subwayDensity: sum("subway") / area,
      schoolDensity: sum("school") / area,
      hospitalDensity: sum("hospital") / area,
      parkRatio: (sum("parkAreaKm2") / area) * 100,
    };
  }, [rows]);

  const ranked = useMemo(
    () => (rows ? [...rows].sort((a, b) => b[metricKey] - a[metricKey]) : []),
    [rows, metricKey],
  );

  // 호선별 서울 시내 역 수 (환승역은 각 호선에 모두 셈)
  const perLine = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stations) for (const l of s.lines) counts.set(l, (counts.get(l) ?? 0) + 1);
    return [...counts.entries()].map(([line, count]) => ({ line, count })).sort((a, b) => b.count - a.count);
  }, [stations]);

  const transfers = useMemo(
    () =>
      stations
        .filter((s) => s.lines.length > 1)
        .sort((a, b) => b.lines.length - a.lines.length || a.name.localeCompare(b.name, "ko")),
    [stations],
  );

  if (error) {
    return (
      <ServerErrorNotice
        error={error}
        what="통계 데이터"
        onRetry={() => {
          setError(null);
          setReloadKey((k) => k + 1);
        }}
      />
    );
  }

  if (!rows || !seoul) {
    return (
      <div className="d-flex align-items-center text-secondary py-5">
        <div className="spinner-border spinner-border-sm me-2" role="status" />
        통계를 계산하는 중…
      </div>
    );
  }

  const max = ranked[0]?.[metricKey] || 1;
  const avg = seoul[metricKey];
  const lineMax = perLine[0]?.count || 1;

  const kpis = [
    { label: "지하철역 밀도", value: fmt(seoul.subwayDensity, 2), unit: "곳/km²", sub: `${stations.length}개 역 · 환승역 ${transfers.length}곳` },
    { label: "학교 밀도", value: fmt(seoul.schoolDensity, 2), unit: "곳/km²", sub: `1곳당 ${fmt(1 / seoul.schoolDensity, 2)} km²` },
    { label: "병원 밀도", value: fmt(seoul.hospitalDensity, 2), unit: "곳/km²", sub: `1곳당 ${fmt(1 / seoul.hospitalDensity, 1)} km²` },
    { label: "공원 면적 비율", value: fmt(seoul.parkRatio, 1), unit: "%", sub: `서울 면적 ${fmt(seoul.area, 1)} km² 기준` },
  ];

  return (
    <>
      {/* 핵심 지표 */}
      <section className="row g-3 mb-4">
        {kpis.map((k) => (
          <div className="col-6 col-xl-3" key={k.label}>
            <article className="card h-100 border-0 shadow-sm rounded-4">
              <div className="card-body p-3 p-md-4">
                <p className="text-secondary small mb-2">서울 {k.label}</p>
                <p className={styles.kpiValue}>
                  {k.value}
                  <span className={styles.kpiUnit}>{k.unit}</span>
                </p>
                <small className="text-secondary">{k.sub}</small>
              </div>
            </article>
          </div>
        ))}
      </section>

      <section className="row g-4 mb-4">
        {/* 구별 밀도 순위 */}
        <div className="col-12 col-xl-7">
          <article className="card h-100 border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
                <div>
                  <h2 className="h5 fw-bold mb-1">구별 {metric.label}</h2>
                  <p className="small text-secondary mb-0">
                    면적이 다른 구끼리 비교할 수 있도록 {metric.unit === "%" ? "면적 대비 비율" : "1km²당 개수"}로 계산했어요.
                  </p>
                </div>
              </div>

              <div className="d-flex flex-wrap gap-1 mb-3" role="group" aria-label="비교 지표">
                {DENSITY.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={`${styles.segment} ${m.key === metricKey ? styles.segmentActive : ""}`}
                    aria-pressed={m.key === metricKey}
                    onClick={() => setMetricKey(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className={styles.barChart} onMouseLeave={() => setHover(null)}>
                {/* 서울 평균선 */}
                <div className={styles.avgLine} style={{ left: `calc(var(--label-w) + (100% - var(--label-w) - var(--value-w)) * ${avg / max})` }}>
                  <span className={styles.avgLabel}>
                    서울 평균 {fmt(avg, metric.decimals)}
                  </span>
                </div>

                {ranked.map((r, i) => {
                  const v = r[metricKey];
                  const above = v >= avg;
                  return (
                    <div
                      key={r.code}
                      className={`${styles.barRow} ${hover === r.code ? styles.barRowHover : ""}`}
                      onMouseEnter={() => setHover(r.code)}
                      tabIndex={0}
                      onFocus={() => setHover(r.code)}
                      aria-label={`${i + 1}위 ${r.name} ${fmt(v, metric.decimals)}${metric.unit}`}
                    >
                      <span className={styles.barLabel}>
                        <span className={styles.rank}>{i + 1}</span>
                        {r.name}
                      </span>
                      <span className={styles.barTrack}>
                        <span
                          className={styles.bar}
                          style={{ width: `${(v / max) * 100}%`, background: above ? "#4560b8" : "#a7b5e6" }}
                        />
                      </span>
                      <span className={styles.barValue}>{fmt(v, metric.decimals)}</span>

                      {hover === r.code && (
                        <span className={styles.tooltip} role="tooltip">
                          <strong>{r.name}</strong> {fmt(v, metric.decimals)} {metric.unit}
                          <span className="d-block text-secondary">{metric.explain(r)}</span>
                          <span className="d-block text-secondary">
                            서울 평균보다 {above ? "높음" : "낮음"} ({fmt((v / avg) * 100, 0)}%)
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="d-flex flex-wrap gap-3 small text-secondary mt-3">
                <span className="d-flex align-items-center gap-2">
                  <span className={styles.key} style={{ background: "#4560b8" }} /> 서울 평균 이상
                </span>
                <span className="d-flex align-items-center gap-2">
                  <span className={styles.key} style={{ background: "#a7b5e6" }} /> 서울 평균 미만
                </span>
              </div>
            </div>
          </article>
        </div>

        <div className="col-12 col-xl-5 d-flex flex-column gap-4">
          {/* 호선별 역 수 */}
          <article className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-1">노선별 서울 시내 역 수</h2>
              <p className="small text-secondary mb-3">환승역은 지나는 노선마다 한 번씩 셌어요.</p>
              <div className={styles.lineChart}>
                {perLine.map(({ line, count }) => (
                  <div key={line} className={styles.lineRow} title={`${lineOf(line).name} ${count}개 역`}>
                    <span className={styles.lineLabel}>
                      <span className={styles.lineDot} style={{ background: lineOf(line).color }} />
                      {lineOf(line).name}
                    </span>
                    <span className={styles.barTrack}>
                      <span className={styles.bar} style={{ width: `${(count / lineMax) * 100}%`, background: "#6680d4" }} />
                    </span>
                    <span className={styles.barValue}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* 환승역 */}
          <article className="card border-0 shadow-sm rounded-4 flex-grow-1">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-1">환승역 {transfers.length}곳</h2>
              <p className="small text-secondary mb-3">지나는 노선이 많은 순서예요 (수도권 전철 {SUBWAY_LINES.length}개 노선 기준).</p>
              <div className="d-flex flex-wrap gap-1">
                {transfers.map((s) => (
                  <span key={s.name} className={styles.station}>
                    {s.lines.map((l) => (
                      <LineBadge key={l} line={l} size="sm" />
                    ))}
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 전체 표 */}
      <article className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-3">25개 구 전체 지표</h2>
          <div className="table-responsive">
            <table className={`table table-sm align-middle mb-0 ${styles.numTable}`}>
              <thead>
                <tr className="small text-secondary">
                  <th>구</th>
                  <th className="text-end">면적 (km²)</th>
                  <th className="text-end">지하철역</th>
                  <th className="text-end">역/km²</th>
                  <th className="text-end">학교</th>
                  <th className="text-end">학교/km²</th>
                  <th className="text-end">병원</th>
                  <th className="text-end">병원/km²</th>
                  <th className="text-end">공원 비율</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => a.name.localeCompare(b.name, "ko")).map((r) => (
                  <tr key={r.code}>
                    <td className="fw-semibold">{r.name}</td>
                    <td className="text-end">{fmt(r.areaKm2, 2)}</td>
                    <td className="text-end">{r.subway}</td>
                    <td className="text-end">{fmt(r.subwayDensity, 2)}</td>
                    <td className="text-end">{r.school}</td>
                    <td className="text-end">{fmt(r.schoolDensity, 2)}</td>
                    <td className="text-end">{r.hospital}</td>
                    <td className="text-end">{fmt(r.hospitalDensity, 2)}</td>
                    <td className="text-end">{fmt(r.parkRatio, 1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fw-semibold">
                  <td>서울 전체</td>
                  <td className="text-end">{fmt(seoul.area, 2)}</td>
                  <td className="text-end">{rows.reduce((s, r) => s + r.subway, 0)}</td>
                  <td className="text-end">{fmt(seoul.subwayDensity, 2)}</td>
                  <td className="text-end">{rows.reduce((s, r) => s + r.school, 0).toLocaleString()}</td>
                  <td className="text-end">{fmt(seoul.schoolDensity, 2)}</td>
                  <td className="text-end">{rows.reduce((s, r) => s + r.hospital, 0)}</td>
                  <td className="text-end">{fmt(seoul.hospitalDensity, 2)}</td>
                  <td className="text-end">{fmt(seoul.parkRatio, 1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="small text-secondary mt-3 mb-0">
            시설: © OpenStreetMap contributors (2026-11 수집) · 구 경계: 도로명주소 기반(단순화) · 면적은 PostGIS로 계산.
            지하철역 합계는 경계에 걸친 역이 양쪽 구에 모두 들어가 실제 역 수와 조금 달라요.
          </p>
        </div>
      </article>
    </>
  );
}
