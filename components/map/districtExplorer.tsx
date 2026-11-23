"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../../app/map/map.module.css";
import SeoulMap from "./seoulMap";
import {
  AREA_STEPS,
  getDistrictDetail,
  getDistricts,
  getDistrictSummary,
  type DistrictCollection,
  type DistrictDetail,
  type DistrictSummary,
} from "../../common/district";

export default function DistrictExplorer() {
  const [data, setData] = useState<DistrictCollection | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [detail, setDetail] = useState<DistrictDetail | null>(null);

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

  // 선택이 바뀌면 이전 상세는 보여주지 않음
  const shownDetail = detail && detail.code === selectedCode ? detail : null;

  const ranking = useMemo(
    () =>
      data
        ? [...data.features]
            .map((f) => f.properties)
            .sort((a, b) => b.areaKm2 - a.areaKm2)
        : [],
    [data],
  );
  const maxArea = ranking[0]?.areaKm2 ?? 1;

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

  const stats = summary
    ? [
        { label: "자치구", value: `${summary.count}개`, sub: "서울특별시" },
        { label: "총면적", value: `${summary.totalAreaKm2.toLocaleString()} km²`, sub: "PostGIS 계산값" },
        { label: "가장 넓은 구", value: summary.largest.name, sub: `${summary.largest.areaKm2} km²` },
        { label: "가장 좁은 구", value: summary.smallest.name, sub: `${summary.smallest.areaKm2} km²` },
      ]
    : [];

  return (
    <>
      {/* 요약 카드 */}
      <section className="row g-3 mb-4">
        {(stats.length ? stats : Array.from({ length: 4 }, () => null)).map((s, i) => (
          <div className="col-6 col-xl-3" key={s?.label ?? i}>
            <article className="card h-100 border-0 shadow-sm rounded-4">
              <div className="card-body p-3 p-md-4">
                {s ? (
                  <>
                    <p className="text-secondary small mb-2">{s.label}</p>
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
            <div className="card-body p-0">
              <div className={styles.mapWrap}>
                {data ? (
                  <SeoulMap data={data} selectedCode={selectedCode} onSelect={setSelectedCode} />
                ) : (
                  <div className="d-flex h-100 align-items-center justify-content-center text-secondary">
                    <div className="spinner-border spinner-border-sm me-2" role="status" />
                    지도 불러오는 중…
                  </div>
                )}

                {/* 범례 */}
                <div className={styles.legend}>
                  <strong className="d-block small mb-2">면적 (km²)</strong>
                  {AREA_STEPS.map((s, i) => (
                    <div key={s.min} className="d-flex align-items-center gap-2 small">
                      <span className={styles.swatch} style={{ background: s.color }} />
                      {i === AREA_STEPS.length - 1
                        ? `${s.min} 이상`
                        : `${s.min} – ${AREA_STEPS[i + 1].min}`}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
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
                    지도에서 구를 클릭하거나 아래 목록에서 선택하세요.
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

                  <dl className="row small mb-3">
                    <dt className="col-5 text-secondary fw-normal">면적</dt>
                    <dd className="col-7 fw-semibold">{shownDetail.areaKm2} km²</dd>
                    <dt className="col-5 text-secondary fw-normal">둘레</dt>
                    <dd className="col-7 fw-semibold">{shownDetail.perimeterKm} km</dd>
                    <dt className="col-5 text-secondary fw-normal">서울 면적 대비</dt>
                    <dd className="col-7 fw-semibold">
                      {summary
                        ? `${((shownDetail.areaKm2 / summary.totalAreaKm2) * 100).toFixed(1)}%`
                        : "-"}
                    </dd>
                    <dt className="col-5 text-secondary fw-normal">대표 좌표</dt>
                    <dd className="col-7 fw-semibold mb-0">
                      {shownDetail.center[1].toFixed(4)}, {shownDetail.center[0].toFixed(4)}
                    </dd>
                  </dl>

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

          {/* 면적 순위 */}
          <article className="card border-0 shadow-sm rounded-4 flex-grow-1">
            <div className="card-body p-4">
              <h2 className="h5 fw-bold mb-3">면적 순위</h2>
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
                          <span className="text-secondary">{d.areaKm2}</span>
                        </span>
                        <span className={styles.rankTrack}>
                          <span
                            className={styles.rankBar}
                            style={{ width: `${(d.areaKm2 / maxArea) * 100}%` }}
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
