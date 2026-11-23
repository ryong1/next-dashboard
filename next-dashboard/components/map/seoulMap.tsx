"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  POI_LAYERS,
  formatDistance,
  formatMetric,
  getPois,
  getSubwayLines,
  getSubwayStations,
  lineNames,
  type DistrictCollection,
  type DistrictFeature,
  type Metric,
  type PoiCategory,
  type RadiusResult,
} from "../../common/district";

// API 키가 필요 없는 무료 배경지도 (OpenFreeMap)
const BASE_STYLE = "https://tiles.openfreemap.org/styles/positron";

type Bounds = [[number, number], [number, number]];

/** 지도 가장자리 여백(px) */
export type MapPadding = { top: number; right: number; bottom: number; left: number };

const pad = (p: MapPadding, extra: number): MapPadding => ({
  top: p.top + extra,
  right: p.right + extra,
  bottom: p.bottom + extra,
  left: p.left + extra,
});

function boundsOf(features: DistrictFeature[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of features) {
    for (const polygon of f.geometry.coordinates) {
      for (const [x, y] of polygon[0]) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return [[minX, minY], [maxX, maxY]];
}

/** 범례와 지도가 같은 색을 쓰도록: 구간 i의 색 */
export function classColors(metric: Metric, breaks: number[]) {
  return [metric.colors[0], ...breaks.map((_, i) => metric.colors[i + 1])];
}

// ["step", 값, 색0, 경계1, 색1, ...]
function fillExpression(metric: Metric, breaks: number[]): ExpressionSpecification | string {
  const colors = classColors(metric, breaks);
  if (breaks.length === 0) return colors[0];
  return [
    "step",
    ["get", metric.key],
    colors[0],
    ...breaks.flatMap((b, i) => [b, colors[i + 1]]),
  ] as ExpressionSpecification;
}

// 구 이름 아래에 현재 지표 값 표시
function labelExpression(metric: Metric): ExpressionSpecification {
  return [
    "concat",
    ["get", "name"],
    "\n",
    ["to-string", ["get", metric.key]],
    metric.unit === "%" ? "%" : "",
  ];
}

const poiLayerId = (c: PoiCategory) => `poi-${c}`;

// 지하철은 여러 레이어(선 테두리, 노선, 역, 역 이름)로 그린다
const SUBWAY_LAYERS = ["subway-line-casing", "subway-line", "subway-station", "subway-label"];
const layersOf = (c: PoiCategory) => (c === "subway" ? SUBWAY_LAYERS : [poiLayerId(c)]);
// 마우스를 올렸을 때 정보를 보여줄 레이어
const HOVER_LAYERS = ["subway-station", "subway-line", ...POI_LAYERS.filter((p) => p.key !== "subway").map((p) => poiLayerId(p.key))];
const POI_LABEL = Object.fromEntries(POI_LAYERS.map((p) => [p.key, p.label]));

type Props = {
  data: DistrictCollection;
  metric: Metric;
  breaks: number[];
  visiblePois: PoiCategory[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  onPoiLoading?: (category: PoiCategory, loading: boolean) => void;
  /** 지도 위에 떠 있는 패널이 가리는 영역(px). 확대/이동 시 이 영역을 피해서 맞춘다 */
  padding?: MapPadding;
  /** select: 클릭하면 구 선택 / analyze: 클릭한 지점으로 반경 분석 */
  clickMode?: "select" | "analyze";
  onAnalyze?: (lng: number, lat: number) => void;
  /** 반경 분석 결과 (원, 중심점, 원 안 시설을 지도에 표시) */
  analysis?: RadiusResult | null;
};

const EMPTY_FC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };

/** 반경 r(m) 원을 다각형으로 (서울 위도에서는 이 근사로 충분) */
function circlePolygon([lng, lat]: [number, number], r: number, steps = 72): GeoJSON.Feature {
  const dx = r / (111320 * Math.cos((lat * Math.PI) / 180));
  const dy = r / 110540;
  const ring = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (i / steps) * 2 * Math.PI;
    return [lng + dx * Math.cos(a), lat + dy * Math.sin(a)];
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

const ANALYSIS_COLOR = { school: "#6f42c1", hospital: "#d63939", station: "#1f2a44" } as const;

const NO_PADDING: MapPadding = { top: 16, right: 16, bottom: 16, left: 16 };

export default function SeoulMap({
  data,
  metric,
  breaks,
  visiblePois,
  selectedCode,
  onSelect,
  onPoiLoading,
  padding = NO_PADDING,
  clickMode = "select",
  onAnalyze,
  analysis = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const metricRef = useRef(metric);
  const paddingRef = useRef(padding);
  const onSelectRef = useRef(onSelect);
  const onPoiLoadingRef = useRef(onPoiLoading);
  const clickModeRef = useRef(clickMode);
  const onAnalyzeRef = useRef(onAnalyze);
  const poiRequested = useRef(new Set<PoiCategory>());
  const [ready, setReady] = useState(false);
  const [loadedPois, setLoadedPois] = useState<PoiCategory[]>([]);

  useEffect(() => {
    metricRef.current = metric;
    paddingRef.current = padding;
    onSelectRef.current = onSelect;
    onPoiLoadingRef.current = onPoiLoading;
    clickModeRef.current = clickMode;
    onAnalyzeRef.current = onAnalyze;
  }, [metric, padding, onSelect, onPoiLoading, clickMode, onAnalyze]);

  // 지도 생성 (maplibre는 브라우저 전용이라 effect 안에서 동적 import)
  useEffect(() => {
    let cancelled = false;
    let map: MlMap | undefined;
    const requested = poiRequested.current;

    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      map = new ml.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        bounds: boundsOf(data.features),
        fitBoundsOptions: { padding: paddingRef.current },
        attributionControl: {
          compact: true,
          customAttribution: "시설 데이터 © OpenStreetMap contributors",
        },
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");

      const popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      let hoveredId: number | null = null;

      map.on("load", () => {
        if (!map) return;
        const m = metricRef.current;
        map.addSource("districts", { type: "geojson", data });

        map.addLayer({
          id: "district-fill",
          type: "fill",
          source: "districts",
          paint: {
            "fill-color": fillExpression(m, []),
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0.92,
              ["boolean", ["feature-state", "hover"], false], 0.85,
              0.7,
            ],
          },
        });

        map.addLayer({
          id: "district-line",
          type: "line",
          source: "districts",
          paint: { "line-color": "#ffffff", "line-width": 1.2 },
        });

        map.addLayer({
          id: "district-selected",
          type: "line",
          source: "districts",
          paint: {
            "line-color": "#1d2b64",
            "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 0],
          },
        });

        map.addLayer({
          id: "district-label",
          type: "symbol",
          source: "districts",
          layout: {
            "text-field": labelExpression(m),
            "text-font": ["Noto Sans Regular"],
            "text-size": 11.5,
            "text-line-height": 1.25,
          },
          paint: {
            "text-color": "#1f2a44",
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1.5,
          },
        });

        // 반경 분석 레이어 (맨 위). 데이터는 analysis가 바뀔 때 채운다
        map.addSource("analysis-circle", { type: "geojson", data: EMPTY_FC });
        map.addSource("analysis-places", { type: "geojson", data: EMPTY_FC });
        map.addSource("analysis-center", { type: "geojson", data: EMPTY_FC });
        map.addLayer({
          id: "analysis-circle-fill",
          type: "fill",
          source: "analysis-circle",
          paint: { "fill-color": "#425fbe", "fill-opacity": 0.1 },
        });
        map.addLayer({
          id: "analysis-circle-line",
          type: "line",
          source: "analysis-circle",
          paint: { "line-color": "#2b4396", "line-width": 2 },
        });
        map.addLayer({
          id: "analysis-places",
          type: "circle",
          source: "analysis-places",
          paint: {
            "circle-color": [
              "match", ["get", "category"],
              "school", ANALYSIS_COLOR.school,
              "hospital", ANALYSIS_COLOR.hospital,
              "#ffffff",
            ],
            "circle-radius": ["case", ["==", ["get", "category"], "station"], 6, 4.5],
            "circle-stroke-color": ["case", ["==", ["get", "category"], "station"], ANALYSIS_COLOR.station, "#ffffff"],
            "circle-stroke-width": ["case", ["==", ["get", "category"], "station"], 2.5, 1.5],
          },
        });
        map.addLayer({
          id: "analysis-center",
          type: "circle",
          source: "analysis-center",
          paint: {
            "circle-color": "#1d2b64",
            "circle-radius": 7,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 3,
          },
        });

        setReady(true);
      });

      // 마우스 아래 가장 위에 있는 대상(시설 > 구)의 정보를 팝업으로
      map.on("mousemove", (e) => {
        if (!map || !map.getLayer("district-fill")) return;
        const layers = [
          "analysis-places",
          ...HOVER_LAYERS.filter((id) => map!.getLayer(id)),
          "district-fill",
        ];
        const analyzing = clickModeRef.current === "analyze";
        const hits = map.queryRenderedFeatures(e.point, { layers });
        const district = hits.find((h) => h.layer.id === "district-fill");
        const newHover = district && typeof district.id === "number" ? district.id : null;

        if (hoveredId !== newHover) {
          if (hoveredId !== null) {
            map.setFeatureState({ source: "districts", id: hoveredId }, { hover: false });
          }
          if (newHover !== null) {
            map.setFeatureState({ source: "districts", id: newHover }, { hover: true });
          }
          hoveredId = newHover;
        }

        const top = hits[0];
        // 반경 분석 중에는 어디를 찍을지 보이도록 십자 커서
        map.getCanvas().style.cursor = analyzing ? "crosshair" : top ? "pointer" : "";
        if (!top) {
          popup.remove();
          return;
        }

        // 이름은 textContent로 넣어 HTML 해석을 피함
        const box = document.createElement("div");
        const title = document.createElement("strong");
        const sub = document.createElement("div");
        sub.className = "text-secondary small";
        if (top.layer.id === "district-fill") {
          const m = metricRef.current;
          title.textContent = String(top.properties.name);
          sub.textContent = `${m.label} ${formatMetric(m, Number(top.properties[m.key]))}`;
        } else if (top.layer.id === "subway-station") {
          title.textContent = `${top.properties.name}역`;
          // geojson 배열 속성은 문자열로 넘어오므로 다시 파싱
          const raw = top.properties.lines;
          const lines: string[] = Array.isArray(raw) ? raw : JSON.parse(String(raw ?? "[]"));
          sub.textContent = lines.length ? lineNames(lines) : "전철역";
        } else if (top.layer.id === "subway-line") {
          title.textContent = String(top.properties.name);
          sub.textContent = "전철 노선";
        } else if (top.layer.id === "analysis-places") {
          const label = { school: "학교", hospital: "병원", station: "전철역" }[String(top.properties.category)] ?? "";
          title.textContent = top.properties.name ? String(top.properties.name) : "(이름 없음)";
          sub.textContent = `${label} · 중심에서 ${formatDistance(Number(top.properties.distanceM))}`;
        } else {
          title.textContent = top.properties.name ? String(top.properties.name) : "(이름 없음)";
          sub.textContent = POI_LABEL[String(top.properties.category)] ?? "";
        }
        box.append(title, sub);
        popup.setLngLat(e.lngLat).setDOMContent(box).addTo(map);
      });

      map.on("mouseout", () => {
        if (!map) return;
        if (hoveredId !== null) {
          map.setFeatureState({ source: "districts", id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        popup.remove();
      });

      map.on("click", (e) => {
        if (!map) return;
        if (clickModeRef.current === "analyze") {
          onAnalyzeRef.current?.(e.lngLat.lng, e.lngLat.lat);
          return;
        }
        const f = map.queryRenderedFeatures(e.point, { layers: ["district-fill"] })[0];
        onSelectRef.current(f ? String(f.properties.code) : null);
      });
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      requested.clear();
      setReady(false);
      setLoadedPois([]);
    };
  }, [data]);

  // 지표가 바뀌면 색과 라벨만 교체
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    map.setPaintProperty("district-fill", "fill-color", fillExpression(metric, breaks));
    map.setLayoutProperty("district-label", "text-field", labelExpression(metric));
  }, [metric, breaks, ready]);

  // 시설 레이어: 처음 켤 때 API에서 받아 추가, 이후에는 표시/숨김만
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    for (const { key, color } of POI_LAYERS) {
      const visible = visiblePois.includes(key);
      const ids = layersOf(key);

      if (map.getLayer(ids[0])) {
        for (const id of ids) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        continue;
      }
      if (!visible || poiRequested.current.has(key)) continue;

      poiRequested.current.add(key);
      onPoiLoadingRef.current?.(key, true);
      const load = key === "subway" ? addSubwayLayers(map) : addPoiLayer(map, key, color);
      load
        .then((added) => added && setLoadedPois((prev) => [...prev, key]))
        .catch(() => poiRequested.current.delete(key))
        .finally(() => onPoiLoadingRef.current?.(key, false));
    }

    function addPoiLayer(map: MlMap, key: PoiCategory, color: string) {
      return getPois(key).then((geo) => {
        if (mapRef.current !== map) return false; // 그 사이 지도가 다시 만들어짐
        const id = poiLayerId(key);
        map.addSource(id, { type: "geojson", data: geo });
        if (key === "park") {
          map.addLayer(
            {
              id,
              type: "fill",
              source: id,
              paint: { "fill-color": color, "fill-opacity": 0.5, "fill-outline-color": "#1f7a35" },
            },
            "district-line",
          );
        } else {
          map.addLayer(
            {
              id,
              type: "circle",
              source: id,
              paint: {
                "circle-color": color,
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 14, 6],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": 1,
              },
            },
            "district-label",
          );
        }
        return true;
      });
    }

    // 노선도 스타일: 호선 색 선 + 흰 원 역 (환승역은 크고 진한 테두리)
    function addSubwayLayers(map: MlMap) {
      return Promise.all([getSubwayLines(), getSubwayStations()]).then(([lines, stations]) => {
        if (mapRef.current !== map) return false;
        map.addSource("subway-lines", { type: "geojson", data: lines });
        map.addSource("subway-stations", { type: "geojson", data: stations });

        const lineWidth: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 10, 2, 13, 3.5, 16, 6];
        map.addLayer(
          {
            id: "subway-line-casing",
            type: "line",
            source: "subway-lines",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: {
              "line-color": "#ffffff",
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3.5, 13, 5.5, 16, 9],
              "line-opacity": 0.9,
            },
          },
          "district-label",
        );
        map.addLayer(
          {
            id: "subway-line",
            type: "line",
            source: "subway-lines",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": ["get", "colour"], "line-width": lineWidth },
          },
          "district-label",
        );

        const transfer: ExpressionSpecification = ["boolean", ["get", "transfer"], false];
        map.addLayer({
          id: "subway-station",
          type: "circle",
          source: "subway-stations",
          minzoom: 11,
          paint: {
            "circle-color": "#ffffff",
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              11, ["case", transfer, 3.5, 2.5],
              15, ["case", transfer, 7.5, 5],
            ],
            "circle-stroke-color": ["case", transfer, "#1f2a44", ["get", "colour"]],
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 11, 1.5, 15, 2.5],
          },
        });
        map.addLayer({
          id: "subway-label",
          type: "symbol",
          source: "subway-stations",
          minzoom: 12.5,
          layout: {
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 12.5, 10.5, 16, 13],
            "text-offset": [0, 0.8],
            "text-anchor": "top",
            "text-padding": 3,
            "symbol-sort-key": ["case", transfer, 0, 1], // 겹치면 환승역 이름을 우선
          },
          paint: {
            "text-color": "#1f2a44",
            "text-halo-color": "rgba(255,255,255,0.95)",
            "text-halo-width": 1.5,
          },
        });
        return true;
      });
    }
  }, [visiblePois, ready, loadedPois]);

  // 반경 분석 결과 표시: 원 + 중심 + 원 안 시설, 그리고 원이 다 보이게 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const set = (id: string, d: GeoJSON.FeatureCollection) =>
      (map.getSource(id) as GeoJSONSource | undefined)?.setData(d);

    if (!analysis) {
      set("analysis-circle", EMPTY_FC);
      set("analysis-places", EMPTY_FC);
      set("analysis-center", EMPTY_FC);
      return;
    }

    const circle = circlePolygon(analysis.center, analysis.radius);
    set("analysis-circle", { type: "FeatureCollection", features: [circle] });
    set("analysis-center", {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: analysis.center } }],
    });
    const point = (lng: number, lat: number, props: Record<string, unknown>): GeoJSON.Feature => ({
      type: "Feature",
      properties: props,
      geometry: { type: "Point", coordinates: [lng, lat] },
    });
    set("analysis-places", {
      type: "FeatureCollection",
      features: [
        ...analysis.places.map((p) => point(p.lng, p.lat, { category: p.category, name: p.name, distanceM: p.distanceM })),
        ...analysis.stations.map((s) => point(s.lng, s.lat, { category: "station", name: `${s.name}역`, distanceM: s.distanceM })),
      ],
    });

    const ring = (circle.geometry as GeoJSON.Polygon).coordinates[0];
    const lngs = ring.map((c) => c[0]), lats = ring.map((c) => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: pad(padding, 24), duration: 700 },
    );
  }, [analysis, ready, padding]);

  // 선택된 구 강조 + 해당 구로 이동
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    if (selectedIdRef.current !== null) {
      map.setFeatureState({ source: "districts", id: selectedIdRef.current }, { selected: false });
    }

    const feature = data.features.find((f) => f.properties.code === selectedCode);
    selectedIdRef.current = feature ? feature.id : null;

    if (feature) {
      map.setFeatureState({ source: "districts", id: feature.id }, { selected: true });
      map.fitBounds(boundsOf([feature]), { padding: pad(padding, 48), maxZoom: 13, duration: 700 });
    } else {
      map.fitBounds(boundsOf(data.features), { padding, duration: 700 });
    }
  }, [selectedCode, ready, data, padding]);

  return <div ref={containerRef} className="w-100 h-100" />;
}
