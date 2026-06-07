# Utilio (master-utils)

Next.js app for [utilio.solutions](https://utilio.solutions): browser-based image, video, audio, and text utilities, AI tools, and swim meet management. One codebase serves the apex site and configured subdomains (`media.utilio.solutions`, `swim.utilio.solutions`, etc.) via host-based routing in `config/subdomains.json`.

**Stack:** Next.js 16 · React 19 · Prisma · PostgreSQL · NextAuth · AWS S3/SES · Stripe · Caddy · PM2 on AWS Lightsail

---

## Local development

### Prerequisites

- **Node.js 20+** (production server runs Node 22)
- **pnpm** (preferred locally — see `packageManager` in `package.json`) or npm
- **Docker** (for local Postgres)
- Optional: [Ollama](https://ollama.com) for local AI features

### 1. Install dependencies

```bash
pnpm install
# or: npm install
```

`postinstall` copies FFmpeg WASM assets into `public/ffmpeg/`.

### 2. Start Postgres

```bash
docker compose up -d
```

Local database: `postgresql://masterutils:masterutils_dev@localhost:5438/masterutils`

### 3. Configure environment

Create `.env.local` from the examples (LLM defaults in `.env.example`, auth/DB/Stripe/AWS in `.env.local.example`):

```bash
cp .env.local.example .env.local
```

Set at least:

```bash
DATABASE_URL="postgresql://masterutils:masterutils_dev@localhost:5438/masterutils"
AUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3742"
NEXT_PUBLIC_SITE_URL="http://localhost:3742"
NEXT_PUBLIC_SITE_NAME="Utilio"
```

For local AI tools, also copy LLM settings from `.env.example` (`LLM_BASE_URL`, `LLM_DEFAULT_MODEL`, etc.).

Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` for Google sign-in, Stripe keys for billing, and AWS credentials for S3 export history — see `.env.local.example` for the full list.

### 4. Run migrations

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Start the dev server

```bash
pnpm dev
# or: npm run dev
```

Open **http://localhost:3742** (dev runs on port **3742**, not 3000).

Subdomain routing (`swim.*`, `media.*`) only applies to the production apex domain. Locally, use path-based routes (e.g. `/swim`, `/browse/media`).

### Useful commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server on port 3742 |
| `pnpm build` | Production build |
| `pnpm start` | Run production build locally |
| `pnpm lint` | ESLint |
| `npx prisma studio` | Browse local DB |
| `docker compose down` | Stop Postgres |

---

## Deployment

Production runs on a **single AWS Lightsail instance** (`utilio`, `us-west-2`) with:

- **Caddy** — TLS and reverse proxy to the app on `:3000`
- **PM2** — process manager (`utilio` app)
- **Lightsail managed PostgreSQL** — production database
- **Route 53** — DNS for `utilio.solutions` and subdomains (see `config/subdomains.json`)

Deploy uses **zero-downtime directory swapping**: build in `/srv/app-staging` while `/srv/app` keeps serving traffic, then atomically swap directories and `pm2 reload`.

### Automatic deploy (GitHub Actions)

Every push to **`main`** runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Checks out the repo
2. Configures AWS admin credentials (Lightsail API, DB password fetch)
3. Writes `.env.production` from the `ENV_PRODUCTION` secret
4. Writes `.env.deploy.local` with utilio S3 IAM keys and optional SSH key
5. Runs `./scripts/deploy-utilio.sh`

**Required GitHub secrets:**

| Secret | Purpose |
|--------|---------|
| `AWS_ADMIN_ACCESS_KEY_ID` | Lightsail API + DB password (not utilio-s3) |
| `AWS_ADMIN_SECRET_ACCESS_KEY` | Paired admin secret |
| `ENV_PRODUCTION` | Full contents of production app env (auth, Stripe, Google OAuth, etc.) |
| `UTILIO_S3_ACCESS_KEY_ID` | IAM user for runtime S3 uploads |
| `UTILIO_S3_SECRET_ACCESS_KEY` | Paired S3 secret |
| `LIGHTSAIL_SSH_KEY` | Optional `.pem` for SSH (falls back to temporary Lightsail cert) |

You can also trigger a deploy manually from the Actions tab (**workflow_dispatch**).

### Manual deploy

From your machine (AWS CLI configured with admin access):

```bash
# 1. Production app secrets (auth, Stripe, Google OAuth, analytics, etc.)
#    Not committed — create locally from .env.local.example
vim .env.production

# 2. Deploy credentials (utilio-s3 IAM keys + optional SSH key path)
cat > .env.deploy.local <<'EOF'
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
LIGHTSAIL_SSH_KEY=/path/to/lightsail-key.pem
EOF

# 3. Deploy
set -a && source .env.deploy.local && set +a
./scripts/deploy-utilio.sh
```

The script:

1. Fetches the Lightsail DB password via admin AWS credentials
2. SSHs to the instance (`config/subdomains.json` → static IP)
3. Bootstraps server tooling (Node 22, PM2, Caddy) on first run
4. `git fetch && git reset --hard origin/main` in `/srv/app-staging`
5. Writes remote `.env.local` from `.env.production` + fetched DB URL
6. Runs `npm ci`, `prisma migrate deploy`, and `npm run build` in staging
7. Swaps staging ↔ live and `pm2 reload utilio`
8. Regenerates and reloads the Caddyfile from `config/subdomains.json`

Set `DEPLOY_STOP_FOR_BUILD=1` to stop PM2 during build if the instance is low on memory.

### Lockfiles: pnpm locally, npm on the server

Local development uses **pnpm** (`pnpm-lock.yaml`). The server and CI use **`npm ci`** (`package-lock.json`).

When you add or change dependencies in `package.json`, update **both** lockfiles before pushing:

```bash
pnpm install          # updates pnpm-lock.yaml
npm install           # updates package-lock.json
```

A mismatched `package-lock.json` will fail deploy at the `npm ci` step.

### Related scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy-utilio.sh` | Full production deploy |
| `scripts/generate-caddyfile.sh` | Print Caddy config from `config/subdomains.json` |
| `scripts/sync-subdomains.sh` | Sync subdomain DNS records |
| `scripts/sync-caddy.sh` | Push Caddyfile to server without full deploy |
| `scripts/provision.sh` | One-time AWS Lightsail provisioning (legacy bootstrap) |

---

## Project layout

```
app/                  Next.js App Router pages and API routes
components/           Shared UI
lib/                  Auth, Prisma, S3, Stripe, swim helpers
prisma/               Schema and migrations
config/subdomains.json  Apex domain, static IP, subdomain routing
scripts/              Deploy, DNS, and utility scripts
infra/                AWS CDK (optional infrastructure)
```
