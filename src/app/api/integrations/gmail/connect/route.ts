import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { createGmailOAuthUrl } from "@/services/gmail.service";

export async function GET() {
  const session = await requireApiSession();
  const url = await createGmailOAuthUrl({
    lawFirmId: session.lawFirmId,
    userId: session.userId
  });
  return NextResponse.redirect(url);
}
