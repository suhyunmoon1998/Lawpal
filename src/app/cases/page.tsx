import { AppShell } from "@/components/app-shell";
import { CaseStorageBoard } from "@/components/case-storage-board";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getCaseListItems } from "@/services/case-list.service";

export default async function CasesPage() {
  const session = await requireSession();
  const cases = await getCaseListItems(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Case List"
          description="Each matter gets a dedicated workspace with immutable source records, living draft documents, deadline history, and approval logs."
          actions={<button className="button">Create Case Folder</button>}
        />
        <ReviewBanner />
        <CaseStorageBoard cases={cases} />
      </div>
    </AppShell>
  );
}
