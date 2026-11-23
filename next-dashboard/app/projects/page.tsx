import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";
import DatasetTable from "../../components/project/datasetTable";
import { getProjectInfo, type Part } from "../../common/projectInfo";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "프로젝트" };

const PART_BADGE: Record<Part, string> = {
  프론트엔드: "text-bg-primary",
  백엔드: "text-bg-success",
  데이터: "text-bg-warning",
  문서: "text-bg-secondary",
  구조: "text-bg-dark",
};

export default async function ProjectsPage() {
  const info = await getProjectInfo();
  const commits = info?.commits ?? [];

  const summary = info
    ? [
        { label: "커밋", value: `${commits.length}개` },
        { label: "첫 커밋", value: commits.at(-1)?.date.slice(0, 10) ?? "-" },
        { label: "최근 업데이트", value: commits[0]?.date ?? "-" },
        { label: "관리 중인 파일", value: `${info.trackedFiles}개` },
      ]
    : [];

  return (
    <div className={styles.page}>
      <PageHeader
        title="서울시 자치구 지도 프로젝트"
        breadcrumb="Workspace / Projects"
        badgeText="Git 기록 기준"
      />

      {summary.length > 0 && (
        <section className="row g-3 mb-4">
          {summary.map((s) => (
            <div className="col-6 col-xl-3" key={s.label}>
              <article className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-3 p-md-4">
                  <p className="text-secondary small mb-2">{s.label}</p>
                  <h2 className="h5 fw-bold mb-0">{s.value}</h2>
                </div>
              </article>
            </div>
          ))}
        </section>
      )}

      {/* 구성 요소 */}
      {info && (
        <article className="card border-0 shadow-sm rounded-4 mb-4">
          <div className="card-body p-4">
            <h2 className="h5 fw-bold mb-3">구성 요소</h2>
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr className="small text-secondary">
                    <th>이름</th>
                    <th>역할</th>
                    <th>기술</th>
                    <th className="text-end">커밋</th>
                    <th className="text-nowrap">최근 작업</th>
                  </tr>
                </thead>
                <tbody>
                  {info.components.map((c) => (
                    <tr key={c.name}>
                      <td>
                        <span className="fw-semibold d-block">{c.name}</span>
                        <code className="small text-secondary">{c.folder}</code>
                      </td>
                      <td>{c.role}</td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          {c.stack.map((s) => (
                            <span key={s} className="badge text-bg-light border fw-normal">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="text-end">{c.commits}</td>
                      <td className="small text-secondary text-nowrap">{c.lastDate ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      )}

      {/* 데이터셋 (백엔드에서 실시간 조회) */}
      <article className="card border-0 shadow-sm rounded-4 mb-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-3">데이터셋</h2>
          <DatasetTable />
        </div>
      </article>

      {/* 작업 이력 */}
      <article className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-3">작업 이력</h2>
          {commits.length === 0 ? (
            <p className="small text-secondary mb-0">Git 기록을 읽을 수 없는 환경이에요.</p>
          ) : (
            <ol className="list-unstyled mb-0">
              {commits.map((c, i) => (
                <li
                  key={c.hash}
                  className={`d-flex flex-wrap align-items-start gap-2 gap-md-3 py-3 ${
                    i < commits.length - 1 ? "border-bottom" : ""
                  }`}
                >
                  <code className="small text-secondary pt-1">{c.hash}</code>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold">{c.message}</div>
                    <div className="d-flex flex-wrap align-items-center gap-1 mt-1">
                      {c.parts.map((p) => (
                        <span key={p} className={`badge ${PART_BADGE[p]}`}>
                          {p}
                        </span>
                      ))}
                      <small className="text-secondary ms-1">파일 {c.files}개</small>
                    </div>
                  </div>
                  <small className="text-secondary text-nowrap pt-1">{c.date}</small>
                </li>
              ))}
            </ol>
          )}
        </div>
      </article>
    </div>
  );
}
