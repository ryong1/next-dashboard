"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../../app/map/map.module.css";
import SeoulMap, { classColors } from "./seoulMap";
import {
  METRICS,
  POI_LAYERS,
  formatMetric,
  getDistrictDetail,
  getDistricts,
  getDistrictSummary,
  metricOf,
  quantileBreaks,
  type DistrictCollection,
  type DistrictDetail,
  type DistrictSummary,
  type MetricKey,
  type PoiCategory,
} from "../../common/district";

export default function DistrictExplorer() {
  const [data, setData] = useState<DistrictCollection | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistrictDetail | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>("areaKm2");
  const [visiblePois, setVisiblePois] = useState<PoiCategory[]>([]);
  const [poiLoading, setPoiLoading] = useState<PoiCategory[]>([]);

  useEffect(() => {
    Promise.all([getDistricts(), getDistrictSummary()])
      .then(([geo, sum]) => {
        setData(geo);
        setSummary(sum);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedCode) return;
    let ignore = false;
    getDistrictDetail(selectedCode)
      .then((d) => !ignore && setDetail(d))
      .catch((e: Error) => !ignore && setError(e.message));
    return () => {
      ignore = true;
    };
  }, [selectedCode]);

  const metric = metricOf(metricKey);
  const districts = useMemo(() => data?.features.map((f) => f.properties) ?? [], [data]);

  const breaks = useMemo(
    () => (districts.length ? quantileBreaks(districts.map((d) => d[metricKey]), metric.decimals) : []),
    [districts, metricKey, metric.decimals],
  );

  const ranking = useMemo(
    () => [...districts].sort((a, b) => b[metricKey] - a[metricKey]),
    [districts, metricKey],
  );
  const maxValue = ranking[0]?.[metricKey] || 1;

  /** 25개 구 중 순위 (값이 클수록 1위) */
  const rankOf = (code: string, key: MetricKey) => {
    const v = districts.find((d) => d.code === code)?.[key] ?? 0;
    return districts.filter((d) => d[key] > v).length + 1;
  };

  const togglePoi = (key: PoiCategory) =>
    setVisiblePois((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handlePoiLoading = useCallback((key: PoiCategory, loading: boolean) => {
    setPoiLoading((prev) => (loading ? [...prev, key] : prev.filter((k) => k !== key)));
  }, []);

  // 선택이 바뀌면 이전 상세는 보여주지 않음
  const shownDetail = detail && detail.code === selectedCode ? detail : null;

  if (error) {
    return (
      <div className="alert alert-warning rounded-4 border-0 shadow-sm">
        <strong className="d-block mb-1">지도 데이터를 불러오지 못했어요</strong>
        <span className="small">
          백엔드(gis-api, http://localhost:8080)가 실행 중인지 확인해 주세요. ({error})
        </span>
      </div>
    );
  }

  const t = summary?.totals;
  const stats = summary && t
    ? [
        { label: "자치구", value: `${summary.count}개`, sub: `총면적 ${summary.totalAreaKm2} km²` },
        { label: "지하철역", value: `${t.subway}개`, sub: "구별 합계 · OSM" },
        { label: "학교", value: `${t.school.toLocaleString()}개`, sub: "초·중·고 등 · OSM" },
        { label: "병원", value: `${t.hospital}개`, sub: "종합·일반병원 · OSM" },
        { label: "공원", value: `${t.park.toLocaleString()}개`, sub: `면적 ${t.parkAreaKm2} km²` },
        { label: "공원 면적 비율", value: `${t.parkRatio}%`, sub: "서울 면적 대비" },
      ]
    : [];

  const colors = classColors(metric, breaks);
  const legend = colors.map((color, i) => {
    const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: metric.decimals });
    let text = "전체";
    if (breaks.length) {
      if (i === 0) text = `${fmt(breaks[0])} 미만`;
      else if (i === breaks.length) text = `${fmt(breaks[i - 1])} 이상`;
      else text = `${fmt(breaks[i - 1])} – ${fmt(breaks[i])}`;
    }
    return { color, text };
  });

  return (
    <>
      {/* 요약 카드 */}
      <section className="row g-3 mb-4">
        {(stats.length ? stats : Array.from({ length: 6 }, () => null)).map((s, i) => (
          <div className="col-6 col-md-4 col-xxl-2" key={s?.label ?? i}>
            <article className="card h-100 border-0 shadow-sm rounded-4">
              <div className="card-body p-3">
                {s ? (
                  <>
                    <p className="text-secondary small mb-1">{s.label}</p>
                    <h2 className="h4 fw-bold mb-1">{s.value}</h2>
                    <small className="text-secondary">{s.sub}</small>
                  </>
                ) : (
                  <div className="placeholder-glow">
                    <span className="placeholder col-6 mb-3" />
                    <span className="placeholder placeholder-lg col-8" />
                  </div>
                )}
              </div>
            </article>
          </div>
        ))}
      </section>

      <section className="row g-4">
        {/* 지도 */}
        <div className="col-12 col-xl-8">
          <article className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className={styles.toolbar}>
              <div>
                <span className={styles.toolbarLabel}>색칠 기준</span>
                <div className="d-flex flex-wrap gap-1">
                  {METRICS.map((m) => (
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
              </div>
              <div>
                <span className={styles.toolbarLabel}>시설 표시</span>
                <div className="d-flex flex-wrap gap-1">
                  {POI_LAYERS.map((p) => {
                    const on = visiblePois.includes(p.key);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        className={`${styles.segment} ${on ? styles.segmentOn : ""}`}
                        aria-pressed={on}
                        onClick={() => togglePoi(p.key)}
                      >
                        {poiLoading.includes(p.key) ? (
                          <span className="spinner-border" style={{ width: 10, height: 10, borderWidth: 2 }} />
                        ) : (
                          <span className={styles.dot} style={{ background: p.color }} />
                        )}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.mapWrap}>
              {data ? (
                <SeoulMap
                  data={data}
                  metric={metric}
                  breaks={breaks}
                  visiblePois={visiblePois}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                  onPoiLoading={handlePoiLoading}
                />
              ) : (
                <div className="d-flex h-100 align-items-center justify-content-center text-secondary">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  지도 불러오는 중…
                </div>
              )}

              {/* 범례 */}
              <div className={styles.legend}>
                <strong className="d-block small mb-2">
                  {metric.label} ({metric.unit})
                </strong>
                {legend.map((l) => (
                  <div key={l.text} className="d-flex align-items-center gap-2 small">
                    <span className={styles.swatch} style={{ background: l.color }} />
                    {l.text}
                  </div>
                ))}
              </div>
            </div>
          </article>
          <p className="small text-secondary mt-2 mb-0">
            행정구역: 도로명주소 기반 서울시 구 경계(단순화) · 시설: © OpenStreetMap contributors
            (2026-11 수집). 공원 면적 비율은 OSM 공원(leisure=park) 기준이라 산림·국립공원은 포함되지 않아요.
          </p>
        </div>

        {/* 우측 패널 */}
        <div className="col-12 col-xl-4 d-flex flex-column gap-4">
          {/* 선택한 구 상세 */}
          <article className="card border-0 shadow-sm rounded-4">
            <div className="card-body p-4">
              {!selectedCode && (
                <>
                  <h2 className="h5 fw-bold mb-2">구 상세 정보</h2>
                  <p className="text-secondary small mb-0">
                    지도에서 구를 클릭하거나 아래 순위에서 선택하세요.
                  </p>
                </>
              )}

              {selectedCode && !shownDetail && (
                <div className="placeholder-glow">
                  <span className="placeholder col-5 mb-3" />
                  <span className="placeholder col-12" />
                  <span className="placeholder col-10" />
                </div>
              )}

              {shownDetail && (
                <>
                  <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                    <div>
                      <p className="small text-secondary mb-1">
                        {shownDetail.nameEng} · {shownDetail.code}
                      </p>
                      <h2 className="h4 fw-bold mb-0">{shownDetail.name}</h2>
                    </div>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="선택 해제"
                      onClick={() => setSelectedCode(null)}
                    />
                  </div>

                  <div className={`mb-3 ${styles.tileGrid}`}>
                    {[
                      { key: "areaKm2" as const, label: "면적", value: `${shownDetail.areaKm2} km²` },
                      { key: "subway" as const, label: "지하철역", value: `${shownDetail.stats.subway}개` },
                      { key: "school" as const, label: "학교", value: `${shownDetail.stats.school}개` },
                      { key: "hospital" as const, label: "병원", value: `${shownDetail.stats.hospital}개` },
                      { key: "parkRatio" as const, label: "공원 비율", value: `${shownDetail.stats.parkRatio}%` },
                    ].map((tile) => (
                      <button
                        key={tile.key}
                        type="button"
                        className={`${styles.tile} ${tile.key === metricKey ? styles.tileActive : ""}`}
                        onClick={() => setMetricKey(tile.key)}
                        title={`${tile.label} 기준으로 지도 색칠`}
                      >
                        <span className="d-block small text-secondary">{tile.label}</span>
                        <strong className="d-block">{tile.value}</strong>
                        <span className={styles.tileRank}>{rankOf(shownDetail.code, tile.key)}위 / 25</span>
                      </button>
                    ))}
                    <div className={styles.tile}>
                      <span className="d-block small text-secondary">둘레</span>
                      <strong className="d-block">{shownDetail.perimeterKm} km</strong>
                      <span className={styles.tileRank}>공원 {shownDetail.stats.park}곳</span>
                    </div>
                  </div>

                  {shownDetail.subwayStations.length > 0 && (
                    <>
                      <p className="small text-secondary mb-2">
                        지하철역 {shownDetail.subwayStations.length}곳
                      </p>
                      <div className="d-flex flex-wrap gap-1 mb-3">
                        {shownDetail.subwayStations.map((s) => (
                          <span key={s} className={styles.station}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <p className="small text-secondary mb-2">
                    맞닿은 구 {shownDetail.neighbors.length}곳
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    {shownDetail.neighbors.map((n) => (
                      <button
                        key={n.code}
                        type="button"
                        className={`btn btn-sm rounded-pill ${styles.chip}`}
                        onClick={() => setSelectedCode(n.code)}
                      >
                        {n.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </article>

          {/* 지표 순위 */}
          <article className="card border-0 shadow-sm rounded-4 flex-grow-1">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">{metric.label} 순위</h2>
              <ol className={`list-unstyled mb-0 ${styles.rankList}`}>
                {ranking.map((d, i) => (
                  <li key={d.code}>
                    <button
                      type="button"
                      className={`${styles.rankItem} ${d.code === selectedCode ? styles.rankActive : ""}`}
                      onClick={() => setSelectedCode(d.code)}
                    >
                      <span className={styles.rankNo}>{i + 1}</span>
                      <span className="flex-grow-1 text-start">
                        <span className="d-flex justify-content-between small mb-1">
                          <span className="fw-semibold">{d.name}</span>
                          <span className="text-secondary">{formatMetric(metric, d[metricKey])}</span>
                        </span>
                        <span className={styles.rankTrack}>
                          <span
                            className={styles.rankBar}
                            style={{
                              width: `${(d[metricKey] / maxValue) * 100}%`,
                              background: metric.colors[3],
                            }}
                          />
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
