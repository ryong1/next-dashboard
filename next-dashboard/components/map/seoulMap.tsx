"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  POI_LAYERS,
  formatMetric,
  getPois,
  type DistrictCollection,
  type DistrictFeature,
  type Metric,
  type PoiCategory,
} from "../../common/district";

// API 키가 필요 없는 무료 배경지도 (OpenFreeMap)
const BASE_STYLE = "https://tiles.openfreemap.org/styles/positron";

type Bounds = [[number, number], [number, number]];

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
const POI_LABEL = Object.fromEntries(POI_LAYERS.map((p) => [p.key, p.label]));

type Props = {
  data: DistrictCollection;
  metric: Metric;
  breaks: number[];
  visiblePois: PoiCategory[];
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
  onPoiLoading?: (category: PoiCategory, loading: boolean) => void;
};

export default function SeoulMap({
  data,
  metric,
  breaks,
  visiblePois,
  selectedCode,
  onSelect,
  onPoiLoading,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const metricRef = useRef(metric);
  const onSelectRef = useRef(onSelect);
  const onPoiLoadingRef = useRef(onPoiLoading);
  const poiRequested = useRef(new Set<PoiCategory>());
  const [ready, setReady] = useState(false);
  const [loadedPois, setLoadedPois] = useState<PoiCategory[]>([]);

  useEffect(() => {
    metricRef.current = metric;
    onSelectRef.current = onSelect;
    onPoiLoadingRef.current = onPoiLoading;
  }, [metric, onSelect, onPoiLoading]);

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
        fitBoundsOptions: { padding: 24 },
        attributionControl: {
          compact: true,
          customAttribution: "시설 데이터 © OpenStreetMap contributors",
        },
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");

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

        setReady(true);
      });

      // 마우스 아래 가장 위에 있는 대상(시설 > 구)의 정보를 팝업으로
      map.on("mousemove", (e) => {
        if (!map || !map.getLayer("district-fill")) return;
        const layers = [
          ...POI_LAYERS.map((p) => poiLayerId(p.key)).filter((id) => map!.getLayer(id)),
          "district-fill",
        ];
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
        if (!top) {
          map.getCanvas().style.cursor = "";
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";

        // 이름은 textContent로 넣어 HTML 해석을 피함
        const box = document.createElement("div");
        const title = document.createElement("strong");
        const sub = document.createElement("div");
        sub.className = "text-secondary small";
        if (top.layer.id === "district-fill") {
          const m = metricRef.current;
          title.textContent = String(top.properties.name);
          sub.textContent = `${m.label} ${formatMetric(m, Number(top.properties[m.key]))}`;
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
      const id = poiLayerId(key);

      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
        continue;
      }
      if (!visible || poiRequested.current.has(key)) continue;

      poiRequested.current.add(key);
      onPoiLoadingRef.current?.(key, true);
      getPois(key)
        .then((geo) => {
          if (mapRef.current !== map) return; // 그 사이 지도가 다시 만들어짐
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
          setLoadedPois((prev) => [...prev, key]);
        })
        .catch(() => poiRequested.current.delete(key))
        .finally(() => onPoiLoadingRef.current?.(key, false));
    }
  }, [visiblePois, ready, loadedPois]);

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
      map.fitBounds(boundsOf([feature]), { padding: 80, maxZoom: 13, duration: 700 });
    } else {
      map.fitBounds(boundsOf(data.features), { padding: 24, duration: 700 });
    }
  }, [selectedCode, ready, data]);

  return <div ref={containerRef} className="w-100 h-100" />;
}
