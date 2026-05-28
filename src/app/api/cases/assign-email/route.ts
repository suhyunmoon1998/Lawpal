import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assignEmailSchema } from "@/lib/validators";
import { recordAuditLog } from "@/services/audit-log.service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const payload = assignEmailSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.emailMessage.update({
    where: { id: payload.data.emailId },
    data: {
      caseMatterId: payload.data.caseMatterId,
      reviewStatus: "ASSIGNED"
    }
  });

  await recordAuditLog({
    lawFirmId: session.lawFirmId,
    actorUserId: session.userId,
    actionType: "EMAIL_ASSIGNED_TO_CASE",
    sourceEntityType: "EmailMessage",
    sourceEntityId: updated.id,
    sourceEmailId: updated.id,
    afterValue: {
      caseMatterId: payload.data.caseMatterId,
      reviewStatus: "ASSIGNED"
    }
  });

  return NextResponse.json(updated);
}
