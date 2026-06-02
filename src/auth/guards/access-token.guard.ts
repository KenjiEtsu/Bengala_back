import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Request } from "express";
import { TokensService } from "../tokens.service";

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokensService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!token) throw new UnauthorizedException("Missing access token");

    const payload = this.tokens.verifyAccessToken(token);
    (req as any).user = { id: payload.sub, email: payload.email, username: payload.username };
    return true;
  }
}
