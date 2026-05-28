import { decryptSecret, encryptSecret } from "@/lib/crypto";

describe("crypto helpers", () => {
  it("round-trips encrypted tokens", () => {
    const encrypted = encryptSecret("sensitive-refresh-token");
    expect(encrypted).not.toBe("sensitive-refresh-token");
    expect(decryptSecret(encrypted)).toBe("sensitive-refresh-token");
  });
});
