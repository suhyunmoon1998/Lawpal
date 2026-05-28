import { extractMessageIdsFromHistory } from "@/services/gmail-history";

describe("extractMessageIdsFromHistory", () => {
  it("deduplicates message ids from Gmail history records", () => {
    const ids = extractMessageIdsFromHistory([
      {
        messagesAdded: [{ message: { id: "m1" } }, { message: { id: "m2" } }]
      },
      {
        messagesAdded: [{ message: { id: "m2" } }, { message: { id: "m3" } }]
      }
    ]);

    expect(ids).toEqual(["m1", "m2", "m3"]);
  });

  it("ignores missing ids", () => {
    const ids = extractMessageIdsFromHistory([
      {
        messagesAdded: [{ message: { id: "m1" } }, { message: {} }, {}]
      }
    ]);

    expect(ids).toEqual(["m1"]);
  });
});
