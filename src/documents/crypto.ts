import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";

export type EncryptedBlob = {
  alg: "AES-256-GCM";
  ivB64: string;
  tagB64: string;
  data: Buffer;
  sha256Hex: string;
};

export function parseMasterKey(masterKeyB64: string): Buffer {
  const raw = Buffer.from(masterKeyB64, "base64");
  // Ensure 32 bytes for AES-256. If not, derive deterministically (dev-friendly).
  if (raw.length === 32) return raw;
  return createHash("sha256").update(raw).digest();
}

export function encrypt(masterKey: Buffer, plain: Buffer): EncryptedBlob {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey, iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  const sha256Hex = createHash("sha256").update(plain).digest("hex");
  return {
    alg: "AES-256-GCM",
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
    data: enc,
    sha256Hex
  };
}

export function decrypt(masterKey: Buffer, blob: { ivB64: string; tagB64: string; data: Buffer }): Buffer {
  const iv = Buffer.from(blob.ivB64, "base64");
  const tag = Buffer.from(blob.tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.data), decipher.final()]);
}

