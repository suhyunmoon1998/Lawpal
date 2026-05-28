import { AppShell } from "@/components/app-shell";
import { CaseWorkspaceConsole } from "@/components/case-workspace-console";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getCaseWorkspaceData } from "@/services/workspace.service";

export default async function CaseWorkspacePage({ params }: { params: { caseId: string } }) {
  const session = await requireSession();
  const workspace = await getCaseWorkspaceData(session.lawFirmId, params.caseId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title={`Case Workspace · ${workspace?.name ?? params.caseId}`}
          description="This workspace organizes emails, attachments, extracted facts, histories, draft deadlines, generated documents, versions, approvals, and the audit trail for a single matter."
        />
        <ReviewBanner />

        {!workspace ? (
          <section className="card">
            <h3>Matter Not Found</h3>
            <p className="muted">This case either does not exist or is not available to your law firm account.</p>
          </section>
        ) : (
          <CaseWorkspaceConsole workspace={workspace} />
        )}
      </div>
    </AppShell>
  );
}
