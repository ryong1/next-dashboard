import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "프로젝트" };

const projects = [
  { name: "정책지도 서비스", owner: "김지원", due: "2026-12-15", status: "진행 중", percent: 72 },
  { name: "통계 대시보드", owner: "이서준", due: "2026-11-10", status: "완료", percent: 100 },
  { name: "데이터 API 연동", owner: "박하은", due: "2027-01-20", status: "진행 중", percent: 45 },
  { name: "모바일 반응형 개선", owner: "최도윤", due: "2027-02-05", status: "대기", percent: 0 },
];

const statusBadge: Record<string, string> = {
  "진행 중": "text-bg-primary",
  완료: "text-bg-success",
  대기: "text-bg-secondary",
};

export default function ProjectsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="프로젝트" breadcrumb="Workspace / Projects" />

      <article className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-secondary">
                  <th>프로젝트명</th>
                  <th>담당자</th>
                  <th>마감일</th>
                  <th>상태</th>
                  <th style={{ minWidth: 160 }}>진행률</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.name}>
                    <td className="fw-semibold">{p.name}</td>
                    <td>{p.owner}</td>
                    <td className="text-secondary">{p.due}</td>
                    <td>
                      <span className={`badge ${statusBadge[p.status]}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="progress flex-grow-1"
                          role="progressbar"
                          aria-label={`${p.name} 진행률`}
                          aria-valuenow={p.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: "8px" }}
                        >
                          <div
                            className={`progress-bar ${p.percent === 100 ? "bg-success" : ""}`}
                            style={{ width: `${p.percent}%` }}
                          />
                        </div>
                        <small className="text-secondary">{p.percent}%</small>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </div>
  );
}
