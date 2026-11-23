import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";

export const metadata: Metadata = { title: "통계 분석" };

const summary = [
  { label: "월간 방문자", value: "9,842" },
  { label: "평균 체류 시간", value: "4분 12초" },
  { label: "이탈률", value: "32.1%" },
];

const channels = [
  { name: "검색", percent: 48 },
  { name: "직접 방문", percent: 27 },
  { name: "SNS", percent: 15 },
  { name: "기타", percent: 10 },
];

export default function StatisticsPage() {
  return (
    <>
      <PageHeader title="통계 분석" breadcrumb="Workspace / Statistics" />

      <section className="row g-3 mb-4">
        {summary.map((s) => (
          <div className="col-12 col-md-4" key={s.label}>
            <article className="card h-100 border-0 shadow-sm rounded-4">
              <div className="card-body p-4">
                <p className="text-secondary small mb-2">{s.label}</p>
                <h2 className="h3 fw-bold mb-0">{s.value}</h2>
              </div>
            </article>
          </div>
        ))}
      </section>

      <article className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-4">유입 경로</h2>
          <div className="d-flex flex-column gap-3">
            {channels.map((c) => (
              <div key={c.name}>
                <div className="d-flex justify-content-between small mb-1">
                  <span>{c.name}</span>
                  <span className="text-secondary">{c.percent}%</span>
                </div>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label={`${c.name} 비율`}
                  aria-valuenow={c.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ height: "8px" }}
                >
                  <div className="progress-bar" style={{ width: `${c.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
