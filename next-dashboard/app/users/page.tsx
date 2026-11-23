import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";

export const metadata: Metadata = { title: "사용자 관리" };

const users = [
  { name: "김지원", email: "jiwon@example.com", role: "관리자", active: true },
  { name: "이서준", email: "seojun@example.com", role: "편집자", active: true },
  { name: "박하은", email: "haeun@example.com", role: "편집자", active: false },
  { name: "최도윤", email: "doyun@example.com", role: "뷰어", active: true },
];

export default function UsersPage() {
  return (
    <>
      <PageHeader title="사용자 관리" breadcrumb="Workspace / Users" />

      <article className="card border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="small text-secondary">
                  <th>이름</th>
                  <th>이메일</th>
                  <th>권한</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td className="fw-semibold">{u.name}</td>
                    <td className="text-secondary">{u.email}</td>
                    <td>{u.role}</td>
                    <td>
                      <span
                        className={`badge ${u.active ? "text-bg-success" : "text-bg-secondary"}`}
                      >
                        {u.active ? "활성" : "비활성"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </>
  );
}
