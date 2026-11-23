"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../app/page.module.css";

const menuItems = [
  { icon: "▦", label: "대시보드", href: "/" },
  { icon: "◎", label: "지도 분석", href: "/map" },
  { icon: "▤", label: "프로젝트", href: "/projects" },
  { icon: "♙", label: "사용자 관리", href: "/users" },
  { icon: "▧", label: "통계 분석", href: "/statistics" },
  { icon: "⚙", label: "설정", href: "/settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="nav flex-column gap-2">
      {menuItems.map((item) => {
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`nav-link d-flex align-items-center gap-3 rounded-3 ${
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
