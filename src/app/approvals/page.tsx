import { AppShell } from "@/components/app-shell";
import { ApprovalQueueWorkbench } from "@/components/approval-queue-workbench";
import { PageHeader } from "@/components/page-header";
import { PostApprovalActions } from "@/components/post-approval-actions";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getApprovalQueueItems } from "@/services/approval-queue.service";
import { getPostApprovalActionItems } from "@/services/post-approval-actions.service";

export default async function ApprovalsPage() {
  const session = await requireSession();
  const [items, postApprovalItems] = await Promise.all([
    getApprovalQueueItems(session.lawFirmId),
    getPostApprovalActionItems(session.lawFirmId)
  ]);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Attorney Approval Queue"
          description="Attorneys can review detected deadlines, document changes, and pending calendar events with source traceability before anything becomes final."
        />
        <ReviewBanner />
        <ApprovalQueueWorkbench items={items} />
        <PostApprovalActions items={postApprovalItems} />
      </div>
    </AppShell>
  );
}
