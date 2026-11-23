
import type { Metadata } from "next";
import "./globals.css";
import "bootstrap/dist/css/bootstrap.min.css";
import styles from "./page.module.css";
import Sidebar from "../components/sidebar";

export const metadata: Metadata = {
  title: {
    default: "서울시 자치구 지도 | test Dashboard",
    template: "%s | test Dashboard",
  },
  description: "서울시 자치구 경계와 시설 데이터를 PostGIS로 분석해 보여주는 지도 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <div className={styles.shell}>
          <Sidebar />

          {/* 메인 콘텐츠: 각 페이지가 여기에 렌더링됨 (여백은 페이지가 정함) */}
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
