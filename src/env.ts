export type Env = {
  port: number;
  jwtSecret: string;
  publicBaseUrl?: string;
  allowedOrigins: string[] | "*";
  refreshCookieName: string;
  docsMasterKeyB64: string;
};

export function loadEnv(): Env {
  const portRaw = process.env.PORT;
  const port = portRaw ? Number(portRaw) : 3001;

  const jwtSecret = process.env.JWT_SECRET || "dev-secret";
  const publicBaseUrl = process.env.PUBLIC_BASE_URL;
  const refreshCookieName =
    process.env.REFRESH_COOKIE_NAME || "bengala_refresh";
  const docsMasterKeyB64 =
    process.env.DOCS_MASTER_KEY ||
    Buffer.from(jwtSecret).toString("base64"); // dev fallback

  const allowedOriginsRaw = process.env.ALLOWED_ORIGINS?.trim();
  const allowedOrigins =
    !allowedOriginsRaw || allowedOriginsRaw === "*"
      ? "*"
      : allowedOriginsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  return {
    port: Number.isFinite(port) ? port : 3001,
    jwtSecret,
    publicBaseUrl,
    allowedOrigins,
    refreshCookieName,
    docsMasterKeyB64
  };
}
