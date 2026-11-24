"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * 화면이 처음 열릴 때 API를 불러오고, 실패하면 retry()로 다시 불러오는 공통 훅.
 * load는 컴포넌트 밖에 정의한 함수(또는 useCallback)처럼 참조가 바뀌지 않아야 한다.
 *
 * 사용: const { data, error, retry } = useApiData(loadStats);
 */
export function useApiData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false; // 화면을 떠난 뒤 늦게 온 응답은 무시
    load()
      .then((d) => !ignore && setData(d))
      .catch((e) => !ignore && setError(e));
    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  return { data, error, retry };
}
