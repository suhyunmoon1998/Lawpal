import { detectDeadlineCandidates } from "@/services/deadline-detection";

describe("detectDeadlineCandidates", () => {
  it("detects a motion-related deadline candidate from subject matter", () => {
    const candidates = detectDeadlineCandidates({
      subject: "Notice of motion for summary judgment",
      bodyText: "Served by email.",
      extraction: {
        possibleDeadlineTriggers: ["Motion opposition or reply timing review"]
      }
    });

    expect(candidates[0]?.deadlineRuleTriggerType).toBe("MOTION_OPPOSITION_DETECTED");
  });

  it("detects a discovery-related candidate from rule 26 language", () => {
    const candidates = detectDeadlineCandidates({
      subject: "Rule 26 initial disclosures",
      bodyText: "Please review the discovery plan.",
      extraction: {
        possibleDeadlineTriggers: []
      }
    });

    expect(candidates[0]?.deadlineRuleTriggerType).toBe("INITIAL_DISCLOSURE_DETECTED");
  });
});
