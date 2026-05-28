"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ActionItem =
  | {
      id: string;
      type: "CALENDAR_PUSH";
      title: string;
      matterName: string;
      statusLabel: string;
      actionLabel: string;
      calendarEventId: string;
    }
  | {
      id: string;
      type: "DOCUMENT_EXPORT";
      title: string;
      matterName: string;
      statusLabel: string;
      actionLabel: string;
      documentVersionId: string;
      exportFormats: Array<"docx" | "pdf">;
    };

export function PostApprovalActions({ items }: { items: ActionItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  async function pushCalendar(item: Extract<ActionItem, { type: "CALENDAR_PUSH" }>) {
    const response = await fetch("/api/calendar/push-approved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ calendarEventId: item.calendarEventId })
    });

    const payload = (await response.json()) as { error?: string; googleEventId?: string };
    if (!response.ok) {
      throw new Error(payload.error ?? "Calendar push failed.");
    }

    setMessageById((current) => ({
      ...current,
      [item.id]: payload.googleEventId ? `Synced to Google Calendar (${payload.googleEventId})` : "Calendar synced"
    }));
    router.refresh();
  }

  async function exportDocument(
    item: Extract<ActionItem, { type: "DOCUMENT_EXPORT" }>,
    format: "docx" | "pdf"
  ) {
    const response = await fetch("/api/documents/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        documentVersionId: item.documentVersionId,
        format
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Document export failed.");
    }

    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const fileNameMatch = disposition.match(/filename="([^"]+)"/);
    const fileName = fileNameMatch?.[1] ?? `${item.title}.${format}`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);

    setMessageById((current) => ({
      ...current,
      [item.id]: `${format.toUpperCase()} export started`
    }));
  }

  function handleCalendarPush(item: Extract<ActionItem, { type: "CALENDAR_PUSH" }>) {
    startTransition(() => {
      void pushCalendar(item).catch((error) => {
        setMessageById((current) => ({
          ...current,
          [item.id]: error instanceof Error ? error.message : "Calendar push failed."
        }));
      });
    });
  }

  function handleDocumentExport(
    item: Extract<ActionItem, { type: "DOCUMENT_EXPORT" }>,
    format: "docx" | "pdf"
  ) {
    startTransition(() => {
      void exportDocument(item, format).catch((error) => {
        setMessageById((current) => ({
          ...current,
          [item.id]: error instanceof Error ? error.message : "Document export failed."
        }));
      });
    });
  }

  return (
    <section className="card">
      <div className="stack">
        <div>
          <h3 style={{ marginBottom: 8 }}>Post-Approval Actions</h3>
          <p className="muted" style={{ margin: 0 }}>
            After attorney approval, push approved calendar items outward and export approved or locked document versions for attorney use.
          </p>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Approved Item</th>
              <th>Matter</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.title}</td>
                <td>{item.matterName}</td>
                <td>{item.statusLabel}</td>
                <td>
                  {item.type === "CALENDAR_PUSH" ? (
                    <div className="button-row">
                      <button className="button" disabled={isPending} onClick={() => handleCalendarPush(item)} type="button">
                        {item.actionLabel}
                      </button>
                    </div>
                  ) : (
                    <div className="button-row">
                      {item.exportFormats.map((format) => (
                        <button
                          key={format}
                          className={format === "pdf" ? "button" : "button-secondary"}
                          disabled={isPending}
                          onClick={() => handleDocumentExport(item, format)}
                          type="button"
                        >
                          Export {format.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                  {messageById[item.id] ? <div className="muted" style={{ marginTop: 8 }}>{messageById[item.id]}</div> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No post-approval actions are available yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
