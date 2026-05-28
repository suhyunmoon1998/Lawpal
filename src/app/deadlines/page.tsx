import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getDeadlineReviewItems } from "@/services/deadline-review.service";

export default async function DeadlinesPage() {
  const session = await requireSession();
  const deadlines = await getDeadlineReviewItems(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Deadline Review"
          description="Possible deadlines are created as DraftDeadlines only. Attorneys can inspect the source email, service method, applied rule, calculation explanation, and approval history before use."
        />
        <ReviewBanner />

        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Deadline</th>
                <th>Due Date</th>
                <th>Rule</th>
                <th>Source</th>
                <th>Service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((deadline: Awaited<ReturnType<typeof getDeadlineReviewItems>>[number]) => (
                <tr key={deadline.id}>
                  <td>{deadline.caseName}</td>
                  <td>{deadline.title}</td>
                  <td>{deadline.dueDate}</td>
                  <td>{deadline.rule}</td>
                  <td>{deadline.source}</td>
                  <td>{deadline.serviceMethod}</td>
                  <td>{deadline.status}</td>
                </tr>
              ))}
              {deadlines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">
                    No draft deadlines are waiting for attorney review right now.
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
