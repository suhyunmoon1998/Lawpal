import { detectDeadlineCandidates } from "@/services/deadline-detection";

describe("case document automation helpers", () => {
  it("keeps motion detection available for living document updates", () => {
    const candidates = detectDeadlineCandidates({
      subject: "Opposition to motion for summary judgment",
      bodyText: "Served by email with briefing schedule references.",
      extraction: {
        possibleDeadlineTriggers: ["Motion opposition or reply timing review"]
      }
    });

    expect(candidates.some((candidate) => candidate.deadlineRuleTriggerType === "MOTION_OPPOSITION_DETECTED")).toBe(
      true
    );
  });
});
