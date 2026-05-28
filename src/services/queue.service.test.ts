import { EMAIL_IMPORT_JOB_NAME, extractJobStatusLabel } from "@/services/queue-status";

describe("queue status helpers", () => {
  it("maps waiting and active jobs into user-facing labels", () => {
    expect(extractJobStatusLabel("waiting")).toBe("Queued");
    expect(extractJobStatusLabel("active")).toBe("Running");
  });

  it("keeps the expected import job name constant", () => {
    expect(EMAIL_IMPORT_JOB_NAME).toBe("gmail-import");
  });
});
