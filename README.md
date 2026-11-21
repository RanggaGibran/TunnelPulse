# TunnelPulse

A lightweight, self-hosted dashboard for Docker containers and Cloudflare Tunnels.

See container state, health checks, and local tunnel connectivity in one view. Replaced Swarm tasks are hidden by default. Monitoring is read-only; no database or Cloudflare API token is needed.

## Run

On a Linux Docker host with cloudflared's readiness endpoint enabled:

```sh
docker compose up -d --build
```

Open `http://127.0.0.1:8088`. For a remote host, use an SSH port forward. The dashboard has no authentication; keep it private.

Configure `LISTEN_ADDR`, `DOCKER_SOCKET`, and `TUNNEL_READY_URL` through environment variables. Checks run every 15 seconds with a five-second timeout. Data older than 45 seconds is shown as unknown.

The supplied Compose file uses host networking to reach cloudflared on the host. Adjust its readiness URL if your connector uses a different port. Tunnel connectivity does not verify origin application health.

Docker socket access is privileged even with a read-only mount. Use this only on a trusted host.

## Development

Backend: Go. Frontend: React and TypeScript. Build the frontend with `npm run build` in `web`, then run `go run ./cmd/tunnelpulse`. `WEB_DIR` defaults to `web/dist`.

## Checks

Run checks on your development server:

```sh
go test -race ./...
go vet ./...
cd web
npm ci
npm run build
```

With the dashboard running on that server, browser checks can run in isolation:

```sh
docker build -f web/Dockerfile.test -t tunnelpulse-browser-test web
docker run --rm --network host --shm-size=256m tunnelpulse-browser-test
```

The browser suite covers source failures, stale data, Swarm task filtering, manual refresh, and desktop/mobile rendering. It does not stop or modify monitored services.
