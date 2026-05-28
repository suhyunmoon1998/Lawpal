"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { extractJobStatusLabel } from "@/services/queue-status";

type ImportJobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "paused"
  | "prioritized"
  | "waiting-children";

type JobSnapshot = {
  id: string | number | undefined;
  name: string;
  state: ImportJobState;
  progress: number | object;
  returnValue?: {
    connectedEmailAccountId: string;
    emailAddress: string;
    syncMode: "FULL_SYNC" | "INCREMENTAL_SYNC";
    previousCursor?: string | null;
    nextCursor?: string | null;
    importedCount: number;
    imported: Array<{
      providerMessageId: string;
      attachmentsImported: number;
      deadlinesCreated: number;
      documentVersionsCreated: number;
    }>;
  } | null;
  failedReason?: string | null;
  createdAt: number;
  processedAt?: number | null;
  finishedAt?: number | null;
};

const STORAGE_KEY = "lawpel:last-email-import-job-id";

function getNumericProgress(progress: JobSnapshot["progress"]) {
  return typeof progress === "number" ? progress : 0;
}

function isTerminalState(state: ImportJobState) {
  return state === "completed" || state === "failed";
}

export function EmailImportPanel() {
  const [isPending, startTransition] = useTransition();
  const [job, setJob] = useState<JobSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);

  useEffect(() => {
    const savedJobId = window.localStorage.getItem(STORAGE_KEY);
    if (savedJobId) {
      void refreshJob(savedJobId);
    }

    return () => {
      if (pollingRef.current) {
        window.clearTimeout(pollingRef.current);
      }
    };
  }, []);

  async function refreshJob(jobId: string) {
    try {
      const response = await fetch(`/api/emails/import/${jobId}`, {
        method: "GET",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Could not load email import job status.");
      }

      const payload = (await response.json()) as { job: JobSnapshot };
      setJob(payload.job);
      setError(null);

      if (!isTerminalState(payload.job.state)) {
        pollingRef.current = window.setTimeout(() => {
          void refreshJob(String(payload.job.id));
        }, 2000);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not refresh email import status.");
    }
  }

  async function startImport() {
    setError(null);

    try {
      const response = await fetch("/api/emails/import", {
        method: "POST",
        credentials: "include"
      });

      const payload = (await response.json()) as {
        error?: string;
        queued?: boolean;
        job?: JobSnapshot;
      };

      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "Unable to queue Gmail import.");
      }

      setJob(payload.job);
      window.localStorage.setItem(STORAGE_KEY, String(payload.job.id));
      void refreshJob(String(payload.job.id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to queue Gmail import.");
    }
  }

  function handleImportClick() {
    startTransition(() => {
      void startImport();
    });
  }

  const progress = job ? getNumericProgress(job.progress) : 0;
  const statusLabel = job ? extractJobStatusLabel(job.state) : "Idle";

  return (
    <section className="card">
      <div className="stack">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h3 style={{ marginBottom: 8 }}>Email Import Status</h3>
            <p className="muted" style={{ margin: 0 }}>
              Queue Gmail sync in the background, then track progress while deadline and document drafts are generated.
            </p>
          </div>
          <button className="button" onClick={handleImportClick} disabled={isPending || job?.state === "active"}>
            {isPending || job?.state === "active" ? "Import Running..." : "Import Recent Emails"}
          </button>
        </div>

        <div className="job-status-row">
          <div>
            <div className="metric-label">Status</div>
            <div className="metric-value" style={{ fontSize: "1.4rem" }}>
              {statusLabel}
            </div>
          </div>
          <div>
            <div className="metric-label">Progress</div>
            <div className="muted">{progress}%</div>
          </div>
          <div>
            <div className="metric-label">Job ID</div>
            <div className="muted">{job?.id ? String(job.id) : "No active job"}</div>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {job?.returnValue ? (
          <div className="stack">
            <div className="muted">
              {job.returnValue.syncMode === "INCREMENTAL_SYNC"
                ? "Incremental Gmail sync finished using the stored history cursor."
                : "Full Gmail sync finished because no cursor was available or Gmail required a reset."}
            </div>
            <div className="grid cols-4">
              <div className="card">
                <div className="metric-label">Imported Emails</div>
                <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                  {job.returnValue.importedCount}
                </div>
              </div>
              <div className="card">
                <div className="metric-label">Attachments</div>
                <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                  {job.returnValue.imported.reduce((sum, item) => sum + item.attachmentsImported, 0)}
                </div>
              </div>
              <div className="card">
                <div className="metric-label">Draft Deadlines</div>
                <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                  {job.returnValue.imported.reduce((sum, item) => sum + item.deadlinesCreated, 0)}
                </div>
              </div>
              <div className="card">
                <div className="metric-label">Document Versions</div>
                <div className="metric-value" style={{ fontSize: "1.5rem" }}>
                  {job.returnValue.imported.reduce((sum, item) => sum + item.documentVersionsCreated, 0)}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {error ? <div className="status-badge danger">{error}</div> : null}
        {job?.failedReason ? <div className="status-badge danger">{job.failedReason}</div> : null}
      </div>
    </section>
  );
}
