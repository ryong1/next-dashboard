"use client";

import { useEffect, useState } from "react";
import { ApiError, checkHealth, type HealthState } from "../../common/api/client";

type Props = {
  error: unknown;
  onRetry: () => void;
  /** 무엇을 불러오다 실패했는지 (예: "지도 데이터") */
  what?: string;
};

/** API 실패 시 원인(백엔드 꺼짐 / DB 문제 / 요청 오류)을 확인해서 맞는 안내와 다시 시도 버튼을 보여준다 */
export default function ServerErrorNotice({ error, onRetry, what = "데이터" }: Props) {
  const [health, setHealth] = useState<HealthState | null>(null);

  useEffect(() => {
    let ignore = false;
    checkHealth().then((h) => !ignore && setHealth(h));
    return () => {
      ignore = true;
    };
  }, [error]);

  const status = error instanceof ApiError ? error.status : undefined;

  let title = `${what}를 불러오지 못했어요`;
  let body: React.ReactNode = <span className="text-secondary">서버 상태를 확인하는 중…</span>;

  if (health?.state === "server-down") {
    title = "백엔드 서버(gis-api)가 꺼져 있어요";
    body = (
      <>
        <p className="mb-2">아래 명령으로 백엔드를 켠 뒤 다시 시도해 주세요.</p>
        <pre className="bg-white border rounded-3 p-2 small mb-0">
          <code>{`cd C:\\next-practice\\gis-api\njava -Xmx384m -jar build\\libs\\gis-api-0.0.1-SNAPSHOT.jar`}</code>
        </pre>
      </>
    );
  } else if (health?.state === "db-down") {
    title = "백엔드는 켜져 있지만 DB에 연결할 수 없어요";
    body = (
      <p className="mb-0">
        PostgreSQL 서비스(<code>postgresql-x64-16</code>)가 실행 중인지, <code>gis-api/local.properties</code>의
        비밀번호가 맞는지 확인해 주세요.
      </p>
    );
  } else if (health?.state === "up") {
    body = (
      <p className="mb-0">
        서버는 정상인데 이 요청만 실패했어요{status ? ` (응답 코드 ${status})` : ""}. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <div className="alert alert-warning rounded-4 border-0 shadow-sm" role="alert">
      <strong className="d-block mb-2">{title}</strong>
      <div className="small mb-3">{body}</div>
      <button type="button" className="btn btn-sm btn-dark rounded-pill px-3" onClick={onRetry}>
        다시 시도
      </button>
    </div>
  );
}
