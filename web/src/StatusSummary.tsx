import { Badge } from "./Badge";
import type { Snapshot } from "./status";

export function StatusSummary({
  data,
  outdated,
  tunnelStatus,
}: {
  data?: Snapshot;
  outdated: boolean;
  tunnelStatus: string;
}) {
  const containers = data?.docker.containers ?? [];
  return (
    <section className="summary">
      <article>
        <span>Running containers</span>
        <strong>
          {outdated
            ? "—"
            : containers.filter((c) => c.state === "running").length}
        </strong>
        <small>Runtime state · health shown separately</small>
      </article>
      <article>
        <span>Unhealthy containers</span>
        <strong>
          {outdated
            ? "—"
            : containers.filter((c) => c.health === "unhealthy").length}
        </strong>
        <small>Based on configured Docker health checks</small>
      </article>
      <article>
        <span>Cloudflare connector</span>
        <div className="tunnel">
          <Badge value={tunnelStatus} />
        </div>
        <small>
          {data?.tunnel.error ??
            `${data?.tunnel.connections ?? 0} active connections · local connector only`}
        </small>
      </article>
    </section>
  );
}
