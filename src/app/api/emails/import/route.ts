import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enqueueGmailImportJob, getImportJobSnapshot } from "@/services/queue.service";
import { recordAuditLog } from "@/services/audit-log.service";

export async function POST() {
  const session = await requireApiSession();
  const account = await prisma.connectedEmailAccount.findFirst({
    where: {
      lawFirmId: session.lawFirmId,
      provider: "GMAIL"
    }
  });

  if (!account) {
    return NextResponse.json({ error: "No connected Gmail account found." }, { status: 404 });
  }

  if (account.oauthStatus !== "CONNECTED") {
    return NextResponse.json(
      { error: "Gmail account is not connected. Reauthorize Gmail before importing mail." },
      { status: 409 }
    );
  }

  const job = await enqueueGmailImportJob({
    connectedEmailAccountId: account.id,
    actorUserId: session.userId,
    lawFirmId: session.lawFirmId
  });

  await recordAuditLog({
    lawFirmId: session.lawFirmId,
    actorUserId: session.userId,
    actionType: "GMAIL_IMPORT_JOB_QUEUED",
    sourceEntityType: "ConnectedEmailAccount",
    sourceEntityId: account.id,
    afterValue: {
      jobId: job.id
    }
  });

  const snapshot = await getImportJobSnapshot(job);

  return NextResponse.json(
    {
      queued: true,
      job: snapshot
    },
    { status: 202 }
  );
}
