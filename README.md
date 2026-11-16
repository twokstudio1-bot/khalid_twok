# TWOK STUDIO – Premium Portfolio & CMS

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Prisma, PostgreSQL, Nginx/Docker.

## Local development

```bash
npm_config_cache=/private/var/folders/td/db0zcbw5645cxsr6p6k8r4zh0000gp/T/npm-cache npm install
cp .env.example .env
# edit DATABASE_URL if needed
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. Admin: http://localhost:3000/admin (admin@twokstudio.local / ChangeMe-TWOK-2026).

## Quality checks

```bash
npm run typecheck
npm run build
npm test
```

## Production deployment (Ubuntu VPS / Docker)

```bash
cp .env.example .env
# set POSTGRES_PASSWORD, NEXT_PUBLIC_SITE_URL, AUTH_SECRET, SMTP, S3, etc.
docker compose up -d --build
docker compose exec app npm run db:deploy
docker compose exec app npm run db:seed
```

Nginx configuration is in `deploy/nginx.conf`. Add TLS certificates under `deploy/certs` and enable the HTTPS server block for production.

## Backups

```bash
DATABASE_URL="postgresql://..." ./scripts/backup.sh
DATABASE_URL="postgresql://..." ./scripts/restore.sh backups/twok_YYYYMMDD_HHMMSS.sql
```

## Notes

- All public content is database-driven; no hardcoded categories or homepage content.
- Booking requests remain PENDING until an administrator confirms them.
- Unconfigured external services (SMTP, S3, WhatsApp Cloud API) are recorded as SKIPPED or FAILED, never as successful.
- Media files are stored on disk or S3; only metadata is stored in PostgreSQL.