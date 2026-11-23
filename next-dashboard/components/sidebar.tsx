
import Link from "next/link";
import styles from "../app/page.module.css";
import SidebarNav from "./sidebarNav";

export default function Sidebar() {
  return (
    <aside className={`d-flex flex-column ${styles.sidebar}`}>
      <Link href="/" className="text-decoration-none">
        <h2 className={`fw-bold mb-0 mb-lg-5 ${styles.logo}`}>
          NEXT<span>.</span>
        </h2>
      </Link>

      <p className={`small fw-semibold mb-3 d-none d-lg-block ${styles.menuTitle}`}>
        WORKSPACE
      </p>

      <SidebarNav />

      <div className="d-none d-lg-flex align-items-center gap-3 mt-auto pt-5">
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
