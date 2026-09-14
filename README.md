# My Backend

My Backend is Alberto's personal NestJS API. Its first complete product surface is
the blog backend consumed by the personal website and Studio: Markdown posts,
draft/published lifecycle, API-key protected administration, and image assets.

## Requirements

- Docker Desktop (recommended for local development)
- Node.js `>=22.19.0 <23` and npm `>=10.9.0 <11` when running the API outside Docker

The repository pins Node.js 22.19.0 in `.nvmrc` and enforces the declared
engines during dependency installation. With nvm, select the supported runtime
before installing dependencies:

```bash
nvm install
nvm use
node --version
npm --version
```

The expected versions are Node.js 22.19.0 or newer within the 22.x line and
npm 10.x. CI and the Docker image use the same Node.js major line.

## Local setup

```bash
cp .env.example .env
docker compose up --build
```

The API is available at <http://localhost:5001/api> and, in dev/test, Swagger at
<http://localhost:5001/docs>. Swagger is intentionally not registered when
`STAGE=prod`. The source tree is mounted for hot reload, while dependencies,
PostgreSQL data, and uploaded assets stay in named Docker volumes.

Health checks are public: `/api/health/live` reports that the HTTP process is
serving, while `/api/health/ready` reports that PostgreSQL is reachable. The
Compose healthcheck uses readiness; neither endpoint returns dependency
details or secrets.

HTTP throttling defaults to 120 requests per 60 seconds per client IP. Set
`THROTTLE_LIMIT` and `THROTTLE_TTL_MS` to positive integers for local tuning;
health endpoints are excluded so an orchestrator can observe failures. The
Express `trust proxy` setting remains disabled by default; enable and scope it
explicitly at the deployment boundary only when a trusted reverse proxy is
present.

Create an administrative API key after PostgreSQL is running:

```bash
docker compose exec api npm run api-key:create -- --name studio --scopes blog:admin
```

The token is shown only once. Studio sends it as
`Authorization: Bearer <token>` for every `/api/blog/admin/*` request.
The header must contain exactly one non-whitespace token; malformed or
ambiguous Bearer headers are rejected. Names are unique while active and can
be reused after revocation; `--expires-days` must be a positive integer.
Unknown scopes and duplicate scopes fail before any token is generated.

Populate the local blog with bilingual demo posts and generated WebP covers:

```bash
docker compose exec api npm run blog:seed
```

The seed only runs with `STAGE=dev`. It is idempotent: rerunning it updates its
known demo posts and reuses their generated assets instead of duplicating them.

## Blog contract

- Posts are created as `draft`; only the explicit publish/unpublish endpoints
  change lifecycle state.
- Content is stored and returned as Markdown in `contentMarkdown`.
- Public post, tag, related-post, and asset endpoints do not require an API key.
- Administrative post and asset endpoints require the `blog:admin` scope.
- Uploads use `multipart/form-data` with a `file` and non-empty `altText` field.
- Accepted images are JPEG, PNG, WebP, and AVIF. The default upload limit is
  8 MiB; decoded dimensions are validated by the service.

## Asset storage

The metadata and public URL contract is identical in both modes; changing the
driver does not change the website or Studio integration.

### Local development

The checked-in `.env.example` defaults to:

```dotenv
BLOG_ASSET_DRIVER=local
BLOG_ASSET_LOCAL_DIR=.local/blog-assets
BLOG_ASSET_MAX_BYTES=8388608
API_PUBLIC_URL=http://localhost:5000/api
```

`API_PUBLIC_URL` must be the externally reachable API base URL because it is
used to build asset URLs returned to clients.

### Cloudflare R2

For production, use an R2 bucket and credentials restricted to that bucket:

```dotenv
STAGE=prod
BLOG_ASSET_DRIVER=r2
BLOG_ASSET_MAX_BYTES=8388608
API_PUBLIC_URL=https://api.example.com/api
R2_ACCOUNT_ID=your-account-id
R2_BUCKET=your-bucket
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
```

Do not commit real credentials. Startup validation rejects R2 mode when any of
the four R2 values is missing. Production database TLS verifies certificates
by default; set `DB_SSL_CA` to the provider CA (with escaped `\n` line breaks)
when it is not already trusted by the runtime.

## Validation

```powershell
npm run build
npm run lint:check
npm run test:ci
npm run test:e2e:ci
npm run test:e2e:cov:ci
npm run test:mvp:cov:ci
npm run validate:env-example
npm run validate:guardrails
npm run audit:check
```

The E2E suite launches a disposable PostgreSQL container, runs the real initial
migration, and exercises the application through HTTP. Docker must therefore
be available. E2E coverage enforces a baseline of 80% statements/lines, 70%
functions, and 65% branches. Pull requests merge unit and E2E reports before
enforcing the existing 85% changed-line coverage guard.

Build the minimized production image separately with:

```bash
docker build --target production -t my-backend:production .
```

It contains only compiled output and production dependencies, runs as the
unprivileged `node` user, and uses `dumb-init` for correct signal handling.

## Useful commands

```powershell
npm run start:dev
npm run api-key:list
npm run api-key:revoke -- --id <api-key-id>
npm run format
```

## License

Private and unlicensed.

## Studio administration and categories

Categories now live in `blog_categories`. The existing `category` string remains
in the post contract and references the canonical name. A unique normalized key
folds case, whitespace, accents and punctuation. Renames cascade through a foreign
key; referenced categories cannot be deleted. Admin endpoints require `blog:admin`:

- `GET/POST /api/blog/admin/categories`
- `PATCH/DELETE /api/blog/admin/categories/:name` (URL-encoded name)
- Category input: `{ name: string, position: integer }`, position 0–10000.

Public `/api/blog/categories?locale=es|en` returns only categories with published
posts, ordered by position and name. Tags remain per-post metadata.

`1788560000000-CreateBlogCategories` backfills existing posts and merges equivalent
category spellings. Production uses the existing migration runner; it does not
require `synchronize`. Rollback preserves posts and their canonical category names,
but cannot reconstruct pre-normalization spelling variants.

For an **existing development database**, apply the migration before starting the
updated API (from the sibling `my-website` directory):

```sh
docker compose stop api
docker compose run --rm --no-deps api npm run blog:migrate-categories
docker compose start api
```

The command is development-only and records the migration, so subsequent runs are
no-ops. Fresh test/production schemas apply both migrations in order. The blog seed
creates missing seed categories and remains idempotent.

Public and admin posts return `coverAlt` from the joined cover asset. Missing
legacy alt text is returned as an empty string. Lists load the cover relation in
one query. Asset deletion checks exact `/blog/assets/:uuid` paths in Markdown,
including reference links and encoded URLs. An isolated UUID is not a reference.
A literal asset URL in a code example is conservatively treated as a reference.
Saving references and deleting an asset use database row locks to prevent races.
