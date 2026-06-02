import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { loadEnv } from "./env";

async function bootstrap() {
  const env = loadEnv();
  const app = await NestFactory.create(AppModule, { cors: false });

  app.enableCors({
    origin:
      env.allowedOrigins === "*"
        ? true
        : (origin, cb) => {
            if (!origin) return cb(null, true);
            if (env.allowedOrigins.includes(origin)) return cb(null, true);
            return cb(new Error("CORS blocked"), false);
          },
    credentials: true
  });

  await app.listen(env.port);
}

void bootstrap();
