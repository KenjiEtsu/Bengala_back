export type LocationPoint = {
  lat: number;
  lon: number;
  acc?: number;
  ts: number;
};

export type Trip = {
  id: string;
  ownerUserId: string;
  createdAt: number;
  updatedAt: number;
  points: LocationPoint[];
};

export type TokenRole = "read" | "write";

export type TripTokenPayload = {
  sub: string;
  role: TokenRole;
};
