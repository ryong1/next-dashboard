"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../app/page.module.css";

const menuItems = [
  { icon: "◎", label: "지도 대시보드", href: "/" },
  { icon: "▤", label: "프로젝트", href: "/projects" },
  { icon: "▧", label: "통계 분석", href: "/statistics" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className={`nav flex-nowrap flex-lg-column gap-1 gap-lg-2 ${styles.nav}`}>
      {menuItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nav-link d-flex align-items-center gap-2 gap-lg-3 rounded-3 text-nowrap ${
              active ? styles.active : styles.menuLink
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
