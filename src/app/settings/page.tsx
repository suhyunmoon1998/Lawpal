import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { GmailDailySyncSettings } from "@/components/gmail-daily-sync-settings";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { requireSession } from "@/lib/auth";
import { getGmailAccountsForSettings } from "@/services/gmail-schedule.service";

export default async function SettingsPage() {
  const session = await requireSession();
  const gmailAccounts = await getGmailAccountsForSettings(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Settings / Integrations"
          description="Firm admins can connect Gmail, configure Google Calendar sync, manage roles, and control data handling with least-privilege OAuth scopes and immutable source retention."
        />
        <ReviewBanner />

        <section className="grid cols-3">
          <article className="card">
            <h3>Gmail</h3>
            <p className="muted">Readonly or modify scopes only for mailbox import and case review workflows.</p>
            <Link className="button" href="/api/integrations/gmail/connect">
              Connect Gmail
            </Link>
          </article>
          <article className="card">
            <h3>Google Calendar</h3>
            <p className="muted">Only approved deadlines can sync outward. Drafts remain internal by default.</p>
            <button className="button-secondary">Configure Sync</button>
          </article>
          <article className="card">
            <h3>Firm Controls</h3>
            <p className="muted">RBAC, audit retention, encrypted token storage, and review policy enforcement.</p>
            <button className="button-secondary">Manage Roles</button>
          </article>
        </section>

        <GmailDailySyncSettings accounts={gmailAccounts} canManage={session.role === "FIRM_ADMIN"} />
      </div>
    </AppShell>
  );
}
