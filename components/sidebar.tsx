
import Link from "next/link";
import styles from "../app/page.module.css";
import SidebarNav from "./sidebarNav";

export default function Sidebar() {
  return (
    <aside
      className={`col-12 col-lg-2 d-flex flex-column p-4 ${styles.sidebar}`}
    >
      <Link href="/" className="text-decoration-none">
        <h2 className={`fw-bold mb-5 ${styles.logo}`}>
          NEXT<span>.</span>
        </h2>
      </Link>

      <p className={`small fw-semibold mb-3 ${styles.menuTitle}`}>
        WORKSPACE
      </p>

      <SidebarNav />

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
