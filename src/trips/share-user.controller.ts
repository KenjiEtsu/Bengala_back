import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { UsersService } from "../auth/users.service";
import { TripsService } from "./trips.service";

@Controller()
export class ShareUserController {
  constructor(
    private readonly users: UsersService,
    private readonly trips: TripsService
  ) {}

  @Get("/share/u/:username")
  async shareByUsername(@Param("username") username: string) {
    const user = await this.users.getByUsername(username);
    if (!user) throw new NotFoundException("User not found");

    const tripMeta = await this.trips.getLatestTripForOwner(user.id);
    if (!tripMeta) throw new NotFoundException("No active trip");

    const trip = await this.trips.getTrip(tripMeta.id);
    if (!trip) throw new NotFoundException("No active trip");

    const last = trip.points.length ? trip.points[trip.points.length - 1]! : null;
    return {
      username: user.username,
      tripId: trip.id,
      updatedAt: trip.updatedAt,
      last,
      trail: trip.points
    };
  }
}
