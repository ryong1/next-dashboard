"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import styles from "./explorer.module.css";
import ServerErrorNotice from "../serverErrorNotice";
import LineBadge from "../lineBadge";
import SeoulMap, { classColors, type MapPadding } from "./seoulMap";
import RadiusPanel from "./radiusPanel";
import {
  METRICS,
  POI_LAYERS,
  RADIUS_OPTIONS,
  SUBWAY_LINES,
  formatDistance,
  formatMetric,
  getDistrictDetail,
  getRadiusAnalysis,
  getDistricts,
  getDistrictSummary,
  metricOf,
  quantileBreaks,
  type DistrictCollection,
  type DistrictDetail,
  type DistrictSummary,
  type MetricKey,
  type PoiCategory,
  type RadiusResult,
} from "../../common/district";

const analysisKey = (point: [number, number], r: number) => `${point[0].toFixed(6)},${point[1].toFixed(6)},${r}`;

// lg(992px) 이상이면 패널이 지도 위에 떠 있는 레이아웃
const DESKTOP_QUERY = "(min-width: 992px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

// 떠 있는 패널이 가리는 영역 (explorer.module.css의 크기와 맞춤, 조작 카드가 두 줄이 되는 경우까지 고려)
const DESKTOP_PADDING: MapPadding = { top: 260, right: 380, bottom: 32, left: 32 };
const MOBILE_PADDING: MapPadding = { top: 16, right: 16, bottom: 16, left: 16 };

