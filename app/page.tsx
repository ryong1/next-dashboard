
import styles from "./page.module.css";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/pageHeader";
import Content from "../test/testDashboard";



export default function Home() {
  return (
    <main className={`container-fluid p-0 ${styles.dashboard}`}>
      <div className="row g-0 min-vh-100">

       <Sidebar />

        {/* 메인 콘텐츠 */}
        <section className={`col-12 col-lg-10 p-3 p-md-4 p-xl-5 ${styles.main}`}>

          {/* 페이지 헤더 */}
         <PageHeader
            title="타이틀자리"
            breadcrumb="Workspace / Overview"
          />
          <Content />
  
        </section>
      </div>
    </main>
  );
}
