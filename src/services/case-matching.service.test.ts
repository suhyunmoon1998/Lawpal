import { matchCaseFromEmail } from "@/services/case-matching.service";

describe("matchCaseFromEmail", () => {
  it("returns a case when identifiers are strong", () => {
    const result = matchCaseFromEmail({
      knownCases: [
        {
          id: "case-1",
          name: "Lopez v. Horizon Manufacturing",
          caseNumber: "24STCV10811",
          aliases: ["Lopez", "Horizon"],
          courtName: "Los Angeles Superior Court"
        }
      ],
      subject: "24STCV10811 notice of motion",
      bodyText: "Filed in Los Angeles Superior Court",
      attachmentNames: []
    });

    expect(result.caseMatterId).toBe("case-1");
    expect(result.requiresManualAssignment).toBe(false);
  });
});
