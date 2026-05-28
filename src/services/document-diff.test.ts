import { buildSimpleLineDiff } from "@/services/document-diff";

describe("buildSimpleLineDiff", () => {
  it("marks changed lines as removed and added", () => {
    const diff = buildSimpleLineDiff("line one\nline old", "line one\nline new");
    expect(diff[0]).toEqual({ type: "unchanged", content: "line one" });
    expect(diff[1]).toEqual({ type: "removed", content: "line old" });
    expect(diff[2]).toEqual({ type: "added", content: "line new" });
  });
});
