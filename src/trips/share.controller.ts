import { Controller, Get, Param, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TripsService } from "./trips.service";
import type { TripTokenPayload } from "./types";

@Controller()
export class ShareController {
  constructor(
    private readonly trips: TripsService,
    private readonly jwt: JwtService
  ) {}

  @Get("/share/:token")
  async share(@Param("token") token: string) {
    let payload: TripTokenPayload;
    try {
      payload = this.jwt.verify<TripTokenPayload>(token);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    if (payload.role !== "read") {
      throw new UnauthorizedException("Wrong role");
    }

    const trip = await this.trips.getTrip(payload.sub);
    const last = trip.points.length ? trip.points[trip.points.length - 1]! : null;

    return {
      tripId: trip.id,
      updatedAt: trip.updatedAt,
      last,
      trail: trip.points
    };
  }
}
