import type { Metadata } from "next";
import PageHeader from "../../components/pageHeader";
import DistrictExplorer from "../../components/map/districtExplorer";

export const metadata: Metadata = { title: "지도 분석" };

export default function MapPage() {
  return (
    <>
      <PageHeader
        title="서울시 자치구 지도"
        breadcrumb="Workspace / Map"
        badgeText="PostGIS · MapLibre"
      />
      <DistrictExplorer />
    </>
  );
}
