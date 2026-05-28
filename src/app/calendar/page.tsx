import { AppShell } from "@/components/app-shell";
import { CalendarMonthView } from "@/components/calendar-month-view";
import { PageHeader } from "@/components/page-header";
import { ReviewBanner } from "@/components/review-banner";
import { DEADLINE_WARNING } from "@/lib/constants";
import { requireSession } from "@/lib/auth";
import { getCalendarPageData } from "@/services/calendar.service";

export default async function CalendarPage() {
  const session = await requireSession();
  const { events } = await getCalendarPageData(session.lawFirmId);

  return (
    <AppShell>
      <div className="stack">
        <PageHeader
          title="Calendar"
          description="Internal draft events may appear with warning labels. Only attorney-approved events can be pushed to Google Calendar."
        />
        <ReviewBanner message={DEADLINE_WARNING} />
        <CalendarMonthView events={events} />
      </div>
    </AppShell>
  );
}
