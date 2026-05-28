import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { getInboxReviewItems } from "@/services/inbox-review.service";

export default async function InboxReviewPage() {
  const session = await requireSession();
  const emails = await getInboxReviewItems(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Email Inbox Review"
          description="Incoming firm emails are classified, matched to case matters, and extracted into structured JSON only. Low-confidence matches stay manual."
        />
        <ReviewBanner />

        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Sender</th>
                <th>Case Match</th>
                <th>Confidence</th>
                <th>Detected Trigger</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email: Awaited<ReturnType<typeof getInboxReviewItems>>[number]) => (
                <tr key={email.id}>
                  <td>{email.subject}</td>
                  <td>{email.from}</td>
                  <td>{email.caseMatch}</td>
                  <td>{email.confidence}</td>
                  <td>{email.trigger}</td>
                  <td>
                    <StatusBadge label={email.statusLabel} tone={email.statusTone} />
                  </td>
                </tr>
              ))}
              {emails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    No imported emails yet. Run a Gmail import to populate the review inbox.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
