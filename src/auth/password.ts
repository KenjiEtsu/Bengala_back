import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, {
    N: 1 << 14,
    r: 8,
    p: 1
  });
  return { salt: salt.toString("base64"), hash: hash.toString("base64") };
}

export function verifyPassword(
  password: string,
  saltB64: string,
  hashB64: string
): boolean {
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password, salt, expected.length, {
    N: 1 << 14,
    r: 8,
    p: 1
  });
  return timingSafeEqual(expected, actual);
}

