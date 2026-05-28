import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { approvalDecisionSchema } from "@/lib/validators";
import { decideApproval } from "@/services/attorney-approval.service";

export async function POST(request: Request) {
  const session = await requireApiSession();
  const payload = approvalDecisionSchema.safeParse(await request.json());

  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const approval = await decideApproval({
    actorUserId: session.userId,
    actorRole: session.role,
    lawFirmId: session.lawFirmId,
    targetId: payload.data.targetId,
    targetType: payload.data.targetType,
    decision: payload.data.decision,
    comment: payload.data.comment
  });

  return NextResponse.json(approval);
}
