import { Body, Controller, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { loadEnv } from "../env";
import { TripsService } from "./trips.service";
import type { LocationPoint, TripTokenPayload } from "./types";
import { WriteTokenGuard } from "./guards/write-token.guard";
import { AccessTokenGuard } from "../auth/guards/access-token.guard";
import type { Request } from "express";
import { NotFoundException } from "@nestjs/common";

type CreateTripResponse = {
  tripId: string;
  writeToken: string;
  shareUrl: string;
  readToken: string;
  username: string;
};

@Controller("/api/trips")
export class TripsController {
  constructor(
    private readonly trips: TripsService,
    private readonly jwt: JwtService
  ) {}

  @UseGuards(AccessTokenGuard)
  @Post()
  async createTrip(@Req() req: Request): Promise<CreateTripResponse> {
    const env = loadEnv();
    const userId = (req as any).user?.id as string | undefined;
    const username = (req as any).user?.username as string | undefined;
    const trip = await this.trips.createTrip(userId || "unknown");

    const readPayload: TripTokenPayload = { sub: trip.id, role: "read" };
    const writePayload: TripTokenPayload = { sub: trip.id, role: "write" };

    // Para prototipo: sin expiración. En producción: añade exp corto + rotación.
    const readToken = this.jwt.sign(readPayload);
    const writeToken = this.jwt.sign(writePayload);

    const base =
      env.publicBaseUrl?.replace(/\/+$/, "") ||
      `http://localhost:${env.port}`;

    // El shareUrl del backend se mantiene por compatibilidad. El frontend debería
    // compartir su página, pero si se usa backend directo, preferimos username.
    const shareUrl = username
      ? `${base}/share/u/${encodeURIComponent(username)}`
      : `${base}/share/${encodeURIComponent(readToken)}`;

    return { tripId: trip.id, writeToken, shareUrl, readToken, username: username || "" };
  }

  @UseGuards(WriteTokenGuard)
  @Post("/:tripId/locations")
  async addLocation(
    @Param("tripId") tripId: string,
    @Body() body: Partial<LocationPoint>
  ) {
    const lat = Number(body.lat);
    const lon = Number(body.lon);
    const ts = body.ts ? Number(body.ts) : Date.now();
    const acc = body.acc !== undefined ? Number(body.acc) : undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(ts)) {
      return { ok: false, error: "Invalid payload" };
    }

    const point: LocationPoint = { lat, lon, ts };
    if (acc !== undefined && Number.isFinite(acc)) point.acc = acc;

    try {
      const res = await this.trips.addLocation(tripId, point);
      return { ok: true, ...res };
    } catch (e) {
      if (e instanceof NotFoundException) {
        return { ok: false, error: "Trip not found" };
      }
      throw e;
    }
  }
}
