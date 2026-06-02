# Bengala Backend (NestJS) - Compartir ubicacion por enlace

Backend en `NestJS` centrado en usuarios, crear un viaje y compartir la ubicacion y el rastro a traves de un enlace.

## Requisitos

- Node.js 18+ (recomendado 20+)
- Gestor de paquetes (recomendado `pnpm`)

## Variables de entorno

- `DATABASE_URL` (obligatoria): cadena de conexion PostgreSQL. Ej: `postgresql://user:pass@localhost:5432/bengala?schema=public`
- `JWT_SECRET` (obligatoria en produccion): secreto para firmar y validar tokens.
- `DOCS_MASTER_KEY` (obligatoria en produccion): clave maestra (base64) para cifrar documentacion con AES-256-GCM.
- `PUBLIC_BASE_URL` (opcional): base para generar el enlace compartible. Ej: `https://api.tudominio.com`
- `PORT` (opcional): por defecto `3001`
- `ALLOWED_ORIGINS` (opcional): lista separada por comas para CORS. Ej: `https://tu-pwa.onrender.com,http://localhost:3000`

## Arranque local

```bash
cd bengala-backend
pnpm install
DATABASE_URL=postgresql://bengala:bengala@localhost:5433/bengala?schema=public JWT_SECRET=dev-secret pnpm run prisma:migrate
DATABASE_URL=postgresql://bengala:bengala@localhost:5433/bengala?schema=public JWT_SECRET=dev-secret pnpm run start:dev
```

Si no tienes PostgreSQL en local, puedes levantarlo con Docker:

```bash
cd ..
docker compose up -d
```

## Flujo basico

1. Crear viaje:

```bash
curl -X POST http://localhost:3001/api/trips
```

Respuesta:
- `tripId`
- `writeToken` (Bearer para subir ubicaciones)
- `shareUrl` (enlace para familiares y lectores)

2. Subir ubicacion:

```bash
curl -X POST http://localhost:3001/api/trips/<tripId>/locations ^
  -H "Authorization: Bearer <writeToken>" ^
  -H "Content-Type: application/json" ^
  -d "{\"lat\":41.3874,\"lon\":2.1686,\"acc\":12,\"ts\":1714000000000}"
```

3. Ver ubicacion y ruta:

```bash
curl http://localhost:3001/share/<readToken>
```

## Notas

- Persistencia en `PostgreSQL` via `Prisma`. Para futuro: anadir PostGIS e indices geoespaciales si hace falta.
- Los tokens diferencian `read` y `write`. Para produccion, preferimos compartir por `username` y controlar viajes activos.

## Despliegue en Render

Este repo incluye `render.yaml` para desplegar el backend y una base de datos PostgreSQL gratuita en Render.

1. Sube `bengala-backend` a GitHub.
2. En Render, crea un `Blueprint` desde el repositorio.
3. Render creara `bengala-backend` y `bengala-db`.
4. Completa los secretos del servicio:
   - `PUBLIC_BASE_URL`: la URL publica del backend en Render.
   - `ALLOWED_ORIGINS`: la URL del frontend, por ejemplo `https://tu-pwa.onrender.com`.
5. Tras el primer despliegue, Render ejecutara `pnpm prisma migrate deploy` durante el build.

Notas de Render:
- El plan gratuito sirve para prototipo y validacion, pero Render indica que los servicios free no son para produccion.
- El backend ya escucha el puerto que Render asigne mediante `PORT`.

