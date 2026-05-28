import { calculateDraftDeadline } from "@/services/deadline-calculation.service";

describe("calculateDraftDeadline", () => {
  it("keeps the legal safety warning on every result", () => {
    const result = calculateDraftDeadline({
      triggerDate: new Date("2026-05-19"),
      responseDays: 5,
      calculationType: "CALENDAR_DAYS"
    });

    expect(result.warning).toContain("Attorney approval is required before use");
  });

  it("moves weekend dates to Monday", () => {
    const result = calculateDraftDeadline({
      triggerDate: new Date("2026-05-22"),
      responseDays: 1,
      calculationType: "CALENDAR_DAYS"
    });

    expect(result.calculatedDeadlineDate.toISOString().slice(0, 10)).toBe("2026-05-25");
  });
});
