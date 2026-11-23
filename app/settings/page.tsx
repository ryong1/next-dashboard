import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";

export const metadata: Metadata = { title: "설정" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="설정" breadcrumb="Workspace / Settings" />

      <article className="card border-0 shadow-sm rounded-4" style={{ maxWidth: 640 }}>
        <div className="card-body p-4">
          <h2 className="h5 fw-bold mb-4">계정 정보</h2>

          {/* 아직 저장 기능은 없음: 화면 구성용 폼 */}
          <form className="d-flex flex-column gap-3">
            <div>
              <label htmlFor="name" className="form-label small fw-semibold">
                이름
              </label>
              <input id="name" className="form-control" defaultValue="관리자" />
            </div>

            <div>
              <label htmlFor="email" className="form-label small fw-semibold">
                이메일
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                defaultValue="admin@example.com"
              />
            </div>

            <div className="form-check form-switch">
              <input
                id="notify"
                type="checkbox"
                className="form-check-input"
                role="switch"
                defaultChecked
              />
              <label htmlFor="notify" className="form-check-label">
                이메일 알림 받기
              </label>
            </div>

            <div>
              <button type="button" className="btn btn-primary" disabled>
                저장 (준비 중)
              </button>
            </div>
          </form>
        </div>
      </article>
    </>
  );
}
