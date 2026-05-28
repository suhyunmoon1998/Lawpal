"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import type { ApprovalQueueItem } from "@/services/approval-queue.service";

type Decision = ApprovalQueueItem["availableDecisions"][number];

const decisionLabels: Record<Decision, string> = {
  ATTORNEY_APPROVED: "Approve",
  REJECTED: "Reject",
  NEEDS_CORRECTION: "Needs Correction",
  LOCKED_FOR_COURT_USE: "Lock"
};

export function ApprovalQueueTable({ items }: { items: ApprovalQueueItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  function submitDecision(item: ApprovalQueueItem, decision: Decision) {
    startTransition(async () => {
      try {
        const response = await fetch("/api/approvals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            targetId: item.id,
            targetType: item.targetType,
            decision
          })
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Approval decision could not be saved.");
        }

        setMessageById((current) => ({
          ...current,
          [item.id]: `${decisionLabels[decision]} saved`
        }));
        router.refresh();
      } catch (error) {
        setMessageById((current) => ({
          ...current,
          [item.id]: error instanceof Error ? error.message : "Approval decision could not be saved."
        }));
      }
    });
  }

  return (
    <section className="card">
      <table className="table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Matter</th>
            <th>Source</th>
            <th>Rule</th>
            <th>Status</th>
            <th>Decision</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: ApprovalQueueItem) => (
            <tr key={item.id}>
              <td>
                <div className="table-primary">{item.item}</div>
                <div className="table-secondary">{item.itemKind}</div>
              </td>
              <td>{item.matterName}</td>
              <td>{item.source}</td>
              <td>{item.rule}</td>
              <td>
                <StatusBadge label={item.statusLabel} tone={item.statusTone} />
              </td>
              <td>
                <div className="button-row">
                  {item.availableDecisions.map((decision) => (
                    <button
                      key={decision}
                      className={decision === "ATTORNEY_APPROVED" || decision === "LOCKED_FOR_COURT_USE" ? "button" : "button-secondary"}
                      onClick={() => submitDecision(item, decision)}
                      disabled={isPending}
                      type="button"
                    >
                      {decisionLabels[decision]}
                    </button>
                  ))}
                </div>
                {messageById[item.id] ? <div className="muted" style={{ marginTop: 8 }}>{messageById[item.id]}</div> : null}
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="muted">
                No attorney-review items are currently queued.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}
