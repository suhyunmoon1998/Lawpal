import { Job, Queue, QueueEvents, Worker } from "bullmq";
import { EMAIL_IMPORT_JOB_NAME, EMAIL_IMPORT_QUEUE_NAME } from "@/services/queue-constants";

export type GmailImportJobData = {
  connectedEmailAccountId: string;
  actorUserId?: string;
  lawFirmId: string;
};

let queue: Queue<GmailImportJobData> | null = null;
let queueEvents: QueueEvents | null = null;

function getRedisConnection() {
  return {
    url: process.env.REDIS_URL ?? "redis://localhost:6379"
  };
}

export function getEmailImportQueue() {
  if (!queue) {
    queue = new Queue<GmailImportJobData>(EMAIL_IMPORT_QUEUE_NAME, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    });
  }

  return queue;
}

export function getEmailImportQueueEvents() {
  if (!queueEvents) {
    queueEvents = new QueueEvents(EMAIL_IMPORT_QUEUE_NAME, {
      connection: getRedisConnection()
    });
  }

  return queueEvents;
}

export async function getExistingImportJob(accountId: string) {
  const emailImportQueue = getEmailImportQueue();
  const jobId = `gmail-import:${accountId}`;
  const existing = await emailImportQueue.getJob(jobId);

  if (!existing) {
    return null;
  }

  const state = await existing.getState();
  if (state === "completed" || state === "failed") {
    return null;
  }

  return existing;
}

export async function enqueueGmailImportJob(data: GmailImportJobData) {
  const existing = await getExistingImportJob(data.connectedEmailAccountId);

  if (existing) {
    return existing;
  }

  return getEmailImportQueue().add(EMAIL_IMPORT_JOB_NAME, data, {
    jobId: `gmail-import:${data.connectedEmailAccountId}`
  });
}

export async function upsertDailyGmailImportSchedule(input: {
  connectedEmailAccountId: string;
  lawFirmId: string;
  hour: number;
  minute: number;
  timezone: string;
}) {
  const queue = getEmailImportQueue();
  const schedulerId = `gmail-import-daily:${input.connectedEmailAccountId}`;
  const cronPattern = `${input.minute} ${input.hour} * * *`;

  return queue.upsertJobScheduler(
    schedulerId,
    {
      pattern: cronPattern,
      tz: input.timezone
    },
    {
      name: EMAIL_IMPORT_JOB_NAME,
      data: {
        connectedEmailAccountId: input.connectedEmailAccountId,
        lawFirmId: input.lawFirmId
      },
      opts: {
        removeOnComplete: 100,
        removeOnFail: 1000
      }
    }
  );
}

export async function removeDailyGmailImportSchedule(connectedEmailAccountId: string) {
  return getEmailImportQueue().removeJobScheduler(`gmail-import-daily:${connectedEmailAccountId}`);
}

export async function getEmailImportJob(jobId: string) {
  return getEmailImportQueue().getJob(jobId);
}

export function createEmailImportWorker(
  processor: (job: Job<GmailImportJobData>) => Promise<unknown>
) {
  return new Worker<GmailImportJobData>(EMAIL_IMPORT_QUEUE_NAME, processor, {
    connection: getRedisConnection(),
    concurrency: 2
  });
}

export async function getImportJobSnapshot(job: Job<GmailImportJobData>) {
  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    name: job.name,
    state,
    progress,
    data: job.data,
    returnValue: job.returnvalue,
    failedReason: job.failedReason ?? null,
    createdAt: job.timestamp,
    processedAt: job.processedOn ?? null,
    finishedAt: job.finishedOn ?? null
  };
}
