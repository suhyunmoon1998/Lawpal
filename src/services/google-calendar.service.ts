import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { DRAFT_WARNING } from "@/lib/constants";

export function createCalendarOAuthUrl(lawFirmId: string) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALENDAR_REDIRECT_URI
  );

  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: lawFirmId,
    prompt: "consent"
  });
}

export async function pushApprovedEventToGoogle(calendarEventId: string) {
  const event = await prisma.calendarEvent.findUniqueOrThrow({
    where: { id: calendarEventId }
  });

  if (event.approvalStatus !== "ATTORNEY_APPROVED") {
    throw new Error("Calendar event must be attorney approved before Google sync.");
  }

  await prisma.calendarEvent.update({
    where: { id: calendarEventId },
    data: {
      googleEventId: `mock-google-${calendarEventId}`,
      internalOnly: false,
      status: "SYNCED_TO_GOOGLE",
      description: `${event.description}\n\n${DRAFT_WARNING}`
    }
  });

  return {
    calendarEventId,
    googleEventId: `mock-google-${calendarEventId}`
  };
}
