export function PageHeader({
  title,
  description,
  actions,
  eyebrow = "Attorney Workspace"
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <span className="page-header-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions}
    </header>
  );
}
