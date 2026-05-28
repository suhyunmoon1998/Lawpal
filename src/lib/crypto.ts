import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function getEncryptionKey() {
  const source = process.env.ENCRYPTION_KEY ?? "development-encryption-key-change-me";
  return createHash("sha256").update(source).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [iv, tag, payload] = value.split(".");

  if (!iv || !tag || !payload) {
    throw new Error("Stored secret has an invalid format.");
  }

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
