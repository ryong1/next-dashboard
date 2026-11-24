// 전철 노선 정보 (gis-api/scripts/osm/convert.js의 LINES, OSM colour 태그와 같게 맞춤). 표시 순서대로.

export type SubwayLine = { ref: string; name: string; short: string; color: string };

export const SUBWAY_LINES: SubwayLine[] = [
  { ref: "1", name: "1호선", short: "1", color: "#004A85" },
  { ref: "2", name: "2호선", short: "2", color: "#00A23F" },
  { ref: "3", name: "3호선", short: "3", color: "#ED6C00" },
  { ref: "4", name: "4호선", short: "4", color: "#009BCE" },
  { ref: "5", name: "5호선", short: "5", color: "#794698" },
  { ref: "6", name: "6호선", short: "6", color: "#7C4932" },
  { ref: "7", name: "7호선", short: "7", color: "#6E7E31" },
  { ref: "8", name: "8호선", short: "8", color: "#D11D70" },
  { ref: "9", name: "9호선", short: "9", color: "#A49D87" },
  { ref: "GJ", name: "경의중앙선", short: "경의중앙", color: "#6AC2B3" },
  { ref: "AR", name: "공항철도", short: "공항", color: "#0079AC" },
  { ref: "SB", name: "신분당선", short: "신분당", color: "#B81B30" },
  { ref: "SU", name: "수인분당선", short: "수인분당", color: "#ECA300" },
  { ref: "GC", name: "경춘선", short: "경춘", color: "#007A62" },
  { ref: "SH", name: "서해선", short: "서해", color: "#5EAC41" },
  { ref: "GA", name: "GTX-A", short: "GTX-A", color: "#AB087D" },
  { ref: "UI", name: "우이신설선", short: "우이신설", color: "#BACC50" },
  { ref: "SL", name: "신림선", short: "신림", color: "#6789CA" },
  { ref: "GG", name: "김포골드라인", short: "김포골드", color: "#957326" },
];

const LINE_BY_REF = new Map(SUBWAY_LINES.map((l) => [l.ref, l]));

export const lineOf = (ref: string): SubwayLine =>
  LINE_BY_REF.get(ref) ?? { ref, name: ref, short: ref, color: "#888888" };

/** "2·6호선", "2호선·경의중앙선·공항철도"처럼 사람이 읽는 노선 목록 */
export function lineNames(refs: string[]) {
  if (refs.length && refs.every((r) => /^[1-9]$/.test(r))) return `${refs.join("·")}호선`;
  return refs.map((r) => lineOf(r).name).join("·");
}
