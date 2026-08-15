# ADR 005: Serve the frontend as static files from the Fastify backend

## Status
Accepted. Supersedes [ADR 004](004-railway-deployment-with-docker.md).

## Context
ADR 004 deployed the backend and frontend as two separate Dockerized Railway services, with nginx proxying `/api/*` to the backend over Railway's private network. In practice this added deployment overhead disproportionate to the project's needs: two services to provision and monitor, a `BACKEND_HOST` private-network dependency to configure, and an nginx config to maintain — for an app with no independent scaling requirement between frontend and backend.

## Decision
Serve `frontend/dist/` directly from the Fastify backend instead of running a separate nginx service:

- `backend/server.js` registers `@fastify/static` with `frontend/dist` as its root, but only when `NODE_ENV=production`. In local dev, the frontend still runs via `vite dev` as its own process (unchanged).
- A `setNotFoundHandler` falls back to `index.html` for any unmatched non-`/api/` route (client-side routing support), and returns a JSON 404 for unmatched `/api/*` routes instead of the SPA shell.
- A single root `Dockerfile` builds the frontend (`npm run build`) in one stage, then copies `frontend/dist` into the final backend image alongside `node_modules` and source, and runs `node server.js` with `NODE_ENV=production` set.
- A single root `railway.json` configures the one Railway service; the separate `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, and per-service `railway.json` files from ADR 004 are removed.

## Rationale
- **One Railway service, one public URL.** No private networking, no `BACKEND_HOST` env var to keep in sync, no nginx config to maintain — the backend already needs to run as a Node process, so it can serve static files too via a well-supported Fastify plugin.
- **Same-origin by construction.** Serving both from the same process means the frontend's relative-URL API calls (`frontend/src/api.js`, unchanged since ADR 004) are automatically same-origin — no CORS or proxy config needed in production.
- **Simpler CI/deploy surface.** One Dockerfile, one build, one deploy target. For a portfolio project this scale, operational simplicity outweighs the service-isolation benefits of ADR 004's two-service split.

## Trade-offs accepted
- **Coupled scaling and deploys.** Frontend and backend now scale and redeploy together. Acceptable since the frontend is static and adds negligible load; would need to revisit if the frontend ever needed independent CDN-level scaling.
- **No CDN/edge caching for static assets** the way a dedicated static host or nginx layer would provide. `@fastify/static` serves files directly from the Node process; fine at this traffic scale.

## Consequences
- Railway deployment is now a single service pointed at the repo root, using the root `Dockerfile` and `railway.json`.
- `ANTHROPIC_API_KEY` and `DATABASE_URL` are the only environment variables the service needs.
- Local development is unchanged: `frontend/` still runs via `npm run dev` (Vite) against the backend on `localhost:3000` during development; the static-serving code path only activates when `NODE_ENV=production`.
