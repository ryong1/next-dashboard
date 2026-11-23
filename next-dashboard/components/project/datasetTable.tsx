"use client";

import { useEffect, useState } from "react";
import { getDistrictSummary, getSubwayLines, getSubwayStations, type DistrictSummary } from "../../common/district";

type Counts = {
  summary: DistrictSummary;
  lines: number;
  stations: number;
  transfers: number;
};

// 백엔드(gis-api)에 실제로 들어 있는 데이터 개수를 그대로 보여준다
export default function DatasetTable() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([getDistrictSummary(), getSubwayLines(), getSubwayStations()])
      .then(([summary, lines, stations]) =>
        setCounts({
          summary,
          lines: lines.features.length,
          stations: stations.features.length,
          transfers: stations.features.filter((f) => f.properties?.transfer).length,
        }),
      )
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <p className="small text-secondary mb-0">
        백엔드(gis-api)에 연결할 수 없어 데이터 개수를 불러오지 못했어요.
      </p>
    );
  }

  const t = counts?.summary.totals;
  const rows = [
    {
      name: "서울시 자치구 경계",
      count: counts ? `${counts.summary.count}개 구 · ${counts.summary.totalAreaKm2} km²` : null,
      source: "행정안전부 도로명주소 (southkorea/seoul-maps)",
      kind: "폴리곤",
    },
    {
      name: "지하철 노선",
      count: counts ? `${counts.lines}개 노선 (1~9호선)` : null,
      source: "OpenStreetMap",
      kind: "라인",
    },
    {
      name: "지하철역",
      count: counts ? `${counts.stations}곳 (환승역 ${counts.transfers}곳)` : null,
      source: "OpenStreetMap",
      kind: "포인트",
    },
    { name: "학교", count: t ? `${t.school.toLocaleString()}곳` : null, source: "OpenStreetMap", kind: "포인트" },
    { name: "병원", count: t ? `${t.hospital}곳` : null, source: "OpenStreetMap", kind: "포인트" },
    {
      name: "공원",
      count: t ? `${t.park.toLocaleString()}곳 · ${t.parkAreaKm2} km²` : null,
      source: "OpenStreetMap",
      kind: "폴리곤",
    },
  ];

  return (
    <div className="table-responsive">
      <table className="table align-middle mb-0">
        <thead>
          <tr className="small text-secondary">
            <th>데이터</th>
            <th>규모</th>
            <th>형태</th>
            <th>출처</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="fw-semibold">{r.name}</td>
              <td>
                {r.count ?? (
                  <span className="placeholder-glow">
                    <span className="placeholder col-8" />
                  </span>
                )}
              </td>
              <td>
                <span className="badge text-bg-light border">{r.kind}</span>
              </td>
              <td className="small text-secondary">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
