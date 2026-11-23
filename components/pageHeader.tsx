
type PageHeaderProps = {
  title: string;
  breadcrumb: string;
  badgeText?: string;
};

export default function PageHeader({
  title,
  breadcrumb = "Test",
  badgeText = "MY DASHBOARD",
}: PageHeaderProps) {
  return (
    <header className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
      <div>
        <p className="small mb-2 text-secondary">
          {breadcrumb}
        </p>

        <h1 className="h3 fw-bold mb-0">
          {title}
        </h1>
      </div>

      <span className="badge rounded-pill text-bg-light border px-3 py-2">
        {badgeText}
      </span>
    </header>
  );
}
