import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException
} from "@nestjs/common";
import type { Request, Response } from "express";
import { loadEnv } from "../env";
import { parseCookieHeader } from "./cookies";
import { TokensService } from "./tokens.service";
import { UsersService } from "./users.service";

type RegisterBody = { email: string; password: string };
type LoginBody = { email: string; password: string };

function setRefreshCookie(res: Response, cookieName: string, value: string) {
  // Cookie value packs jti + refresh token.
  // In production: set Secure=true behind HTTPS.
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`
  ];
  if (isProd) parts.push("Secure");
  res.header("Set-Cookie", parts.join("; "));
}

function clearRefreshCookie(res: Response, cookieName: string) {
  const isProd = process.env.NODE_ENV === "production";
  const parts = [
    `${cookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];
  if (isProd) parts.push("Secure");
  res.header("Set-Cookie", parts.join("; "));
}

@Controller("/api/auth")
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokensService
  ) {}

  @Post("/register")
  async register(@Body() body: Partial<RegisterBody>) {
    const user = await this.users.register(
      String(body.email || ""),
      String((body as any).username || ""),
      String(body.password || "")
    );
    return { ok: true, user: { id: user.id, email: user.email, username: user.username } };
  }

  @Post("/login")
  async login(
    @Body() body: Partial<LoginBody>,
    @Res({ passthrough: true }) res: Response
  ) {
    const env = loadEnv();
    const user = await this.users.authenticate(
      String(body.email || ""),
      String(body.password || "")
    );
    const accessToken = this.tokens.signAccessToken(user.id, user.email, user.username);
    const issued = this.tokens.issueRefreshToken(user.id);
    setRefreshCookie(res, env.refreshCookieName, `${issued.jti}.${issued.refreshToken}`);
    return { ok: true, accessToken, user: { id: user.id, email: user.email, username: user.username } };
  }

  @Post("/refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const env = loadEnv();
    const cookies = parseCookieHeader(req.header("cookie"));
    const packed = cookies[env.refreshCookieName];
    if (!packed) throw new UnauthorizedException("Missing refresh");
    const dot = packed.indexOf(".");
    if (dot <= 0) throw new UnauthorizedException("Invalid refresh");
    const jti = packed.slice(0, dot);
    const token = packed.slice(dot + 1);

    const rotated = await this.tokens.rotateRefreshToken(jti, token);
    const user = await this.users.getById(rotated.userId);
    if (!user) throw new UnauthorizedException("Invalid refresh");

    const accessToken = this.tokens.signAccessToken(user.id, user.email, user.username);
    setRefreshCookie(res, env.refreshCookieName, `${rotated.newJti}.${rotated.newRefreshToken}`);
    return { ok: true, accessToken, user: { id: user.id, email: user.email, username: user.username } };
  }

  @Post("/logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const env = loadEnv();
    const cookies = parseCookieHeader(req.header("cookie"));
    const packed = cookies[env.refreshCookieName];
    if (packed) {
      const dot = packed.indexOf(".");
      if (dot > 0) await this.tokens.revokeRefresh(packed.slice(0, dot));
    }
    clearRefreshCookie(res, env.refreshCookieName);
    return { ok: true };
  }

  @Get("/me")
  me(@Req() req: Request) {
    const auth = req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!token) throw new UnauthorizedException("Missing token");
    const payload = this.tokens.verifyAccessToken(token);
    return { ok: true, user: { id: payload.sub, email: payload.email, username: payload.username } };
  }
}
