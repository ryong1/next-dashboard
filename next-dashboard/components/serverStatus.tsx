"use client";

import { useEffect, useState } from "react";
import { checkHealth, type HealthState } from "../common/api";

const LABEL: Record<HealthState["state"], string> = {
  up: "API 연결됨",
  "db-down": "DB 연결 끊김",
  "server-down": "백엔드 꺼짐",
};

const COLOR: Record<HealthState["state"], string> = {
  up: "#2f9e44",
  "db-down": "#e8590c",
  "server-down": "#d63939",
};

/** 사이드바용 서버 상태 표시: 30초마다, 그리고 창에 다시 돌아올 때 확인 */
export default function ServerStatus() {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    let alive = true;
    const run = () => checkHealth().then((h) => alive && setHealth(h));
    run();
    const timer = setInterval(run, 30_000);
    window.addEventListener("focus", run);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", run);
    };
  }, []);

  const state = health?.state;
  const title = state === "up" && health?.info
    ? `PostGIS ${health.info.postgis} · 응답 ${health.ms}ms`
    : state
      ? LABEL[state]
      : "서버 상태 확인 중";

  return (
    <div className="d-flex align-items-center gap-2 small text-secondary" title={title} role="status">
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: state ? COLOR[state] : "#c4cad6",
          boxShadow: state === "up" ? "0 0 0 3px rgb(47 158 68 / 18%)" : undefined,
        }}
      />
      <span>{state ? LABEL[state] : "확인 중…"}</span>
      {state === "up" && health?.ms !== undefined && <span className="text-body-tertiary">{health.ms}ms</span>}
    </div>
  );
}
