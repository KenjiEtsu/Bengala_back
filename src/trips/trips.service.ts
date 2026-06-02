import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { LocationPoint, Trip } from "./types";
import { PrismaService } from "../db/prisma.service";

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTrip(ownerUserId: string): Promise<Trip> {
    const created = await this.prisma.trip.create({
      data: { ownerUserId }
    });
    return {
      id: created.id,
      ownerUserId: created.ownerUserId,
      createdAt: created.createdAt.getTime(),
      updatedAt: created.updatedAt.getTime(),
      points: []
    };
  }

  async getTrip(tripId: string): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { locations: { orderBy: { ts: "asc" } } }
    });
    if (!trip) throw new NotFoundException("Trip not found");
    return {
      id: trip.id,
      ownerUserId: trip.ownerUserId,
      createdAt: trip.createdAt.getTime(),
      updatedAt: trip.updatedAt.getTime(),
      points: trip.locations.map((p) => ({
        lat: p.lat,
        lon: p.lon,
        acc: p.acc ?? undefined,
        ts: Number(p.ts)
      }))
    };
  }

  async addLocation(tripId: string, point: LocationPoint): Promise<{ count: number }> {
    const tripExists = await this.prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true }
    });
    if (!tripExists) throw new NotFoundException("Trip not found");

    await this.prisma.tripLocation.create({
      data: {
        tripId,
        lat: point.lat,
        lon: point.lon,
        acc: point.acc ?? null,
        ts: BigInt(point.ts)
      }
    });

    // Cap para prototipo: borrar los más antiguos si supera MAX_POINTS
    const MAX_POINTS = 5000;
    const count = await this.prisma.tripLocation.count({ where: { tripId } });
    if (count > MAX_POINTS) {
      const toDelete = count - MAX_POINTS;
      const olds = await this.prisma.tripLocation.findMany({
        where: { tripId },
        orderBy: { ts: "asc" },
        take: toDelete,
        select: { id: true }
      });
      if (olds.length) {
        await this.prisma.tripLocation.deleteMany({
          where: { id: { in: olds.map((o) => o.id) } }
        });
      }
    }

    return { count: Math.min(count, MAX_POINTS) };
  }

  async getLast(tripId: string): Promise<LocationPoint | null> {
    const last = await this.prisma.tripLocation.findFirst({
      where: { tripId },
      orderBy: { ts: "desc" }
    });
    if (!last) return null;
    return {
      lat: last.lat,
      lon: last.lon,
      acc: last.acc ?? undefined,
      ts: Number(last.ts)
    };
  }

  async getLatestTripForOwner(ownerUserId: string): Promise<Trip | null> {
    const trip = await this.prisma.trip.findFirst({
      where: { ownerUserId },
      orderBy: { createdAt: "desc" }
    });
    if (!trip) return null;
    // locations loaded on demand by controller if needed
    return {
      id: trip.id,
      ownerUserId: trip.ownerUserId,
      createdAt: trip.createdAt.getTime(),
      updatedAt: trip.updatedAt.getTime(),
      points: []
    };
  }
}
