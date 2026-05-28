import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCaseStatusSchema } from "@/lib/validators";
import { recordAuditLog } from "@/services/audit-log.service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const payload = updateCaseStatusSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.caseMatter.findFirst({
    where: {
      id: payload.data.caseMatterId,
      lawFirmId: session.lawFirmId
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Matter not found." }, { status: 404 });
  }

  const updated = await prisma.caseMatter.update({
    where: { id: existing.id },
    data: {
      status: payload.data.status
    }
  });

  await recordAuditLog({
    lawFirmId: session.lawFirmId,
    actorUserId: session.userId,
    actionType: "CASE_STATUS_UPDATED",
    sourceEntityType: "CaseMatter",
    sourceEntityId: updated.id,
    beforeValue: {
      status: existing.status
    },
    afterValue: {
      status: updated.status
    }
  });

  return NextResponse.json({
    ok: true,
    caseMatter: updated
  });
}
