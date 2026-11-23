"use client";

import styles from "./explorer.module.css";
import LineBadge from "../lineBadge";
import { formatDistance, type RadiusResult } from "../../common/district";

type Props = {
  point: [number, number] | null;
  radius: number;
  result: RadiusResult | null;
  loading: boolean;
  error: boolean;
  onExit: () => void;
};

const NEAREST_LABEL: Record<string, string> = {
  station: "전철역",
  school: "학교",
  hospital: "병원",
  park: "공원",
};

/** 반경 분석 결과 패널 */
export default function RadiusPanel({ point, radius, result, loading, error, onExit }: Props) {
  return (
    <>
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
        <div>
          <p className={styles.eyebrow}>RADIUS ANALYSIS</p>
          <h2 className="h5 fw-bold mb-0">반경 {formatDistance(radius)} 분석</h2>
        </div>
        <button type="button" className="btn-close" aria-label="반경 분석 끄기" onClick={onExit} />
      </div>

      {!point && (
        <p className="small text-secondary mb-0">
          지도에서 분석할 지점을 클릭하세요. 그 지점에서 반경 {formatDistance(radius)} 안의 전철역·학교·병원·공원을
          PostGIS로 계산해 보여드려요.
        </p>
      )}

      {point && error && (
        <div className="alert alert-warning small mb-0">
          분석하지 못했어요. 서울 안의 지점인지, 백엔드가 켜져 있는지 확인해 주세요.
        </div>
      )}

      {point && !error && (loading || !result) && (
        <div className="placeholder-glow mt-2">
          <span className="placeholder col-6 mb-3" />
          <span className="placeholder col-12" />
          <span className="placeholder col-10" />
        </div>
      )}

      {point && !error && !loading && result && (
        <>
          <p className="small text-secondary mb-3">
            {result.district ? result.district.name : "서울 밖"} · {result.center[1].toFixed(4)},{" "}
            {result.center[0].toFixed(4)}
          </p>

          <div className={`mb-3 ${styles.tileGrid2}`}>
            <div className={styles.tile}>
              <span className="d-block small text-secondary">전철역</span>
              <strong className="d-block">{result.counts.station}곳</strong>
            </div>
            <div className={styles.tile}>
              <span className="d-flex align-items-center gap-1 small text-secondary">
                <span className={styles.dot} style={{ background: "#6f42c1" }} /> 학교
              </span>
              <strong className="d-block">{result.counts.school}곳</strong>
            </div>
            <div className={styles.tile}>
              <span className="d-flex align-items-center gap-1 small text-secondary">
                <span className={styles.dot} style={{ background: "#d63939" }} /> 병원
              </span>
              <strong className="d-block">{result.counts.hospital}곳</strong>
            </div>
            <div className={styles.tile}>
              <span className="d-block small text-secondary">공원 면적 비율</span>
              <strong className="d-block">{result.parkRatio}%</strong>
              <span className={styles.tileRank}>
                공원 {result.counts.park}곳 · {result.parkAreaKm2} km²
              </span>
            </div>
          </div>

          <p className="small text-secondary mb-2">반경 안 전철역</p>
          {result.stations.length === 0 ? (
            <p className="small mb-3">반경 안에 전철역이 없어요.</p>
          ) : (
            <ul className="list-unstyled mb-3">
              {result.stations.map((s) => (
                <li key={s.name} className={styles.hitRow}>
                  <span className="d-flex flex-wrap align-items-center gap-1">
                    {s.lines.map((l) => (
                      <LineBadge key={l} line={l} size="sm" />
                    ))}
                    <span className="ms-1">{s.name}</span>
                  </span>
                  <span className="text-secondary small">{formatDistance(s.distanceM)}</span>
                </li>
              ))}
            </ul>
          )}

          <p className="small text-secondary mb-2">종류별 가장 가까운 곳</p>
          <ul className="list-unstyled mb-0">
            {(["station", "school", "hospital", "park"] as const).map((k) => {
              const n = result.nearest[k];
              if (!n) return null;
              return (
                <li key={k} className={styles.hitRow}>
                  <span className="text-truncate">
                    <span className="text-secondary small me-2">{NEAREST_LABEL[k]}</span>
                    {n.name}
                  </span>
                  <span className="text-secondary small text-nowrap">
                    {n.distanceM === 0 && k === "park" ? "공원 안" : formatDistance(n.distanceM)}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className={styles.note}>
            원 면적 {result.circleAreaKm2} km² · 실제 거리(m) 기준 계산 (PostGIS ST_DWithin, 공원 면적은 원과 겹치는
            부분만 ST_Intersection). 다른 지점을 클릭하면 다시 분석해요.
          </p>
        </>
      )}
    </>
  );
}
