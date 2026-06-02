import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { loadEnv } from "./env";
import { TripsModule } from "./trips/trips.module";
import { HealthController } from "./health.controller";
import { AuthModule } from "./auth/auth.module";
import { DbModule } from "./db/db.module";
import { DocumentsModule } from "./documents/documents.module";

@Module({
  imports: [
    DbModule,
    JwtModule.register({
      global: true,
      secret: loadEnv().jwtSecret,
      signOptions: { algorithm: "HS256" }
    }),
    AuthModule,
    TripsModule,
    DocumentsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
