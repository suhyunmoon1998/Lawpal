import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getDocumentCompareData } from "@/services/documents.service";

export default async function DocumentComparePage({
  searchParams
}: {
  searchParams?: { documentId?: string };
}) {
  const session = await requireSession();
  const comparison = await getDocumentCompareData(session.lawFirmId, searchParams?.documentId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title={`Document Version Compare${comparison ? ` · ${comparison.documentName}` : ""}`}
          description="Attorneys can compare prior and current versions, inspect source emails and attachments, review the legal rule references used, and decide whether to approve or request correction."
        />
        <ReviewBanner />

        {!comparison ? (
          <section className="card">
            <h3>No Comparable Document Found</h3>
            <p className="muted">Generate a document draft first, then return here to compare versions and trace sources.</p>
          </section>
        ) : (
          <>
        <section className="grid cols-4">
          <article className="card">
            <div className="metric-label">Matter</div>
            <div className="metric-value" style={{ fontSize: "1.25rem" }}>{comparison.caseName}</div>
          </article>
          <article className="card">
            <div className="metric-label">Current Version</div>
            <div className="metric-value" style={{ fontSize: "1.25rem" }}>
              {comparison.currentVersion ? `v${comparison.currentVersion.versionNumber}` : "None"}
            </div>
          </article>
          <article className="card">
            <div className="metric-label">Previous Version</div>
            <div className="metric-value" style={{ fontSize: "1.25rem" }}>
              {comparison.previousVersion ? `v${comparison.previousVersion.versionNumber}` : "None"}
            </div>
          </article>
          <article className="card">
            <div className="metric-label">Legal Rules</div>
            <div className="metric-value" style={{ fontSize: "1rem" }}>
              {comparison.currentVersion?.legalRules.join(", ") || "No linked rules"}
            </div>
          </article>
        </section>

        <div className="split">
          <section className="card">
            <h3>Previous Version</h3>
            <p className="muted">
              {comparison.previousVersion
                ? `${comparison.documentName} · v${comparison.previousVersion.versionNumber} · ${comparison.previousVersion.status}`
                : "No previous version"}
            </p>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {comparison.previousVersion?.content ?? "No previous version is available yet."}
            </pre>
          </section>
          <section className="card">
            <h3>New Draft Version</h3>
            <p className="muted">
              {comparison.currentVersion
                ? `${comparison.documentName} · v${comparison.currentVersion.versionNumber} · ${comparison.currentVersion.status}`
                : "No current version"}
            </p>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>
              {comparison.currentVersion?.content ?? "No current version is available."}
            </pre>
          </section>
        </div>

        <section className="card">
          <h3>Line-by-Line Diff</h3>
          <div className="stack">
            {comparison.diffLines.map((line, index) => (
              <div
                key={`${line.type}-${index}`}
                style={{
                  whiteSpace: "pre-wrap",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background:
                    line.type === "added"
                      ? "#e6f4ea"
                      : line.type === "removed"
                        ? "#fbe7e7"
                        : "var(--surface-strong)",
                  color:
                    line.type === "added"
                      ? "#1f573b"
                      : line.type === "removed"
                        ? "#7d2323"
                        : "var(--ink)"
                }}
              >
                <strong>{line.type === "added" ? "+" : line.type === "removed" ? "-" : "="}</strong> {line.content || " "}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Source Traceability</h3>
          <p className="muted">
            Generated from {comparison.currentVersion?.generatedFromEmailIds.length ?? 0} emails and{" "}
            {comparison.currentVersion?.generatedFromAttachmentIds.length ?? 0} attachments.
          </p>
          <p className="muted">
            Change summary: {comparison.currentVersion?.changeSummary ?? "No change summary available."}
          </p>
        </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
