import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import type { TripTokenPayload } from "../types";

@Injectable()
export class WriteTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const auth = req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!token) throw new UnauthorizedException("Missing token");

    let payload: TripTokenPayload;
    try {
      payload = this.jwt.verify<TripTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    if (payload.role !== "write") throw new UnauthorizedException("Wrong role");

    const tripId = req.params["tripId"];
    if (!tripId || payload.sub !== tripId) {
      throw new UnauthorizedException("Trip mismatch");
    }

    (req as any).tripId = payload.sub;
    return true;
  }
}

