import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/services/audit-log.service";
import { getDailySyncScheduleLabel } from "@/services/gmail-schedule.service";
import { removeDailyGmailImportSchedule, upsertDailyGmailImportSchedule } from "@/services/queue.service";

const payloadSchema = z.object({
  connectedEmailAccountId: z.string().min(1),
  enabled: z.boolean(),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59)
});

export async function POST(request: Request) {
  const session = await requireApiSession();

  if (session.role !== "FIRM_ADMIN") {
    return NextResponse.json({ error: "Only firm admins can change daily Gmail sync settings." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid daily sync settings payload." }, { status: 400 });
  }

  const account = await prisma.connectedEmailAccount.findFirst({
    where: {
      id: parsed.data.connectedEmailAccountId,
      lawFirmId: session.lawFirmId,
      provider: "GMAIL"
    },
    include: {
      lawFirm: {
        select: {
          timezone: true
        }
      }
    }
  });

  if (!account) {
    return NextResponse.json({ error: "Connected Gmail account not found." }, { status: 404 });
  }

  if (account.oauthStatus !== "CONNECTED") {
    return NextResponse.json(
      { error: "Reconnect Gmail before turning on daily automated mailbox review." },
      { status: 409 }
    );
  }

  const nextAccount = await prisma.connectedEmailAccount.update({
    where: { id: account.id },
    data: {
      dailySyncEnabled: parsed.data.enabled,
      dailySyncHour: parsed.data.hour,
      dailySyncMinute: parsed.data.minute
    }
  });

  if (parsed.data.enabled) {
    await upsertDailyGmailImportSchedule({
      connectedEmailAccountId: account.id,
      lawFirmId: account.lawFirmId,
      hour: parsed.data.hour,
      minute: parsed.data.minute,
      timezone: account.lawFirm.timezone
    });
  } else {
    await removeDailyGmailImportSchedule(account.id);
  }

  await recordAuditLog({
    lawFirmId: session.lawFirmId,
    actorUserId: session.userId,
    actionType: parsed.data.enabled ? "GMAIL_DAILY_SYNC_ENABLED" : "GMAIL_DAILY_SYNC_DISABLED",
    sourceEntityType: "ConnectedEmailAccount",
    sourceEntityId: account.id,
    beforeValue: {
      dailySyncEnabled: account.dailySyncEnabled,
      dailySyncHour: account.dailySyncHour,
      dailySyncMinute: account.dailySyncMinute
    },
    afterValue: {
      dailySyncEnabled: nextAccount.dailySyncEnabled,
      dailySyncHour: nextAccount.dailySyncHour,
      dailySyncMinute: nextAccount.dailySyncMinute,
      timezone: account.lawFirm.timezone
    }
  });

  return NextResponse.json({
    ok: true,
    scheduleLabel: getDailySyncScheduleLabel({
      hour: nextAccount.dailySyncHour,
      minute: nextAccount.dailySyncMinute,
      timezone: account.lawFirm.timezone
    })
  });
}
