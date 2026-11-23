
import type { Metadata } from "next";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./page.module.css";
import Sidebar from "../components/sidebar";

export const metadata: Metadata = {
  title: {
    default: "test Dashboard",
    template: "%s | test Dashboard",
  },
  description: "Next.js 대시보드 연습 프로젝트",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className={`container-fluid p-0 ${styles.dashboard}`}>
          <div className="row g-0 min-vh-100">
            <Sidebar />

            {/* 메인 콘텐츠: 각 페이지가 여기에 렌더링됨 */}
            <main
              className={`col-12 col-lg-10 p-3 p-md-4 p-xl-5 ${styles.main}`}
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
