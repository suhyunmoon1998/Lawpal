"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type WorkspaceData = {
  id: string;
  name: string;
  caseNumber: string;
  courtName: string;
  judgeName: string;
  department: string;
  workspaceFolders: Record<string, string>;
  livingDocuments: Array<{
    id: string;
    name: string;
    latestVersionNumber: number;
    currentStatus: string;
  }>;
  recentDeadlines: Array<{
    id: string;
    triggerType: string;
    dueDate: string;
    rule: string;
    status: string;
  }>;
  recentEmails: Array<{
    id: string;
    subject: string;
    fromAddress: string;
    receivedAt: string;
    attachmentCount: number;
    reviewStatus: string;
  }>;
};

type SavedView = "RECENT_ACTIVITY" | "DEADLINE_FOCUS" | "DOCUMENT_FOCUS" | "UNRESOLVED_REVIEW";
type Scope = "ALL" | "EMAILS" | "DEADLINES" | "DOCUMENTS";

type WorkspacePreferences = {
  savedView: SavedView;
  search: string;
  scope: Scope;
};

const savedViewLabels: Record<SavedView, string> = {
  RECENT_ACTIVITY: "Recent Activity",
  DEADLINE_FOCUS: "Deadline Focus",
  DOCUMENT_FOCUS: "Document Focus",
  UNRESOLVED_REVIEW: "Unresolved Review"
};

const defaultWorkspacePreferences: WorkspacePreferences = {
  savedView: "RECENT_ACTIVITY",
  search: "",
  scope: "ALL"
};

function normalize(value: string) {
  return value.toLowerCase();
}

function toneFromStatus(status: string) {
  const upper = status.toUpperCase();

  if (upper.includes("REJECTED") || upper.includes("CORRECTION")) {
    return "danger" as const;
  }

  if (upper.includes("APPROVED") || upper.includes("LOCKED")) {
    return "success" as const;
  }

  return "warning" as const;
}

