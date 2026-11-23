
import styles from "../app/page.module.css";

const menuItems = [
  { icon: "▦", label: "대시보드", href: "/", active: true },
  { icon: "▤", label: "프로젝트", href: "/projects", active: false },
  { icon: "♙", label: "사용자 관리", href: "/users", active: false },
  { icon: "▧", label: "통계 분석", href: "/statistics", active: false },
  { icon: "⚙", label: "설정", href: "/settings", active: false },
];

export default function Sidebar() {
  return (
    <aside
      className={`col-12 col-lg-2 d-flex flex-column p-4 ${styles.sidebar}`}
    >
      <h2 className={`fw-bold mb-5 ${styles.logo}`}>
        NEXT<span>.</span>
      </h2>

      <p className={`small fw-semibold mb-3 ${styles.menuTitle}`}>
        WORKSPACE
      </p>

      <nav className="nav flex-column gap-2">
        {menuItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className={`nav-link d-flex align-items-center gap-3 rounded-3 ${
              item.active ? styles.active : styles.menuLink
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      <div className="d-flex align-items-center gap-3 mt-auto pt-5">
        <div
          className={`rounded-circle d-flex align-items-center justify-content-center fw-bold ${styles.avatar}`}
        >
          GY
        </div>

        <div>
          <strong className="d-block">관리자</strong>
          <small className="text-secondary">연습용 계정</small>
        </div>
      </div>
    </aside>
  );
}
