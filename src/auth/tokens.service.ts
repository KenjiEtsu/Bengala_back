import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { AccessTokenPayload, RefreshTokenRecord } from "./auth.types";
import { PrismaService } from "../db/prisma.service";

function sha256b64(input: string) {
  return createHash("sha256").update(input).digest("base64");
}

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  signAccessToken(userId: string, email: string, username: string) {
    const payload: AccessTokenPayload = { sub: userId, email, username };
    return this.jwt.sign(payload, { expiresIn: "15m" });
  }

  issueRefreshToken(userId: string): { refreshToken: string; jti: string } {
    const jti = randomUUID();
    const refreshToken = randomUUID() + "." + randomUUID();
    const rec: RefreshTokenRecord = {
      id: jti,
      userId,
      createdAt: Date.now(),
      tokenHash: sha256b64(refreshToken)
    };
    // Fire-and-forget is fine for prototype; production should await & handle errors.
    void this.prisma.refreshToken.create({
      data: { id: rec.id, userId: rec.userId, tokenHash: rec.tokenHash }
    });
    return { refreshToken, jti };
  }

  async rotateRefreshToken(
    jti: string,
    refreshToken: string
  ): Promise<{ userId: string; newRefreshToken: string; newJti: string }> {
    const rec = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!rec) throw new UnauthorizedException("Invalid refresh");
    const providedHash = sha256b64(refreshToken);
    const ok = timingSafeEqual(
      Buffer.from(rec.tokenHash),
      Buffer.from(providedHash)
    );
    if (!ok) {
      // revoke on mismatch
      await this.prisma.refreshToken.delete({ where: { id: jti } }).catch(() => {});
      throw new UnauthorizedException("Invalid refresh");
    }

    // rotate
    await this.prisma.refreshToken.delete({ where: { id: jti } }).catch(() => {});
    const next = this.issueRefreshToken(rec.userId);
    return { userId: rec.userId, newRefreshToken: next.refreshToken, newJti: next.jti };
  }

  async revokeRefresh(jti: string) {
    await this.prisma.refreshToken.delete({ where: { id: jti } }).catch(() => {});
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return this.jwt.verify<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid access token");
    }
  }
}