export function CaseWorkspaceConsole({ workspace }: { workspace: WorkspaceData }) {
  const workspaceStorageKey = `lawpel:case-workspace-console:${workspace.id}`;
  const [savedView, setSavedView] = useState<SavedView>(defaultWorkspacePreferences.savedView);
  const [search, setSearch] = useState(defaultWorkspacePreferences.search);
  const [scope, setScope] = useState<Scope>(defaultWorkspacePreferences.scope);

  useEffect(() => {
    const storedPreferences = window.localStorage.getItem(workspaceStorageKey);

    if (!storedPreferences) {
      return;
    }

    try {
      const parsed = JSON.parse(storedPreferences) as Partial<WorkspacePreferences>;

      setSavedView(parsed.savedView ?? defaultWorkspacePreferences.savedView);
      setSearch(parsed.search ?? defaultWorkspacePreferences.search);
      setScope(parsed.scope ?? defaultWorkspacePreferences.scope);
    } catch {
      window.localStorage.removeItem(workspaceStorageKey);
    }
  }, [workspaceStorageKey]);

  useEffect(() => {
    const nextPreferences: WorkspacePreferences = {
      savedView,
      search,
      scope
    };

    window.localStorage.setItem(workspaceStorageKey, JSON.stringify(nextPreferences));
  }, [savedView, scope, search, workspaceStorageKey]);

  function resetFilters() {
    setSavedView(defaultWorkspacePreferences.savedView);
    setSearch(defaultWorkspacePreferences.search);
    setScope(defaultWorkspacePreferences.scope);
  }

  const normalizedSearch = search.trim().toLowerCase();

  const filteredDocuments = useMemo(() => {
    return workspace.livingDocuments.filter((document) => {
      if (scope !== "ALL" && scope !== "DOCUMENTS") {
        return false;
      }

      if (savedView === "DEADLINE_FOCUS") {
        return false;
      }

      if (savedView === "UNRESOLVED_REVIEW" && !normalize(document.currentStatus).includes("review")) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalize([document.name, document.currentStatus].join(" ")).includes(normalizedSearch);
    });
  }, [normalizedSearch, savedView, scope, workspace.livingDocuments]);

  const filteredDeadlines = useMemo(() => {
    return workspace.recentDeadlines.filter((deadline) => {
      if (scope !== "ALL" && scope !== "DEADLINES") {
        return false;
      }

      if (savedView === "DOCUMENT_FOCUS") {
        return false;
      }

      if (savedView === "UNRESOLVED_REVIEW" && normalize(deadline.status).includes("approved")) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalize([deadline.triggerType, deadline.rule, deadline.status, deadline.dueDate].join(" ")).includes(
        normalizedSearch
      );
    });
  }, [normalizedSearch, savedView, scope, workspace.recentDeadlines]);

  const filteredEmails = useMemo(() => {
    return workspace.recentEmails.filter((email) => {
      if (scope !== "ALL" && scope !== "EMAILS") {
        return false;
      }

      if (savedView === "DOCUMENT_FOCUS" || savedView === "DEADLINE_FOCUS") {
        return false;
      }

      if (savedView === "UNRESOLVED_REVIEW" && normalize(email.reviewStatus).includes("approved")) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalize([email.subject, email.fromAddress, email.reviewStatus, email.receivedAt].join(" ")).includes(
        normalizedSearch
      );
    });
  }, [normalizedSearch, savedView, scope, workspace.recentEmails]);

  return (
    <div className="stack">
      <section className="grid cols-4">
        <article className="card">
          <div className="metric-label">Case Number</div>
          <div className="metric-value workspace-metric">{workspace.caseNumber}</div>
        </article>
        <article className="card">
          <div className="metric-label">Court</div>
          <div className="metric-value workspace-metric workspace-metric-small">{workspace.courtName}</div>
        </article>
        <article className="card">
          <div className="metric-label">Judge</div>
          <div className="metric-value workspace-metric workspace-metric-small">{workspace.judgeName}</div>
        </article>
        <article className="card">
          <div className="metric-label">Department</div>
          <div className="metric-value workspace-metric workspace-metric-small">{workspace.department}</div>
        </article>
      </section>

      <section className="card workbench-card">
        <div className="workbench-head">
          <div>
            <div className="metric-kicker">Workspace Views</div>
            <h3>Matter Command Center</h3>
            <p className="muted">
              Search across the matter record and switch between activity, deadline, and drafting views without losing
              the approval-first workflow.
            </p>
          </div>
          <div className="workbench-count">
            <span>{filteredEmails.length + filteredDeadlines.length + filteredDocuments.length}</span>
            <small>visible records</small>
          </div>
        </div>

        <div className="saved-view-row">
          {(Object.keys(savedViewLabels) as SavedView[]).map((view) => (
            <button
              key={view}
              type="button"
              className={view === savedView ? "saved-view-chip active" : "saved-view-chip"}
              onClick={() => setSavedView(view)}
            >
              {savedViewLabels[view]}
            </button>
          ))}
          <button type="button" className="saved-view-chip utility" onClick={resetFilters}>
            Reset
          </button>
        </div>

        <div className="filter-toolbar">
          <label className="toolbar-field toolbar-search">
            <span className="toolbar-label">Search this matter</span>
            <input
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search email subject, deadline trigger, rule, or living document"
            />
          </label>

          <label className="toolbar-field">
            <span className="toolbar-label">Scope</span>
            <select className="field" value={scope} onChange={(event) => setScope(event.target.value as typeof scope)}>
              <option value="ALL">Everything in the workspace</option>
              <option value="EMAILS">Source emails</option>
              <option value="DEADLINES">Draft deadlines</option>
              <option value="DOCUMENTS">Living documents</option>
            </select>
          </label>
        </div>

        <div className="toolbar-footnote">
          This matter view is remembered per case, so attorneys can return to the exact same working slice later.
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="section-title-row">
            <h3>Living Documents</h3>
            <span className="section-count">{filteredDocuments.length}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Latest Version</th>
                <th>Current Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id}>
                  <td>{document.name}</td>
                  <td>{document.latestVersionNumber > 0 ? `v${document.latestVersionNumber}` : "No draft yet"}</td>
                  <td>
                    <StatusBadge label={document.currentStatus} tone={toneFromStatus(document.currentStatus)} />
                  </td>
                </tr>
              ))}
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    No living documents match the current workspace view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="section-title-row">
            <h3>Workspace Folders</h3>
            <span className="section-count">{Object.keys(workspace.workspaceFolders).length}</span>
          </div>
          <div className="stack">
            {Object.values(workspace.workspaceFolders).map((path) => (
              <div key={path} className="workspace-path">
                {path}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="split">
        <section className="card">
          <div className="section-title-row">
            <h3>Recent Source Emails</h3>
            <span className="section-count">{filteredEmails.length}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Sender</th>
                <th>Received</th>
                <th>Attachments</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((email) => (
                <tr key={email.id}>
                  <td>{email.subject}</td>
                  <td>{email.fromAddress}</td>
                  <td>{email.receivedAt}</td>
                  <td>{email.attachmentCount}</td>
                  <td>
                    <StatusBadge label={email.reviewStatus} tone={toneFromStatus(email.reviewStatus)} />
                  </td>
                </tr>
              ))}
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No source emails match the current workspace view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="card">
          <div className="section-title-row">
            <h3>Recent Draft Deadlines</h3>
            <span className="section-count">{filteredDeadlines.length}</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Trigger</th>
                <th>Due Date</th>
                <th>Rule</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeadlines.map((deadline) => (
                <tr key={deadline.id}>
                  <td>{deadline.triggerType}</td>
                  <td>{deadline.dueDate}</td>
                  <td>{deadline.rule}</td>
                  <td>
                    <StatusBadge label={deadline.status} tone={toneFromStatus(deadline.status)} />
                  </td>
                </tr>
              ))}
              {filteredDeadlines.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    No draft deadlines match the current workspace view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
