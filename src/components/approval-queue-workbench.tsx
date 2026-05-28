"use client";

import { useEffect, useMemo, useState } from "react";
import { ApprovalQueueTable } from "@/components/approval-queue-table";
import type { ApprovalQueueItem } from "@/services/approval-queue.service";

type SavedView = "ALL" | "DEADLINES" | "DOCUMENTS" | "CALENDAR" | "CORRECTIONS";
type KindFilter = "ALL" | ApprovalQueueItem["itemKind"];
type StatusFilter = "ALL" | ApprovalQueueItem["statusTone"];

type ApprovalWorkbenchPreferences = {
  savedView: SavedView;
  search: string;
  kindFilter: KindFilter;
  statusFilter: StatusFilter;
  matterFilter: string;
};

const approvalWorkbenchStorageKey = "lawpel:approval-queue-workbench";

const savedViewLabels: Record<SavedView, string> = {
  ALL: "All Review Items",
  DEADLINES: "Deadline Triage",
  DOCUMENTS: "Document Redlines",
  CALENDAR: "Calendar Releases",
  CORRECTIONS: "Needs Correction"
};

const defaultPreferences: ApprovalWorkbenchPreferences = {
  savedView: "ALL",
  search: "",
  kindFilter: "ALL",
  statusFilter: "ALL",
  matterFilter: "ALL"
};

function matchesSavedView(item: ApprovalQueueItem, savedView: SavedView) {
  if (savedView === "ALL") {
    return true;
  }

  if (savedView === "DEADLINES") {
    return item.itemKind === "Deadline";
  }

  if (savedView === "DOCUMENTS") {
    return item.itemKind === "Document";
  }

  if (savedView === "CALENDAR") {
    return item.itemKind === "Calendar";
  }

  return item.rawStatus.includes("NEEDS_CORRECTION") || item.rawStatus.includes("REJECTED");
}

export function ApprovalQueueWorkbench({ items }: { items: ApprovalQueueItem[] }) {
  const [savedView, setSavedView] = useState<SavedView>(defaultPreferences.savedView);
  const [search, setSearch] = useState(defaultPreferences.search);
  const [kindFilter, setKindFilter] = useState<KindFilter>(defaultPreferences.kindFilter);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(defaultPreferences.statusFilter);

  const matterOptions = useMemo(
    () => Array.from(new Set(items.map((item) => item.matterName))).sort((left, right) => left.localeCompare(right)),
    [items]
  );
  const [matterFilter, setMatterFilter] = useState<string>(defaultPreferences.matterFilter);

  useEffect(() => {
    const storedPreferences = window.localStorage.getItem(approvalWorkbenchStorageKey);

    if (!storedPreferences) {
      return;
    }

    try {
      const parsed = JSON.parse(storedPreferences) as Partial<ApprovalWorkbenchPreferences>;

      setSavedView(parsed.savedView ?? defaultPreferences.savedView);
      setSearch(parsed.search ?? defaultPreferences.search);
      setKindFilter(parsed.kindFilter ?? defaultPreferences.kindFilter);
      setStatusFilter(parsed.statusFilter ?? defaultPreferences.statusFilter);
      setMatterFilter(parsed.matterFilter ?? defaultPreferences.matterFilter);
    } catch {
      window.localStorage.removeItem(approvalWorkbenchStorageKey);
    }
  }, []);

  useEffect(() => {
    const nextPreferences: ApprovalWorkbenchPreferences = {
      savedView,
      search,
      kindFilter,
      statusFilter,
      matterFilter
    };

    window.localStorage.setItem(approvalWorkbenchStorageKey, JSON.stringify(nextPreferences));
  }, [kindFilter, matterFilter, savedView, search, statusFilter]);

  useEffect(() => {
    if (matterFilter !== "ALL" && !matterOptions.includes(matterFilter)) {
      setMatterFilter("ALL");
    }
  }, [matterFilter, matterOptions]);

  function resetFilters() {
    setSavedView(defaultPreferences.savedView);
    setSearch(defaultPreferences.search);
    setKindFilter(defaultPreferences.kindFilter);
    setStatusFilter(defaultPreferences.statusFilter);
    setMatterFilter(defaultPreferences.matterFilter);
  }

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return items.filter((item) => {
      if (!matchesSavedView(item, savedView)) {
        return false;
      }

      if (kindFilter !== "ALL" && item.itemKind !== kindFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && item.statusTone !== statusFilter) {
        return false;
      }

      if (matterFilter !== "ALL" && item.matterName !== matterFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [item.item, item.matterName, item.source, item.rule, item.statusLabel].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [items, kindFilter, matterFilter, savedView, search, statusFilter]);

  return (
    <section className="stack">
      <section className="card workbench-card">
        <div className="workbench-head">
          <div>
            <div className="metric-kicker">Queue Views</div>
            <h3>Attorney Triage Console</h3>
            <p className="muted">
              Narrow the queue by matter, item type, and review posture so the right attorney can move through urgent
              approvals first.
            </p>
          </div>
          <div className="workbench-count">
            <span>{filteredItems.length}</span>
            <small>visible items</small>
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
            <span className="toolbar-label">Search queue</span>
            <input
              className="field"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search matter, rule, source email, or item title"
            />
          </label>

          <label className="toolbar-field">
            <span className="toolbar-label">Item type</span>
            <select className="field" value={kindFilter} onChange={(event) => setKindFilter(event.target.value as typeof kindFilter)}>
              <option value="ALL">All item types</option>
              <option value="Deadline">Deadlines</option>
              <option value="Document">Documents</option>
              <option value="Calendar">Calendar events</option>
            </select>
          </label>

          <label className="toolbar-field">
            <span className="toolbar-label">Matter</span>
            <select className="field" value={matterFilter} onChange={(event) => setMatterFilter(event.target.value)}>
              <option value="ALL">All matters</option>
              {matterOptions.map((matterName) => (
                <option key={matterName} value={matterName}>
                  {matterName}
                </option>
              ))}
            </select>
          </label>

          <label className="toolbar-field">
            <span className="toolbar-label">Review posture</span>
            <select
              className="field"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            >
              <option value="ALL">All statuses</option>
              <option value="warning">Review required</option>
              <option value="danger">Corrections or rejected</option>
              <option value="success">Approved or lock-ready</option>
            </select>
          </label>
        </div>

        <div className="toolbar-footnote">
          Queue preferences stay on this browser so attorneys can return to the same triage view later.
        </div>
      </section>

      <ApprovalQueueTable items={filteredItems} />
    </section>
  );
}
