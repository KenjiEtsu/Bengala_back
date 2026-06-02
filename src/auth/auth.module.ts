import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { UsersService } from "./users.service";
import { TokensService } from "./tokens.service";
import { AccessTokenGuard } from "./guards/access-token.guard";

@Module({
  providers: [UsersService, TokensService, AccessTokenGuard],
  controllers: [AuthController],
  exports: [UsersService, TokensService, AccessTokenGuard]
})
export class AuthModule {}
