# QuickMart — Multi-level cache e-commerce demo

A responsive product catalog and cache monitor built with vanilla JavaScript, Express, MongoDB and Redis. It now includes customer registration/login, administrator login with role-based product management, and product image uploads.

## Requirements

- Node.js 18 or newer
- MongoDB and Redis (the included `compose.yaml` starts both with Docker Compose)

## Setup

1. Install packages: `npm ci` (or `npm install`).
2. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`).
3. Change `JWT_SECRET` to a unique random value of at least 32 characters. PowerShell can generate one with:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. Use a strong password of at least 12 characters. The example values are placeholders and must be changed.
5. Start MongoDB and Redis: `docker compose up -d`.
6. Create the administrator account: `npm run create-admin`. Running this again for the same admin email updates its password from `.env`.
7. Start QuickMart: `npm run dev`, then open http://localhost:5000.

## Accounts and permissions

- Customers can register from **Sign in → Customer → Create an account**.
- Administrator accounts cannot be created through public registration. Create or reset the administrator using `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run `npm run create-admin`. If that email already belongs to a customer and you intentionally want to convert that account, run `npm run create-admin -- --promote-existing`.
- Both roles sign in at `/auth.html`; choose Customer or Administrator. A signed-in customer can open the sign-in page and switch to an administrator account without being redirected away.
- Product browsing is public at `/`. The cache diagnostics live on their own `/cache.html` page. Only authenticated administrators can add, edit or delete products, clear cache entries, or upload product images.
- Sessions use a signed JWT in an HttpOnly, SameSite=Lax cookie. In production, set `NODE_ENV=production` and serve the site over HTTPS so the cookie is Secure.

## Product images

- While signed in as admin, choose **Add product** or **Edit** and upload a JPG, PNG, WEBP or GIF image (maximum 5 MB).
- Uploaded images are saved under `uploads/products` and served from `/uploads/products/...`.
- You can also provide an external HTTP(S) image URL, a bare image host URL (which is upgraded to HTTPS), or a supported local path under `/uploads/products`, `/images`, or `/assets`.
- If a product has no image or its image URL is unavailable, the catalog and detail page show a category-specific visual fallback. Existing product photos are not embedded in the source ZIP; preserve your `uploads/products` folder when moving or deploying the project.
- Uploaded image files are ignored by Git. Keep the `uploads/products/.gitkeep` file in the repository; back up the uploads directory if you need to preserve product photos.

## Demonstrate caching

- Open `/cache.html` for the dedicated cache monitor. Use **Probe catalog cache** to inspect the request source and update the hit counters; administrator sessions also see **Clear all cache**.

- Click **Clear all cache**: the following catalog request should report a database MISS (assuming no other client warms the key first).
- Click **Fetch again**: typically L1 HIT. After the L1 TTL expires, but before Redis TTL expires, a new request should report Redis HIT.
- Open a product: it has an independent detail cache. Admins can clear that product's cache.
- Add, edit or delete a product: all cache generations are invalidated.
- Run `npm run warm-cache` to populate and verify the catalog and detail cache keys. `npm run warm-cache -- --clear` also clears first and therefore requires admin credentials in `.env`.

## Cache architecture

| Strategy | Redis TTL | L1 TTL |
|---|---:|---:|
| aggressive | 1800 s | 300 s |
| balanced | 600 s | 60 s |
| relaxed | 120 s | 30 s |

Every cache lookup reads a small Redis generation token (global and per logical key), then checks L1, Redis data and finally MongoDB. L1 uses atomic file replacement on Linux `/dev/shm` and bounded process memory when shared storage is unavailable (including Windows). Near expiry, a hit can initiate a deduplicated background refresh. A generation change prevents an old refresh from becoming visible after invalidation.

Redis outage: reads bypass both caches and go to MongoDB. Mutations are paused when Redis is known unavailable; if Redis fails after a successful database write, the API reports a warning and retries global invalidation before its next cached request. MongoDB and Redis do not share a transaction, so this is a development/demo consistency design rather than a strict distributed transaction.

## Tests

- `npm test`: dependency-free cache, authentication-crypto and image-URL unit tests.
- `npm run test:live`: integration smoke test against the running app, MongoDB and Redis. It requires `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, signs in as admin, uploads a tiny test image, exercises product CRUD and cache invalidation, and deletes the temporary product/image. Run against a development database only.
- `npm run create-admin`: create or reset the administrator specified in `.env`.

This project is a learning/demo application. Before public deployment, add rate limiting, account recovery, audit logging, CSRF defenses appropriate to your deployment, image malware scanning, and operational backups.