export default function DistrictExplorer() {
  const [data, setData] = useState<DistrictCollection | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistrictDetail | null>(null);
  const [metricKey, setMetricKey] = useState<MetricKey>("areaKm2");
  const [visiblePois, setVisiblePois] = useState<PoiCategory[]>([]);
  const [poiLoading, setPoiLoading] = useState<PoiCategory[]>([]);
  const isDesktop = useIsDesktop();

  // 반경 분석
  const [analyzeMode, setAnalyzeMode] = useState(false);
  const [radius, setRadius] = useState(RADIUS_OPTIONS[0]);
  const [point, setPoint] = useState<[number, number] | null>(null);
  const [analysis, setAnalysis] = useState<RadiusResult | null>(null);
  const [analysisFailedKey, setAnalysisFailedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!point) return;
    let ignore = false;
    const key = analysisKey(point, radius);
    getRadiusAnalysis(point[0], point[1], radius)
      .then((r) => !ignore && setAnalysis(r))
      .catch(() => !ignore && setAnalysisFailedKey(key));
    return () => {
      ignore = true;
    };
  }, [point, radius]);

  const currentKey = point ? analysisKey(point, radius) : null;
  const analysisFresh = !!(analysis && currentKey && analysisKey(analysis.center, analysis.radius) === currentKey);
  const analysisFailed = !!currentKey && analysisFailedKey === currentKey;

  const toggleAnalyze = () => {
    if (analyzeMode) {
      setAnalyzeMode(false);
      setPoint(null);
      setAnalysis(null);
    } else {
      setSelectedCode(null);
      setAnalyzeMode(true);
    }
  };

  const handleAnalyze = useCallback((lng: number, lat: number) => setPoint([lng, lat]), []);

  useEffect(() => {
    Promise.all([getDistricts(), getDistrictSummary()])
      .then(([geo, sum]) => {
        setData(geo);
        setSummary(sum);
      })
      .catch((e) => setError(e));
  }, [reloadKey]);

  useEffect(() => {
    if (!selectedCode) return;
    let ignore = false;
    getDistrictDetail(selectedCode)
      .then((d) => !ignore && setDetail(d))
      .catch((e) => !ignore && setError(e));
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
      <div className="p-4">
        <ServerErrorNotice
          error={error}
          what="지도 데이터"
          onRetry={() => {
            setError(null);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  const t = summary?.totals;
  const statChips = summary && t
    ? [
        { label: "자치구", value: `${summary.count}개` },
        { label: "면적", value: `${summary.totalAreaKm2} km²` },
        { label: "지하철역", value: `${t.subway}` },
        { label: "학교", value: t.school.toLocaleString() },
        { label: "병원", value: `${t.hospital}` },
        { label: "공원 비율", value: `${t.parkRatio}%` },
      ]
    : [];

  const colors = classColors(metric, breaks);
  const fmt = (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: metric.decimals });
  const legend = colors.map((color, i) => {
    let text = "전체";
    if (breaks.length) {
      if (i === 0) text = `${fmt(breaks[0])} 미만`;
      else if (i === breaks.length) text = `${fmt(breaks[i - 1])} 이상`;
      else text = `${fmt(breaks[i - 1])} – ${fmt(breaks[i])}`;
    }
    return { color, text };
  });

  return (
    <div className={styles.stage}>
      {/* ---------- 지도 (화면 전체) ---------- */}
      <div className={styles.mapArea}>
        {data ? (
          <SeoulMap
            data={data}
            metric={metric}
            breaks={breaks}
            visiblePois={visiblePois}
            selectedCode={selectedCode}
            onSelect={setSelectedCode}
            onPoiLoading={handlePoiLoading}
            clickMode={analyzeMode ? "analyze" : "select"}
            onAnalyze={handleAnalyze}
            analysis={analyzeMode ? analysis : null}
            padding={isDesktop ? DESKTOP_PADDING : MOBILE_PADDING}
          />
        ) : (
          <div className="d-flex h-100 align-items-center justify-content-center text-secondary">
            <div className="spinner-border spinner-border-sm me-2" role="status" />
            지도 불러오는 중…
          </div>
        )}

        {/* 범례 */}
        <div className={`${styles.glass} ${styles.legend}`}>
          <strong className="d-block small mb-2">
            {metric.label} <span className="text-secondary fw-normal">({metric.unit})</span>
          </strong>
          {legend.map((l) => (
            <div key={l.text} className="d-flex align-items-center gap-2 small">
              <span className={styles.swatch} style={{ background: l.color }} />
              {l.text}
            </div>
          ))}
          {visiblePois.includes("subway") && (
            <>
              <strong className="d-block small mt-3 mb-2">전철 노선</strong>
              <div className={styles.lineLegend}>
                {SUBWAY_LINES.map((l) => (
                  <LineBadge key={l.ref} line={l.ref} size="sm" />
                ))}
              </div>
              <div className="d-flex align-items-center gap-2 small mt-2 text-secondary">
                <span className={styles.transferIcon} /> 환승역
              </div>
            </>
          )}
        </div>
      </div>

      {/* ---------- 왼쪽 위: 제목 + 요약 + 조작 ---------- */}
      <div className={styles.topLeft}>
        <section className={`${styles.glass} ${styles.titleCard}`}>
          <p className={styles.eyebrow}>SEOUL · PostGIS + OpenStreetMap</p>
          <h1 className={styles.title}>서울시 자치구 지도</h1>
          <div className={styles.statChips}>
            {statChips.length
              ? statChips.map((s) => (
                  <span key={s.label} className={styles.statChip}>
                    <span className={styles.statLabel}>{s.label}</span>
                    <strong>{s.value}</strong>
                  </span>
                ))
              : Array.from({ length: 4 }, (_, i) => (
                  <span key={i} className="placeholder-glow">
                    <span className="placeholder rounded-pill" style={{ width: 80 }} />
                  </span>
                ))}
          </div>
        </section>

        <section className={`${styles.glass} ${styles.controls}`}>
          <div>
            <span className={styles.controlLabel}>색칠 기준</span>
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
            <span className={styles.controlLabel}>시설 표시</span>
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
                      <span
                        className={styles.dot}
                        style={{
                          background:
                            p.key === "subway"
                              ? "conic-gradient(#004A85 0 25%, #00A23F 0 50%, #ED6C00 0 75%, #009BCE 0)"
                              : p.color,
                        }}
                      />
                    )}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className={styles.controlLabel}>공간 분석</span>
            <div className="d-flex flex-wrap gap-1">
              <button
                type="button"
                className={`${styles.segment} ${analyzeMode ? styles.segmentActive : ""}`}
                aria-pressed={analyzeMode}
                onClick={toggleAnalyze}
              >
                ◎ 반경 분석
              </button>
              {analyzeMode &&
                RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`${styles.segment} ${r === radius ? styles.segmentOn : ""}`}
                    aria-pressed={r === radius}
                    onClick={() => setRadius(r)}
                  >
                    {formatDistance(r)}
                  </button>
                ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---------- 오른쪽 패널: 상세 또는 순위 ---------- */}
      <aside className={`${styles.glass} ${styles.panel}`}>
        {analyzeMode ? (
          <RadiusPanel
            point={point}
            radius={radius}
            result={analysisFresh ? analysis : null}
            loading={!!point && !analysisFresh && !analysisFailed}
            error={analysisFailed}
            onExit={toggleAnalyze}
          />
        ) : selectedCode ? (
          <>
            <button type="button" className={styles.backBtn} onClick={() => setSelectedCode(null)}>
              ← {metric.label} 순위로
            </button>

            {!shownDetail ? (
              <div className="placeholder-glow mt-3">
                <span className="placeholder col-5 mb-3" />
                <span className="placeholder col-12" />
                <span className="placeholder col-10" />
              </div>
            ) : (
              <>
                <p className="small text-secondary mb-1 mt-3">
                  {shownDetail.nameEng} · {shownDetail.code}
                </p>
                <h2 className="h3 fw-bold mb-3">{shownDetail.name}</h2>

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
                        <span key={s.name} className={styles.station}>
                          {s.lines.map((l) => (
                            <LineBadge key={l} line={l} size="sm" />
                          ))}
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                <p className="small text-secondary mb-2">맞닿은 구 {shownDetail.neighbors.length}곳</p>
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
          </>
        ) : (
          <>
            <div className="d-flex align-items-baseline justify-content-between mb-1">
              <h2 className="h5 fw-bold mb-0">{metric.label} 순위</h2>
              <small className="text-secondary">25개 구</small>
            </div>
            <p className="small text-secondary mb-3">구를 클릭하면 상세 정보를 볼 수 있어요.</p>
            <ol className={`list-unstyled mb-0 ${styles.rankList}`}>
              {ranking.map((d, i) => (
                <li key={d.code}>
                  <button type="button" className={styles.rankItem} onClick={() => setSelectedCode(d.code)}>
                    <span className={styles.rankNo}>{i + 1}</span>
                    <span className="flex-grow-1 text-start">
                      <span className="d-flex justify-content-between small mb-1">
                        <span className="fw-semibold">{d.name}</span>
                        <span className="text-secondary">{formatMetric(metric, d[metricKey])}</span>
                      </span>
                      <span className={styles.rankTrack}>
                        <span
                          className={styles.rankBar}
                          style={{ width: `${(d[metricKey] / maxValue) * 100}%`, background: metric.colors[3] }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}

        <p className={styles.note}>
          행정구역: 도로명주소 기반 구 경계(단순화) · 시설: © OpenStreetMap contributors (2026-11).
          공원 비율은 OSM 공원(leisure=park) 기준이라 산림·국립공원은 빠져 있어요.
        </p>
      </aside>
    </div>
  );
}
