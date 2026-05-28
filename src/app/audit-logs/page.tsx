import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";

export default function AuditLogsPage() {
  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Audit Logs"
          description="Every read, write, approval, rejection, export, and calendar sync is captured with actor, timestamp, before/after values, source references, rule source, and approval status."
        />

        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Approval Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2026-05-19 09:21</td>
                <td>Alex Rivera</td>
                <td>DOCUMENT_VERSION_CREATED</td>
                <td>CaseDocumentVersion</td>
                <td>Attorney Review Required</td>
              </tr>
              <tr>
                <td>2026-05-19 09:43</td>
                <td>Maria Chen</td>
                <td>APPROVAL_ATTORNEY_APPROVED</td>
                <td>DraftDeadline</td>
                <td>Attorney Approved</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
