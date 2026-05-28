import { prisma } from "@/lib/prisma";

export type CalendarPageEvent = {
  id: string;
  title: string;
  matterName: string;
  startsAt: string;
  endsAt: string;
  statusLabel: string;
  approvalStatusLabel: string;
  warningLabel: string | null;
  internalOnly: boolean;
};

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getCalendarPageData(lawFirmId: string) {
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 4, 0, 23, 59, 59, 999);

  const events = await prisma.calendarEvent.findMany({
    where: {
      lawFirmId,
      startsAt: {
        gte: rangeStart,
        lte: rangeEnd
      }
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      status: true,
      approvalStatus: true,
      warningLabel: true,
      internalOnly: true,
      caseMatter: {
        select: { name: true }
      }
    },
    orderBy: [{ startsAt: "asc" }]
  });

  return {
    events: events.map((event) => ({
      id: event.id,
      title: event.title,
      matterName: event.caseMatter?.name ?? "Unassigned matter",
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      statusLabel: formatStatus(event.status),
      approvalStatusLabel: formatStatus(event.approvalStatus),
      warningLabel: event.warningLabel,
      internalOnly: event.internalOnly
    }))
  };
}
