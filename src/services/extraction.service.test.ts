import { buildStructuredExtraction } from "@/services/extraction.service";

describe("buildStructuredExtraction", () => {
  it("always returns structured JSON-safe output with attorney review required", () => {
    const result = buildStructuredExtraction({
      subject: "Notice of motion",
      bodyText: "Service by email.",
      attachmentNames: ["motion.pdf"]
    });

    expect(result.needsAttorneyReview).toBe(true);
    expect(Array.isArray(result.possibleDeadlineTriggers)).toBe(true);
    expect(result.documentType).toContain("Motion");
  });
});
