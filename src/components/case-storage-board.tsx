"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type MatterStatus = "ACTIVE" | "PENDING" | "ARCHIVED" | "CLOSED";

type CaseListItem = {
  id: string;
  name: string;
  caseNumber: string;
  court: string;
  judge: string;
  department: string;
  status: MatterStatus;
  statusLabel: string;
  emailCount: number;
  deadlineCount: number;
  documentCount: number;
  warning: string;
};

function statusTone(status: MatterStatus) {
  if (status === "ARCHIVED" || status === "CLOSED") {
    return "danger" as const;
  }

  if (status === "PENDING") {
    return "warning" as const;
  }

  return "success" as const;
}

function availableStatusActions(status: MatterStatus) {
  if (status === "ACTIVE" || status === "PENDING") {
    return [
      { label: "Close Matter", nextStatus: "CLOSED" as const },
      { label: "Archive Matter", nextStatus: "ARCHIVED" as const }
    ];
  }

  if (status === "CLOSED") {
    return [
      { label: "Reopen", nextStatus: "ACTIVE" as const },
      { label: "Archive Matter", nextStatus: "ARCHIVED" as const }
    ];
  }

  return [{ label: "Reopen", nextStatus: "ACTIVE" as const }];
}

export function CaseStorageBoard({ cases }: { cases: CaseListItem[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  const filteredCases = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return cases.filter((caseItem) => {
      if (!normalizedSearch) {
        return true;
      }

      return [
        caseItem.name,
        caseItem.caseNumber,
        caseItem.court,
        caseItem.judge,
        caseItem.department
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [cases, search]);

  const activeCases = filteredCases.filter((caseItem) => caseItem.status === "ACTIVE" || caseItem.status === "PENDING");
  const storedCases = filteredCases.filter((caseItem) => caseItem.status === "CLOSED" || caseItem.status === "ARCHIVED");

  function updateCaseStatus(caseItem: CaseListItem, status: MatterStatus) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/cases/status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            caseMatterId: caseItem.id,
            status
          })
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Matter status could not be updated.");
        }

        setMessageById((current) => ({
          ...current,
          [caseItem.id]: `${caseItem.name} moved to ${status.toLowerCase()}.`
        }));
        router.refresh();
      } catch (error) {
        setMessageById((current) => ({
          ...current,
          [caseItem.id]: error instanceof Error ? error.message : "Matter status could not be updated."
        }));
      }
    });
  }

  function renderCard(caseItem: CaseListItem) {
    return (
      <article key={caseItem.id} className="card">
        <div className="section-title-row">
          <h3>{caseItem.name}</h3>
          <StatusBadge label={caseItem.statusLabel} tone={statusTone(caseItem.status)} />
        </div>
        <p className="muted">
          {caseItem.caseNumber} · {caseItem.court}
        </p>
        <p className="muted">
          {caseItem.judge} · {caseItem.department}
        </p>
        <p className="muted">
          {caseItem.emailCount} emails · {caseItem.deadlineCount} draft deadlines · {caseItem.documentCount} case
          documents
        </p>
        <p>{caseItem.warning}</p>
        <div className="button-row">
          <Link className="button" href={`/cases/${caseItem.id}`}>
            Open Workspace
          </Link>
          {availableStatusActions(caseItem.status).map((action) => (
            <button
              key={action.nextStatus}
              type="button"
              className="button-secondary"
              disabled={isPending}
              onClick={() => updateCaseStatus(caseItem, action.nextStatus)}
            >
              {action.label}
            </button>
          ))}
        </div>
        {messageById[caseItem.id] ? <div className="toolbar-footnote">{messageById[caseItem.id]}</div> : null}
      </article>
    );
  }

  return (
    <div className="stack">
      <section className="card workbench-card">
        <div className="workbench-head">
          <div>
            <div className="metric-kicker">Matter Storage</div>
            <h3>Active Matters and Closed-Case Vault</h3>
            <p className="muted">
              Keep live litigation matters in the active workspace and move finished matters into a separate stored
              section without losing source emails, deadlines, documents, or audit history.
            </p>
          </div>
          <div className="workbench-count">
            <span>{storedCases.length}</span>
            <small>stored matters</small>
          </div>
        </div>

        <div className="filter-toolbar">
          <label className="toolbar-field toolbar-search">
            <span className="toolbar-label">Search matters</span>
            <input
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search matter name, case number, court, or judge"
            />
          </label>
        </div>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <div>
            <div className="metric-kicker">Active Work</div>
            <h3>Current Matters</h3>
          </div>
          <span className="section-count">{activeCases.length}</span>
        </div>
        <section className="grid cols-3">
          {activeCases.map(renderCard)}
          {activeCases.length === 0 ? (
            <article className="card">
              <h3>No Active Matters</h3>
              <p className="muted">No active or pending matters match the current search.</p>
            </article>
          ) : null}
        </section>
      </section>

      <section className="stack">
        <div className="section-title-row">
          <div>
            <div className="metric-kicker">Stored Matters</div>
            <h3>Closed-Case Vault</h3>
          </div>
          <span className="section-count">{storedCases.length}</span>
        </div>
        <section className="grid cols-3">
          {storedCases.map(renderCard)}
          {storedCases.length === 0 ? (
            <article className="card">
              <h3>No Stored Matters</h3>
              <p className="muted">Closed and archived matters will appear here once they are moved out of the active list.</p>
            </article>
          ) : null}
        </section>
      </section>
    </div>
  );
}
