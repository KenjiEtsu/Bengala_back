import { Module } from "@nestjs/common";
import { TripsService } from "./trips.service";
import { TripsController } from "./trips.controller";
import { ShareController } from "./share.controller";
import { AuthModule } from "../auth/auth.module";
import { ShareUserController } from "./share-user.controller";

@Module({
  imports: [AuthModule],
  providers: [TripsService],
  controllers: [TripsController, ShareController, ShareUserController]
})
export class TripsModule {}
