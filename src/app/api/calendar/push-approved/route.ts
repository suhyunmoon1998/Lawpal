import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { pushApprovedEventToGoogle } from "@/services/google-calendar.service";

export async function POST(request: Request) {
  await requireApiSession();
  const body = (await request.json()) as { calendarEventId: string };
  const result = await pushApprovedEventToGoogle(body.calendarEventId);
  return NextResponse.json(result);
}
