# ADR 004: Deploy backend and frontend as separate Dockerized Railway services

## Status
Superseded by [ADR 005](005-single-service-static-frontend.md). Two-service Railway deployment added operational overhead (two services, private networking config, nginx proxy) without a corresponding benefit for this project's scale; kept here for historical context.

## Context
EnergyBot needs a production deployment on Railway per CLAUDE.md's stack decision. The project is a monorepo with two independent apps — a Fastify backend and a Vite/React frontend — that need to be built and run differently: the backend is a long-running Node process, the frontend is a static build that only needs a web server.

## Decision
Each service gets its own `Dockerfile` and `railway.json`, and is registered as a separate Railway service pointing at its own root directory (`backend/`, `frontend/`):

- **Backend**: `node:20-alpine`, installs production dependencies, runs `node server.js`. Listens on `process.env.PORT` (already supported in `server.js`).
- **Frontend**: multi-stage build — `node:20-alpine` builds the Vite app, then the static `dist/` output is served by `nginx:alpine`. Nginx proxies `/api/*` to the backend service over Railway's private network and falls back to `index.html` for client-side routing.
- Frontend API calls (`frontend/src/api.js`) now use relative URLs (`''` base) instead of a hardcoded `http://localhost:3000`, so the same build works in local dev (via Vite) and production (via the nginx proxy) without an environment-specific build step.

## Rationale
- **Two Dockerfiles instead of one monorepo image.** Railway (and most PaaS) work best with one deployable unit per Dockerfile/service. Bundling both apps into a single container would couple their scaling, restart, and resource profiles unnecessarily.
- **Nginx reverse proxy over CORS-only setup.** Proxying `/api/*` through nginx means the frontend and API are same-origin in production, avoiding CORS configuration entirely in prod and letting the frontend code stay environment-agnostic (no build-time `VITE_API_URL` injection needed).
- **Per-service `railway.json`.** Railway's config schema configures one service per file; a single root file can't declare multiple services. Keeping config next to each Dockerfile also keeps build/deploy settings colocated with the code they affect.

## Trade-offs accepted
- **Nginx config depends on Railway's private networking** (`BACKEND_HOST` resolved via `envsubst` at container start) to reach the backend service by name. If the backend service is renamed, `BACKEND_HOST` must be updated in the frontend service's environment variables.
- **No shared base image/layer caching** between the two Dockerfiles — each installs its own `node_modules` independently. Acceptable at this project's scale; would revisit with a build-cache strategy if build times became a problem.

## Consequences
- Deploying requires creating two Railway services, each with its root directory set to `backend/` or `frontend/` respectively, and setting `BACKEND_HOST` as an environment variable on the frontend service (e.g. `energybot-backend.railway.internal`).
- `ANTHROPIC_API_KEY` and `DATABASE_URL` are only needed on the backend service.
