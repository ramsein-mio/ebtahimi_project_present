# Presentation request workflow deployment

The request workflow stores request metadata and review state in Cloudflare D1 and private attachment objects in Cloudflare R2.

## 1. Create the attachment bucket

Run once from the repository root (skip if the bucket already exists):

```bash
npx wrangler r2 bucket create pardis-present-uploads
```

The Worker binding is `pardis_present_uploads` in `wrangler.jsonc`. Keep this bucket private; files are served through authenticated Worker routes.

## 2. Apply the D1 migration

Check migration status, then apply the new migration to the remote database:

```bash
npx wrangler d1 migrations list pardis-present-db --remote
npx wrangler d1 migrations apply pardis-present-db --remote
```

This applies `migrations/0004_presentation_requests.sql` along with any unapplied earlier migrations. Confirm the target database is the intended production database before applying.

## 3. Verify and deploy

```bash
npm ci
npm run typecheck
npm test
npm run cf:deploy:dry
npm run cf:deploy
```

After deployment, sign in as an admin and open `/#/admin` → **درخواست‌های ارائه**. Submit a test request from a regular account with a small PDF or image, verify the attachment opens only when authenticated, import a valid JSON/YAML presentation, preview its slides, and use **تأیید و انتشار**. Confirm the published presentation appears in that user's dashboard.

## Limits and access controls

- Maximum 5 attachments per request, 10 MiB per file and 24 MiB total.
- Accepted extensions: PDF, Word, PowerPoint, Excel, CSV, TXT, Markdown, RTF and common raster/vector image formats.
- Attachment downloads require the request owner or an authenticated admin.
- A request does not create a presentation until an admin explicitly approves it.
