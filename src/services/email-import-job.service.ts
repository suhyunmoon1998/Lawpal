import type { Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { importRecentEmails } from "@/services/gmail.service";
import { recordAuditLog } from "@/services/audit-log.service";
import type { GmailImportJobData } from "@/services/queue.service";

export async function processGmailImportJob(job: Job<GmailImportJobData>) {
  await job.updateProgress(5);

  const account = await prisma.connectedEmailAccount.findUnique({
    where: { id: job.data.connectedEmailAccountId }
  });

  if (!account) {
    throw new Error("Connected Gmail account not found for import job.");
  }

  await recordAuditLog({
    lawFirmId: job.data.lawFirmId,
    actorUserId: job.data.actorUserId,
    actionType: "GMAIL_IMPORT_JOB_STARTED",
    sourceEntityType: "ConnectedEmailAccount",
    sourceEntityId: account.id,
    afterValue: {
      jobId: job.id
    }
  });

  await job.updateProgress(20);

  const result = await importRecentEmails(job.data.connectedEmailAccountId, job.data.actorUserId);

  await job.updateProgress(100);

  await recordAuditLog({
    lawFirmId: job.data.lawFirmId,
    actorUserId: job.data.actorUserId,
    actionType: "GMAIL_IMPORT_JOB_COMPLETED",
    sourceEntityType: "ConnectedEmailAccount",
    sourceEntityId: account.id,
    afterValue: {
      jobId: job.id,
      importedCount: result.importedCount,
      syncMode: result.syncMode
    }
  });

  return result;
}
