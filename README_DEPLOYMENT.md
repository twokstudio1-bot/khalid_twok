# README_DEPLOYMENT.md

## Required software
- Ubuntu 22.04/24.04
- Node.js 22 LTS
- PostgreSQL 18
- Nginx
- (optional) Docker + Docker Compose

## Extract
```bash
unzip twok-studio-modified.zip -d /var/www/twok-studio
cd /var/www/twok-studio
```

## Install
```bash
npm ci
cp .env.example .env
# edit .env
npm run db:deploy
npm run db:seed
npm run build
```

## Start persistently
```bash
npm install -g pm2
pm2 start npm --name twok-studio -- start
pm2 save
pm2 startup
```

## Nginx
Use deploy/nginx.conf adapted to your domain and TLS. Enable HTTPS with Certbot.

## Update
```bash
git pull  # if using git
npm ci
npm run db:deploy
npm run build
pm2 restart twok-studio
```

## Rollback
Restore the original ZIP/archive and rerun install/build/start. Restore database from backup if needed.