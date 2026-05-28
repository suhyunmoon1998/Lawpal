import { createEmailImportWorker, getEmailImportQueueEvents } from "@/services/queue.service";
import { processGmailImportJob } from "@/services/email-import-job.service";

const worker = createEmailImportWorker(processGmailImportJob);
const events = getEmailImportQueueEvents();

worker.on("ready", () => {
  console.log("Email import worker is ready.");
});

worker.on("completed", (job) => {
  console.log(`Email import job completed: ${job.id}`);
});

worker.on("failed", (job, error) => {
  console.error(`Email import job failed: ${job?.id ?? "unknown"}`, error);
});

events.on("error", (error) => {
  console.error("Queue events error", error);
});

async function shutdown(signal: string) {
  console.log(`Shutting down email import worker due to ${signal}...`);
  await events.close();
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
