import { buildEmailStorageKey } from "@/services/storage.service";

describe("buildEmailStorageKey", () => {
  it("uses an unassigned path when no workspace key exists", () => {
    const key = buildEmailStorageKey({
      connectedEmailAccountId: "acct_1",
      providerMessageId: "msg_1",
      fileName: "motion papers.pdf",
      workspaceKey: null
    });

    expect(key).toContain("unassigned/acct_1");
    expect(key).toContain("motion-papers.pdf");
  });
});
