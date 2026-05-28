"use client";

import { useEffect, useState } from "react";
import { Moon, SunMedium } from "lucide-react";
import { EmailImportPanel } from "@/components/email-import-panel";
import { InfoHint } from "@/components/info-hint";
import { MetricCard } from "@/components/metric-card";
import { ReviewBanner } from "@/components/review-banner";

type DashboardSurfaceProps = {
  reviewQueue: {
    newEmailsNeedingCaseAssignment: number;
    detectedDeadlineTriggers: number;
    documentUpdatesNeedingApproval: number;
    calendarEventsNeedingApproval: number;
    uncertainLegalRuleMatches: number;
    emailsWithAttachments: number;
    followUpTasks: number;
    rejectedItemsNeedingCorrection: number;
  };
};

const STORAGE_KEY = "lawpel-dashboard-night-mode";

export function DashboardSurface({ reviewQueue }: DashboardSurfaceProps) {
  const [nightMode, setNightMode] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setNightMode(stored ? stored === "true" : true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(nightMode));
  }, [nightMode]);

  return (
    <div className={`stack dashboard-surface${nightMode ? " night" : ""}`}>
      <header className="dashboard-headline">
        <div className="dashboard-headline-copy">
          <span className="page-header-eyebrow">Daily Triage</span>
          <div className="dashboard-title-row">
            <h2>Today&apos;s Legal Review Queue</h2>
            <InfoHint label="Review incoming emails, deadline candidates, document changes, and calendar items before anything becomes attorney-approved." />
          </div>
        </div>

        <button
          type="button"
          className="dashboard-theme-toggle"
          onClick={() => setNightMode((value) => !value)}
          aria-pressed={nightMode}
          aria-label={nightMode ? "Switch to day mode" : "Switch to night mode"}
        >
          {nightMode ? <SunMedium size={16} /> : <Moon size={16} />}
          <span>{nightMode ? "Day mode" : "Night mode"}</span>
        </button>
      </header>

      <section className="hero-card dashboard-hero-card">
        <div className="hero-grid dashboard-hero-grid">
          <div>
            <div className="dashboard-title-row">
              <h3 className="hero-title">Attorney-first review flow.</h3>
              <InfoHint label="This board keeps draft deadlines, living document updates, and source email intake in one place so attorneys can review quickly." />
            </div>
            <div className="dashboard-hero-actions">
              <a className="button" href="/approvals">
                Open Approval Queue
              </a>
              <a className="button-secondary" href="/inbox-review">
                Review Source Emails
              </a>
            </div>
          </div>

          <div className="hero-panel dashboard-hero-panel">
            <div className="dashboard-mini-metric">
              <span>Unassigned intake</span>
              <strong>{reviewQueue.newEmailsNeedingCaseAssignment}</strong>
            </div>
            <div className="dashboard-mini-metric">
              <span>Draft deadlines</span>
              <strong>{reviewQueue.detectedDeadlineTriggers}</strong>
            </div>
            <div className="dashboard-mini-metric">
              <span>Doc revisions</span>
              <strong>{reviewQueue.documentUpdatesNeedingApproval}</strong>
            </div>
          </div>
        </div>
      </section>

      <ReviewBanner />
      <EmailImportPanel />

      <section className="grid cols-4">
        <MetricCard
          label="New Emails"
          value={reviewQueue.newEmailsNeedingCaseAssignment}
          note="Need case assignment or classification review."
          kicker="Intake"
          compact
        />
        <MetricCard
          label="Deadline Triggers"
          value={reviewQueue.detectedDeadlineTriggers}
          note="Possible deadlines awaiting attorney review."
          kicker="Deadlines"
          compact
        />
        <MetricCard
          label="Document Updates"
          value={reviewQueue.documentUpdatesNeedingApproval}
          note="Living case documents updated as draft versions."
          kicker="Documents"
          compact
        />
        <MetricCard
          label="Calendar Approvals"
          value={reviewQueue.calendarEventsNeedingApproval}
          note="Internal pending events not yet final."
          kicker="Calendar"
          compact
        />
      </section>

      <section className="grid cols-4">
        <MetricCard
          label="Uncertain Rule Matches"
          value={reviewQueue.uncertainLegalRuleMatches}
          note="Needs source verification by legal staff or attorney."
          kicker="Risk"
          compact
        />
        <MetricCard
          label="Emails With Attachments"
          value={reviewQueue.emailsWithAttachments}
          note="New source documents available for extraction."
          kicker="Evidence"
          compact
        />
        <MetricCard
          label="Follow-Up Tasks"
          value={reviewQueue.followUpTasks}
          note="Manual corrections, filing checks, and attorney tasks."
          kicker="Tasks"
          compact
        />
        <MetricCard
          label="Rejected Items"
          value={reviewQueue.rejectedItemsNeedingCorrection}
          note="Needs correction before returning to review."
          kicker="Exceptions"
          compact
        />
      </section>
    </div>
  );
}
