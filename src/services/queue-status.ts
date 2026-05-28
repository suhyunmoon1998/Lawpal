import { EMAIL_IMPORT_JOB_NAME } from "@/services/queue-constants";

export { EMAIL_IMPORT_JOB_NAME };

export function extractJobStatusLabel(
  state:
    | "waiting"
    | "active"
    | "completed"
    | "failed"
    | "delayed"
    | "paused"
    | "prioritized"
    | "waiting-children"
) {
  switch (state) {
    case "waiting":
    case "delayed":
    case "paused":
    case "prioritized":
    case "waiting-children":
      return "Queued";
    case "active":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Queued";
  }
}
