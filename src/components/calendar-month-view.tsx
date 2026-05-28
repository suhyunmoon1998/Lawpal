"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { CalendarPageEvent } from "@/services/calendar.service";

type CalendarEventWithDate = CalendarPageEvent & {
  startsAtDate: Date;
  endsAtDate: Date;
};

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type CompactViewMode = "MONTH" | "AGENDA";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toneFromLabels(event: CalendarPageEvent) {
  const approval = event.approvalStatusLabel.toUpperCase();
  const status = event.statusLabel.toUpperCase();

  if (approval.includes("REJECTED") || approval.includes("CORRECTION")) {
    return "danger" as const;
  }

  if (approval.includes("APPROVED") || status.includes("SYNCED")) {
    return "success" as const;
  }

  return "warning" as const;
}

function formatMonthHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(date);
}

function formatEventTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function CalendarMonthView({ events }: { events: CalendarPageEvent[] }) {
  const hydratedEvents = useMemo<CalendarEventWithDate[]>(
    () =>
      events.map((event) => ({
        ...event,
        startsAtDate: new Date(event.startsAt),
        endsAtDate: new Date(event.endsAt)
      })),
    [events]
  );

  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [notificationState, setNotificationState] = useState<"unsupported" | "default" | "granted" | "denied">(
    "unsupported"
  );
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [compactViewMode, setCompactViewMode] = useState<CompactViewMode>("AGENDA");

  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }

    setNotificationState(Notification.permission);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");

    function syncLayout() {
      setIsCompactLayout(mediaQuery.matches);
    }

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const upcomingAlerts = useMemo(() => {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    return hydratedEvents.filter((event) => event.startsAtDate >= now && event.startsAtDate <= threeDaysFromNow).slice(0, 5);
  }, [hydratedEvents]);

  useEffect(() => {
    if (notificationState !== "granted") {
      return;
    }

    const notifiedKey = "lawpel:calendar-notified-events";
    const alreadyNotified = new Set<string>(JSON.parse(window.localStorage.getItem(notifiedKey) ?? "[]") as string[]);
    const nextNotified = new Set(alreadyNotified);

    for (const event of upcomingAlerts) {
      if (alreadyNotified.has(event.id)) {
        continue;
      }

      new Notification("Upcoming legal calendar item", {
        body: `${event.title} · ${event.matterName} · ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        }).format(event.startsAtDate)}`
      });

      nextNotified.add(event.id);
    }

    window.localStorage.setItem(notifiedKey, JSON.stringify(Array.from(nextNotified)));
  }, [notificationState, upcomingAlerts]);

  async function enableAlerts() {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationState(permission);
  }

  const monthGrid = useMemo(() => {
    const monthStart = startOfMonth(visibleMonth);
    const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    const gridStart = new Date(monthStart);
    gridStart.setDate(monthStart.getDate() - monthStart.getDay());
    const gridDays: Date[] = [];

    for (let index = 0; index < 42; index += 1) {
      const nextDay = new Date(gridStart);
      nextDay.setDate(gridStart.getDate() + index);
      gridDays.push(nextDay);
    }

    return {
      monthStart,
      monthEnd,
      gridDays
    };
  }, [visibleMonth]);

  const visibleMonthEvents = useMemo(
    () =>
      hydratedEvents.filter(
        (event) =>
          event.startsAtDate.getFullYear() === visibleMonth.getFullYear() &&
          event.startsAtDate.getMonth() === visibleMonth.getMonth()
      ),
    [hydratedEvents, visibleMonth]
  );

  const todayEvents = useMemo(() => hydratedEvents.filter((event) => sameDay(event.startsAtDate, new Date())), [hydratedEvents]);

  const agendaEvents = useMemo(
    () =>
      visibleMonthEvents.slice().sort((left, right) => left.startsAtDate.getTime() - right.startsAtDate.getTime()),
    [visibleMonthEvents]
  );

  const maxVisibleDayEvents = isCompactLayout ? 1 : 2;

  return (
    <div className="stack calendar-surface">
      <section className="calendar-canvas-shell">
        <div className="calendar-canvas-topbar">
          <div>
            <div className="metric-kicker">Litigation Calendar Canvas</div>
            <h3 className="hero-title">One screen for deadlines, approvals, and upcoming motion pressure.</h3>
            <p className="hero-copy">
              Use the monthly board to see draft and approved legal dates at a glance, while the side rail keeps the
              next few days and notification posture visible without opening another panel.
            </p>
          </div>
          <div className="calendar-summary-strip">
            <article className="calendar-summary-card">
              <div className="metric-label">Upcoming Alerts</div>
              <div className="metric-value workspace-metric">{upcomingAlerts.length}</div>
              <p className="metric-note">Due within the next 3 days.</p>
            </article>
            <article className="calendar-summary-card">
              <div className="metric-label">This Month</div>
              <div className="metric-value workspace-metric">{visibleMonthEvents.length}</div>
              <p className="metric-note">Items on the active board.</p>
            </article>
            <article className="calendar-summary-card">
              <div className="metric-label">Today</div>
              <div className="metric-value workspace-metric">{todayEvents.length}</div>
              <p className="metric-note">Items landing today.</p>
            </article>
          </div>
        </div>

        <div className="calendar-board">
          <div className="calendar-board-main">
            <div className="calendar-toolbar">
            <div>
              <div className="metric-kicker">Monthly View</div>
              <h3>{formatMonthHeading(visibleMonth)}</h3>
              <p className="muted calendar-toolbar-copy">
                Draft dates stay clearly marked until attorney approval. Approved dates remain visible on the same board.
              </p>
            </div>
            <div className="button-row">
              <button
                className="button-secondary"
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}
              >
                Previous
              </button>
              <button className="button-secondary" type="button" onClick={() => setVisibleMonth(startOfMonth(new Date()))}>
                Today
              </button>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}
              >
                Next
              </button>
            </div>
          </div>
          {isCompactLayout ? (
            <div className="calendar-mobile-switcher">
              <button
                type="button"
                className={cn("saved-view-chip", compactViewMode === "AGENDA" && "active")}
                onClick={() => setCompactViewMode("AGENDA")}
              >
                Agenda
              </button>
              <button
                type="button"
                className={cn("saved-view-chip", compactViewMode === "MONTH" && "active")}
                onClick={() => setCompactViewMode("MONTH")}
              >
                Month
              </button>
            </div>
          ) : null}

          {(!isCompactLayout || compactViewMode === "MONTH") && (
            <>
              <div className="calendar-grid calendar-weekdays">
                {weekdayLabels.map((label) => (
                  <div key={label} className="calendar-weekday">
                    {label}
                  </div>
                ))}
              </div>

              <div className="calendar-grid calendar-grid-board">
                {monthGrid.gridDays.map((day) => {
                  const dayEvents = hydratedEvents.filter((event) => sameDay(event.startsAtDate, day));
                  const visibleDayEvents = dayEvents.slice(0, maxVisibleDayEvents);
                  const hiddenCount = Math.max(0, dayEvents.length - visibleDayEvents.length);
                  const inVisibleMonth = day.getMonth() === visibleMonth.getMonth();
                  const isToday = sameDay(day, new Date());

                  return (
                    <article
                      key={day.toISOString()}
                      className={`calendar-day${inVisibleMonth ? "" : " outside"}${isToday ? " today" : ""}`}
                    >
                      <div className="calendar-day-header">
                        <span>{day.getDate()}</span>
                        {dayEvents.length > 0 ? <span className="calendar-day-count">{dayEvents.length}</span> : null}
                      </div>
                      <div className="calendar-day-events">
                        {visibleDayEvents.map((event) => (
                          <div key={event.id} className={`calendar-event-pill ${toneFromLabels(event)}`}>
                            <strong>{formatEventTime(event.startsAtDate)}</strong>
                            <span>{event.title}</span>
                            <small>{event.matterName}</small>
                          </div>
                        ))}
                        {hiddenCount > 0 ? <div className="calendar-more-chip">+{hiddenCount} more</div> : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          {isCompactLayout && compactViewMode === "AGENDA" ? (
            <div className="calendar-agenda-list">
              {agendaEvents.map((event) => (
                <article key={event.id} className="calendar-agenda-card">
                  <div className="calendar-agenda-date">
                    <strong>
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric"
                      }).format(event.startsAtDate)}
                    </strong>
                    <span>{formatEventTime(event.startsAtDate)}</span>
                  </div>
                  <div className="calendar-agenda-copy">
                    <div className="table-primary">{event.title}</div>
                    <div className="table-secondary">{event.matterName}</div>
                    <div className="alert-card-meta">
                      <StatusBadge label={event.approvalStatusLabel} tone={toneFromLabels(event)} />
                      {event.warningLabel ? <span className="calendar-warning">{event.warningLabel}</span> : null}
                    </div>
                  </div>
                </article>
              ))}
              {agendaEvents.length === 0 ? <div className="muted">No items on the active month agenda.</div> : null}
            </div>
          ) : null}
          </div>

          <aside className="calendar-board-rail">
            <section className="calendar-widget calendar-widget-alerts">
              <div className="section-title-row">
                <div>
                  <div className="metric-kicker">Upcoming Dates</div>
                  <h3>Attorney Alert Feed</h3>
                </div>
              </div>
              <div className="alert-feed">
                {upcomingAlerts.map((event) => (
                  <article key={event.id} className="alert-card">
                    <div className="alert-card-date">
                      <strong>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(event.startsAtDate)}</strong>
                      <span>{formatEventTime(event.startsAtDate)}</span>
                    </div>
                    <div className="alert-card-copy">
                      <div className="table-primary">{event.title}</div>
                      <div className="table-secondary">{event.matterName}</div>
                      <div className="alert-card-meta">
                        <StatusBadge label={event.approvalStatusLabel} tone={toneFromLabels(event)} />
                        {event.warningLabel ? <span className="calendar-warning">{event.warningLabel}</span> : null}
                      </div>
                    </div>
                  </article>
                ))}
                {upcomingAlerts.length === 0 ? (
                  <div className="muted">No calendar alerts are due within the next 3 days.</div>
                ) : null}
              </div>
            </section>

            <section className="calendar-widget calendar-widget-notify">
              <div className="metric-kicker">Notifications</div>
              <h3>Desktop Alert Controls</h3>
              <div className="button-row" style={{ marginTop: 12 }}>
                <button
                  className={notificationState === "granted" ? "button-secondary" : "button"}
                  onClick={() => void enableAlerts()}
                  type="button"
                  disabled={notificationState === "granted" || notificationState === "denied"}
                >
                  {notificationState === "granted"
                    ? "Alerts Enabled"
                    : notificationState === "denied"
                      ? "Alerts Blocked"
                      : "Enable Alerts"}
                </button>
              </div>
              <p className="metric-note">
                Browser alerts notify this device when a near-term draft or approved legal date is approaching.
              </p>
            </section>

            <section className="calendar-widget calendar-widget-legend">
              <div className="metric-kicker">Status Key</div>
              <h3>Calendar Legend</h3>
              <div className="legend-stack">
                <div className="legend-row">
                  <StatusBadge label="Attorney Review Required" tone="warning" />
                  <span className="muted">Draft date kept internal until counsel approves it.</span>
                </div>
                <div className="legend-row">
                  <StatusBadge label="Attorney Approved / Synced" tone="success" />
                  <span className="muted">Ready for release internally or pushed outward after approval.</span>
                </div>
                <div className="legend-row">
                  <StatusBadge label="Rejected / Needs Correction" tone="danger" />
                  <span className="muted">The detected date needs rework before it can be relied on.</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
