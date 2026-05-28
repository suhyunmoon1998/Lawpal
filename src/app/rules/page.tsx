import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { StatusBadge } from "@/components/status-badge";
import { requireSession } from "@/lib/auth";
import { getLegalRulesOverview } from "@/services/legal-rules-overview.service";

export default async function RulesPage() {
  const session = await requireSession();
  const overview = await getLegalRulesOverview(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Legal Rules Library"
          description="Nationwide rule coverage is managed as a verified-source library. This screen shows what is already attorney-verified, what source packs are structurally prepared, and what remains planned before activation."
        />
        <ReviewBanner />

        <section className="grid cols-4">
          <article className="card metric-card">
            <span className="metric-kicker">Verified Rules</span>
            <div className="metric-value">{overview.summary.verifiedRuleCount}</div>
            <div className="metric-note">Attorney-verified rule records already available for deadline drafting.</div>
          </article>
          <article className="card metric-card">
            <span className="metric-kicker">Coverage Packs</span>
            <div className="metric-value">{overview.summary.totalCoveragePacks}</div>
            <div className="metric-note">Federal, state, local, and provider packs scaffolded for official-source import.</div>
          </article>
          <article className="card metric-card">
            <span className="metric-kicker">State Packs</span>
            <div className="metric-value">{overview.summary.statePacks}</div>
            <div className="metric-note">All 50 states are reserved in the registry, with California seeded first.</div>
          </article>
          <article className="card metric-card">
            <span className="metric-kicker">Planned Packs</span>
            <div className="metric-value">{overview.summary.plannedPacks}</div>
            <div className="metric-note">No pack becomes active until official-source import and attorney verification are complete.</div>
          </article>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div>
              <h3>Import Scaffold</h3>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                This app does not claim to know all U.S. law. It activates only official-source packs that are versioned and attorney-verified.
              </p>
            </div>
          </div>
          <div className="grid cols-4" style={{ marginTop: 18 }}>
            {overview.importScaffold.map((step) => (
              <article key={step.sequence} className="card">
                <div className="metric-kicker">Step {step.sequence}</div>
                <h4>{step.title}</h4>
                <p className="muted" style={{ margin: 0 }}>
                  {step.detail}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="split">
          <article className="card">
            <div className="section-title-row">
              <div>
                <h3>Federal and Local Coverage</h3>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Priority packs for federal practice, California state practice, and local courtroom rules.
                </p>
              </div>
            </div>
            <div className="stack" style={{ marginTop: 18 }}>
              {[...overview.groupedCoverage.federal, ...overview.groupedCoverage.local, ...overview.groupedCoverage.provider].map(
                (entry) => (
                  <article key={entry.slug} className="coverage-row">
                    <div>
                      <div className="table-primary">{entry.title}</div>
                      <div className="table-secondary">{entry.notes}</div>
                    </div>
                    <div className="coverage-row-meta">
                      <span className="workspace-path">{entry.jurisdictionLabel}</span>
                      <StatusBadge
                        label={overview.helpers.labelFromCoverageStatus(entry.status)}
                        tone={overview.helpers.toneFromCoverageStatus(entry.status)}
                      />
                    </div>
                  </article>
                )
              )}
            </div>
          </article>

          <article className="card">
            <div className="section-title-row">
              <div>
                <h3>All 50 State Packs</h3>
                <p className="muted" style={{ margin: "8px 0 0" }}>
                  Reserved for state-level statutes, court rules, and local practice imports from official sources.
                </p>
              </div>
            </div>
            <div className="coverage-chip-grid" style={{ marginTop: 18 }}>
              {overview.groupedCoverage.states.map((entry) => (
                <article key={entry.slug} className={`coverage-chip ${entry.status.toLowerCase()}`}>
                  <strong>{entry.jurisdictionLabel}</strong>
                  <span>{overview.helpers.labelFromCoverageStatus(entry.status)}</span>
                </article>
              ))}
            </div>
          </article>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div>
              <h3>Attorney-Verified Rule Records</h3>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                These are the actual rule records the MVP may use today for source-linked draft generation.
              </p>
            </div>
          </div>
          <table className="table" style={{ marginTop: 18 }}>
            <thead>
              <tr>
                <th>Jurisdiction</th>
                <th>Source</th>
                <th>Section</th>
                <th>Verification</th>
                <th>Calculation</th>
              </tr>
            </thead>
            <tbody>
              {overview.verifiedRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.jurisdiction}</td>
                  <td>{rule.sourceName}</td>
                  <td>{rule.ruleSection}</td>
                  <td>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(rule.lastVerifiedDate)}</td>
                  <td>{rule.calculationType.replaceAll("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
