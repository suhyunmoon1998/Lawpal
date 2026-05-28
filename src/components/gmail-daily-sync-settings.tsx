"use client";

import { useState, useTransition } from "react";

type GmailAccountSettings = {
  id: string;
  emailAddress: string;
  oauthStatus: string;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
  dailySyncEnabled: boolean;
  dailySyncHour: number;
  dailySyncMinute: number;
  timezone: string;
};

function buildTimeOptions() {
  const options = [];

  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of [0, 30]) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const label = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit"
      }).format(new Date(Date.UTC(2026, 0, 1, hour, minute)));

      options.push({ value, label });
    }
  }

  return options;
}

const timeOptions = buildTimeOptions();

export function GmailDailySyncSettings({
  accounts,
  canManage
}: {
  accounts: GmailAccountSettings[];
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [messageById, setMessageById] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<Record<string, { enabled: boolean; time: string }>>(() =>
    Object.fromEntries(
      accounts.map((account) => [
        account.id,
        {
          enabled: account.dailySyncEnabled,
          time: `${String(account.dailySyncHour).padStart(2, "0")}:${String(account.dailySyncMinute).padStart(2, "0")}`
        }
      ])
    )
  );

  function updateAccountState(accountId: string, nextState: Partial<{ enabled: boolean; time: string }>) {
    setFormState((current) => ({
      ...current,
      [accountId]: {
        ...current[accountId],
        ...nextState
      }
    }));
  }

  function saveAccount(accountId: string) {
    const accountState = formState[accountId];
    const [hour, minute] = accountState.time.split(":").map((value) => Number(value));

    startTransition(async () => {
      try {
        const response = await fetch("/api/integrations/gmail/daily-sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            connectedEmailAccountId: accountId,
            enabled: accountState.enabled,
            hour,
            minute
          })
        });

        const payload = (await response.json()) as { error?: string; scheduleLabel?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Daily Gmail sync settings could not be saved.");
        }

        setMessageById((current) => ({
          ...current,
          [accountId]: accountState.enabled
            ? `Daily sync saved. Automatic mailbox review will run at ${payload.scheduleLabel ?? accountState.time}.`
            : "Daily sync turned off for this Gmail account."
        }));
      } catch (error) {
        setMessageById((current) => ({
          ...current,
          [accountId]:
            error instanceof Error ? error.message : "Daily Gmail sync settings could not be saved."
        }));
      }
    });
  }

  if (accounts.length === 0) {
    return (
      <article className="card">
        <h3>Daily Gmail Sync</h3>
        <p className="muted">
          Connect a Gmail account first. After that, the system can check for new case-related email every day and
          create draft deadlines and document updates for attorney review.
        </p>
      </article>
    );
  }

  return (
    <section className="stack">
      {accounts.map((account) => {
        const accountState = formState[account.id];

        return (
          <article className="card" key={account.id}>
            <div className="section-title-row">
              <div>
                <h3>{account.emailAddress}</h3>
                <p className="muted">
                  Time zone: {account.timezone}. Last sync: {account.lastSyncedAt ?? "Not synced yet"}.
                </p>
              </div>
              <span className={`status-badge ${account.oauthStatus === "CONNECTED" ? "success" : "danger"}`}>
                {account.oauthStatus === "CONNECTED" ? "Connected" : account.oauthStatus}
              </span>
            </div>

            <div className="settings-form-grid">
              <label className="toolbar-field">
                <span className="toolbar-label">Daily sync</span>
                <select
                  className="field"
                  disabled={!canManage || account.oauthStatus !== "CONNECTED" || isPending}
                  value={accountState.enabled ? "ON" : "OFF"}
                  onChange={(event) =>
                    updateAccountState(account.id, {
                      enabled: event.target.value === "ON"
                    })
                  }
                >
                  <option value="OFF">Off</option>
                  <option value="ON">On</option>
                </select>
              </label>

              <label className="toolbar-field">
                <span className="toolbar-label">Run time</span>
                <select
                  className="field"
                  disabled={!canManage || account.oauthStatus !== "CONNECTED" || !accountState.enabled || isPending}
                  value={accountState.time}
                  onChange={(event) => updateAccountState(account.id, { time: event.target.value })}
                >
                  {timeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="toolbar-field">
                <span className="toolbar-label">Automation</span>
                <button
                  type="button"
                  className="button"
                  disabled={!canManage || account.oauthStatus !== "CONNECTED" || isPending}
                  onClick={() => saveAccount(account.id)}
                >
                  Save Daily Sync
                </button>
              </div>
            </div>

            <p className="toolbar-footnote">
              Automatic sync imports only new Gmail messages, matches them to matters, preserves source records, and
              creates draft deadlines and document updates that still require attorney approval.
            </p>

            {account.lastSyncError ? <p className="form-error">{account.lastSyncError}</p> : null}
            {messageById[account.id] ? <p className="form-success">{messageById[account.id]}</p> : null}
            {!canManage ? (
              <p className="muted">Only firm admins can change automated Gmail sync schedules.</p>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}
