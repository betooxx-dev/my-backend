# Argos

Argos is Alberto's personal NestJS API. Its first complete product surface is
the blog backend consumed by the personal website and Studio: Markdown posts,
draft/published lifecycle, API-key protected administration, and image assets.

## Requirements

- Node.js 22 and npm
- Docker (for the local PostgreSQL service and the E2E test suite)

## Local setup

```powershell
npm ci
Copy-Item .env.example .env
docker compose up -d db
npm run start:dev
```

The API uses the `/api` prefix. Swagger is available at `/docs` while the app
is running. Local asset bytes are written below `.local/blog-assets`, which is
ignored by Git.

Create an administrative API key after PostgreSQL is running:

```powershell
npm run api-key:create -- --name studio --scopes blog:admin
```

The token is shown only once. Studio sends it as
`Authorization: Bearer <token>` for every `/api/blog/admin/*` request.

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

## Useful commands

```powershell
npm run start:dev
npm run api-key:list
npm run api-key:revoke -- --id <api-key-id>
npm run format
```

## License

Private and unlicensed.
