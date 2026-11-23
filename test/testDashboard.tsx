import styles from "../app/page.module.css";

const stats = [
  { label: "전체 사용자", value: "1,284", change: "+12.5%" },
  { label: "오늘 방문자", value: "328", change: "+8.2%" },
  { label: "진행 중인 프로젝트", value: "12", change: "+2개" },
  { label: "완료율", value: "86.4%", change: "+5.4%" },
];

const monthlyData = [
  { month: "1월", height: 42 },
  { month: "2월", height: 65 },
  { month: "3월", height: 48 },
  { month: "4월", height: 78 },
  { month: "5월", height: 56 },
  { month: "6월", height: 88 },
  { month: "7월", height: 68 },
  { month: "8월", height: 96 },
  { month: "9월", height: 62 },
  { month: "10월", height: 80 },
  { month: "11월", height: 72 },
  { month: "12월", height: 100 },
];

const projects = [
  { name: "정책지도 서비스", status: "진행 중", percent: 72 },
  { name: "통계 대시보드", status: "완료", percent: 100 },
  { name: "데이터 API 연동", status: "진행 중", percent: 45 },
];

export default function Content() {
  return (
        <>
          <section
            className={`card border-0 rounded-4 mb-4 ${styles.welcome}`}
          >
            <div className="card-body p-4 p-md-5 d-flex align-items-center justify-content-between gap-3">
              <div>
                <p className="small fw-semibold mb-2">
                  MONDAY · YOUR WORKSPACE
                </p>

                <h2 className="h4 fw-bold mb-2">
                  오늘도 좋은 하루예요! 👋
                </h2>

                <p className="mb-0">
                  프로젝트 현황과 주요 지표를 확인해 보세요.
                </p>
              </div>
            </div>
          </section>

          {/* 통계 카드 */}
          <section className="row g-3 mb-4">
            {stats.map((stat) => (
              <div
                className="col-12 col-sm-6 col-xl-3"
                key={stat.label}
              >
                <article className="card h-100 border-0 shadow-sm rounded-4">
                  <div className="card-body p-4">
                    <p className="text-secondary small mb-3">
                      {stat.label}
                    </p>

                    <h2 className="h3 fw-bold mb-3">
                      {stat.value}
                    </h2>

                    <div className="d-flex align-items-center gap-2">
                      <span className="badge text-bg-success bg-opacity-10 text-success">
                        {stat.change}
                      </span>
                      <small className="text-secondary">
                        이전 대비
                      </small>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </section>

          {/* 차트 및 프로젝트 */}
          <section className="row g-4">

            {/* 서비스 현황 */}
            <div className="col-12 col-xl-7">
              <article className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                    <div>
                      <h2 className="h5 fw-bold mb-2">
                        서비스 현황
                      </h2>
                      <p className="text-secondary small mb-0">
                        최근 활동 요약
                      </p>
                    </div>

                    <span className="badge rounded-pill text-bg-success bg-opacity-10 text-success">
                      ● 정상 운영
                    </span>
                  </div>

                  <div
                    className={`d-flex align-items-end justify-content-between gap-2 ${styles.chart}`}
                  >
                    {monthlyData.map((item) => (
                      <div
                        key={item.month}
                        className="d-flex flex-column align-items-center justify-content-end flex-fill h-100"
                      >
                        <div className="d-flex align-items-end justify-content-center w-100 flex-grow-1">
                          <div
                            className={`w-100 rounded-top ${styles.bar}`}
                            style={{
                              height: `${item.height}%`,
                            }}
                            title={`${item.month}: ${item.height}%`}
                          />
                        </div>

                        <small className="text-secondary mt-2">
                          {item.month}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>

            {/* 최근 프로젝트 */}
            <div className="col-12 col-xl-5">
              <article className="card h-100 border-0 shadow-sm rounded-4">
                <div className="card-body p-4">
                  <div className="mb-4">
                    <h2 className="h5 fw-bold mb-2">
                      최근 프로젝트
                    </h2>
                    <p className="text-secondary small mb-0">
                      프로젝트 진행 상태
                    </p>
                  </div>

                  <div className="d-flex flex-column gap-4">
                    {projects.map((project) => (
                      <div key={project.name}>
                        <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
                          <strong className="small">
                            {project.name}
                          </strong>

                          <span
                            className={`badge ${
                              project.percent === 100
                                ? "text-bg-success"
                                : "text-bg-primary"
                            }`}
                          >
                            {project.status}
                          </span>
                        </div>

                        <div
                          className="progress mb-2"
                          role="progressbar"
                          aria-label={`${project.name} 진행률`}
                          aria-valuenow={project.percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          style={{ height: "8px" }}
                        >
                          <div
                            className={`progress-bar ${
                              project.percent === 100
                                ? "bg-success"
                                : ""
                            }`}
                            style={{ width: `${project.percent}%` }}
                          />
                        </div>

                        <div className="text-end">
                          <small className="text-secondary">
                            {project.percent}%
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </div>
            </section>
            </>        
        );
    }