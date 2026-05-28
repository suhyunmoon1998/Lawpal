import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getDocumentListItems } from "@/services/documents.service";

export default async function DocumentsPage() {
  const session = await requireSession();
  const documents = await getDocumentListItems(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Case Documents"
          description="Every auto-maintained case document remains a draft until an attorney approves it. Versioning and source traceability are preserved for every update."
        />
        <ReviewBanner />

        <section className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Matter</th>
                <th>Latest Version</th>
                <th>Generated From</th>
                <th>Status</th>
                <th>Compare</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((document: Awaited<ReturnType<typeof getDocumentListItems>>[number]) => (
                <tr key={document.id}>
                  <td>{document.name}</td>
                  <td>{document.caseName}</td>
                  <td>{document.latestVersionNumber > 0 ? `v${document.latestVersionNumber}` : "No draft yet"}</td>
                  <td>{document.generatedFromSummary}</td>
                  <td>{document.status}</td>
                  <td>
                    <Link className="button-secondary" href={document.compareHref as Route}>
                      Compare
                    </Link>
                  </td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">No case documents have been generated yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
