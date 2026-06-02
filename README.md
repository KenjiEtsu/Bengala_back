# Bengala Backend (NestJS) — Compartir ubicación por enlace

Backend en **NestJS** centrado en: **usuarios**, **crear un “viaje”** y **compartir la ubicación** (y el rastro) a través de un **enlace**.

## Requisitos

- Node.js 18+ (recomendado 20+)
- Gestor de paquetes (recomendado `pnpm`)

## Variables de entorno

- `DATABASE_URL` (obligatoria): cadena de conexión PostgreSQL. Ej: `postgresql://user:pass@localhost:5432/bengala?schema=public`
- `JWT_SECRET` (obligatoria en producción): secreto para firmar/validar tokens.
- `DOCS_MASTER_KEY` (obligatoria en producción): clave maestra (base64) para cifrar documentación (AES-256-GCM).
- `PUBLIC_BASE_URL` (opcional): base para generar el enlace compartible. Ej: `https://api.tudominio.com`
- `PORT` (opcional): por defecto `3001`
- `ALLOWED_ORIGINS` (opcional): lista separada por comas para CORS. Ej: `https://tupwa.vercel.app,http://localhost:3000`

## Arranque (local)

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

## Flujo básico

1) Crear viaje (devuelve enlace de lectura + token de escritura):

```bash
curl -X POST http://localhost:3001/api/trips
```

Respuesta:
- `tripId`
- `writeToken` (Bearer para subir ubicaciones)
- `shareUrl` (enlace para familiares/lectores)

2) Subir ubicación (requiere token de escritura):

```bash
curl -X POST http://localhost:3001/api/trips/<tripId>/locations ^
  -H "Authorization: Bearer <writeToken>" ^
  -H "Content-Type: application/json" ^
  -d "{\"lat\":41.3874,\"lon\":2.1686,\"acc\":12,\"ts\":1714000000000}"
```

3) Ver ubicación + ruta (solo lectura, vía enlace):

```bash
curl http://localhost:3001/share/<readToken>
```

## Notas

- Persistencia en **PostgreSQL** vía **Prisma**. Para futuro: añadir PostGIS e índices geoespaciales si hace falta.
- Los tokens diferencian `read` (enlace compartible legacy) y `write` (subida de ubicaciones). Para producción, preferimos compartir por `username` y controlar “viajes activos”.
