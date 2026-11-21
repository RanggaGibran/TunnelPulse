# TunnelPulse

A lightweight, self-hosted dashboard for Docker containers and Cloudflare Tunnels.

See container state, health checks, and local tunnel connectivity in one view. Replaced Swarm tasks are hidden by default. Monitoring is read-only; no database or Cloudflare API token is needed.

## Run

On a Linux Docker host with cloudflared's readiness endpoint enabled, copy `services.example.json` to `services.json`, then:

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

## Service monitoring

Copy `services.example.json` to `services.json` before starting Compose. Map each application to an origin URL, an optional public URL, and an exact Docker container or Swarm service name. Reload configuration by restarting TunnelPulse.

Checks expect HTTP 2xx and do not follow redirects. An Access login redirect is reported as a failed public check, not proof that the application is down. Use read-only health endpoints without credentials or query parameters. URLs are visible in the dashboard.

Service maps combine HTTP results, local connector connectivity, and container state. Diagnosis explains observations and suggests where to investigate; it does not establish a definitive root cause or verify which connector serves a public hostname.

The latest 120 samples per service and up to 200 incidents are kept in memory. History resets on restart. Unknown status never resolves an open incident. The current monitor reads local containers, not Swarm desired replica counts.
