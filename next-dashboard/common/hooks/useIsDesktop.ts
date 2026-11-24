"use client";

import { useSyncExternalStore } from "react";

// Bootstrap lg 기준(992px). 이 이상이면 지도 위에 패널이 떠 있는 레이아웃
const DESKTOP_QUERY = "(min-width: 992px)";

/** 화면 너비가 데스크톱인지 (서버 렌더링 때는 false) */
export function useIsDesktop() {
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
