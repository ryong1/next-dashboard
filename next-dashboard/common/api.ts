const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** API 오류 (HTTP 상태 코드 포함) */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    // 프론트 서버 자체에 닿지 못함 (네트워크 끊김 등)
    throw new ApiError(0, "서버에 연결할 수 없어요");
  }

  if (!response.ok) {
    throw new ApiError(response.status, `API 요청 실패: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ---------- 서버 상태 ----------

export type HealthInfo = {
  status: "UP" | "DOWN";
  database: "UP" | "DOWN";
  postgis?: string;
  districts?: number;
  startedAt?: string;
};

/**
 * up: 정상 / db-down: 백엔드는 켜져 있지만 DB 연결 실패 / server-down: 백엔드가 꺼져 있음
 * (백엔드가 꺼져 있으면 Next의 /api 프록시가 500을 돌려준다)
 */
export type HealthState = { state: "up" | "db-down" | "server-down"; info?: HealthInfo; ms?: number };

export async function checkHealth(): Promise<HealthState> {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { cache: "no-store" });
    const ms = Math.round(performance.now() - start);
    if (res.ok) return { state: "up", info: (await res.json()) as HealthInfo, ms };
    if (res.status === 503) return { state: "db-down", info: (await res.json()) as HealthInfo, ms };
    return { state: "server-down" };
  } catch {
    return { state: "server-down" };
  }
}
