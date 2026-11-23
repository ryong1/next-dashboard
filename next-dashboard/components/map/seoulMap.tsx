"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, Map as MlMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  AREA_STEPS,
  type DistrictCollection,
  type DistrictFeature,
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

// 면적 구간별 색: ["step", 면적, 색0, 경계1, 색1, ...]
const fillColor = [
  "step",
  ["get", "areaKm2"],
  AREA_STEPS[0].color,
  ...AREA_STEPS.slice(1).flatMap((s) => [s.min, s.color]),
] as ExpressionSpecification;

type Props = {
  data: DistrictCollection;
  selectedCode: string | null;
  onSelect: (code: string | null) => void;
};

export default function SeoulMap({ data, selectedCode, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // 지도 생성 (maplibre는 브라우저 전용이라 effect 안에서 동적 import)
  useEffect(() => {
    let cancelled = false;
    let map: MlMap | undefined;

    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      ml.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

      map = new ml.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        bounds: boundsOf(data.features),
        fitBoundsOptions: { padding: 24 },
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");

      const popup = new ml.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
      let hoveredId: number | null = null;

      map.on("load", () => {
        if (!map) return;
        map.addSource("districts", { type: "geojson", data });

        map.addLayer({
          id: "district-fill",
          type: "fill",
          source: "districts",
          paint: {
            "fill-color": fillColor,
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0.92,
              ["boolean", ["feature-state", "hover"], false], 0.85,
              0.68,
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
            "text-field": ["get", "name"],
            "text-font": ["Noto Sans Regular"],
            "text-size": 12,
          },
          paint: {
            "text-color": "#1f2a44",
            "text-halo-color": "rgba(255,255,255,0.9)",
            "text-halo-width": 1.5,
          },
        });

        setReady(true);
      });

      map.on("mousemove", "district-fill", (e) => {
        const f = e.features?.[0];
        if (!map || !f || typeof f.id !== "number") return;
        if (hoveredId !== null && hoveredId !== f.id) {
          map.setFeatureState({ source: "districts", id: hoveredId }, { hover: false });
        }
        hoveredId = f.id;
        map.setFeatureState({ source: "districts", id: hoveredId }, { hover: true });
        map.getCanvas().style.cursor = "pointer";

        // 이름은 textContent로 넣어 HTML 해석을 피함
        const box = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = String(f.properties.name);
        const area = document.createElement("div");
        area.className = "text-secondary small";
        area.textContent = `면적 ${f.properties.areaKm2} km²`;
        box.append(title, area);
        popup.setLngLat(e.lngLat).setDOMContent(box).addTo(map);
      });

      map.on("mouseleave", "district-fill", () => {
        if (!map) return;
        if (hoveredId !== null) {
          map.setFeatureState({ source: "districts", id: hoveredId }, { hover: false });
        }
        hoveredId = null;
        map.getCanvas().style.cursor = "";
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
      setReady(false);
    };
  }, [data]);

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
