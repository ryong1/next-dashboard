
import PageHeader from "../components/pageHeader";
import Content from "../test/testDashboard";

export default function Home() {
  return (
    <>
      <PageHeader title="대시보드" breadcrumb="Workspace / Overview" />
      <Content />
    </>
  );
}
