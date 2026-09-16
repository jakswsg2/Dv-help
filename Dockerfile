# ==============================================================================
# DV-Prep — Dockerfile (Multi-stage build for a Vite + React SPA)
# ==============================================================================
# Stage 1: Build the static production bundle with Node.js
# Stage 2: Serve the built assets with a lightweight Nginx image
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1 — Build
# ------------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies first (better layer caching)
# Use `npm ci` when a lockfile is present (reproducible); else `npm install`.
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy the rest of the source and build the SPA
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2 — Runtime (Nginx serving static files)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Drop the default config in favour of the SPA-aware config
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the compiled SPA from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
