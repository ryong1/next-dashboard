import type { Metadata } from "next";
import PageHeader from "../../components/common/pageHeader";
import StatsDashboard from "../../components/stats/statsDashboard";
import styles from "../page.module.css";

export const metadata: Metadata = { title: "통계 분석" };

// 서울시 25개 구의 시설 밀도 비교 (gis-api 실데이터)
export default function StatisticsPage() {
  return (
    <div className={styles.page}>
      <PageHeader title="서울시 구별 통계" breadcrumb="Workspace / Statistics" badgeText="PostGIS · OSM 실데이터" />
      <StatsDashboard />
    </div>
  );
}
