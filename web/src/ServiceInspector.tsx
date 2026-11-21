import { Icon } from "./Icon";
import { State, formatTime as time } from "./display";
import type { Service } from "./status";
export function ServiceInspector({
  service,
  currentStatus,
}: {
  service: Service;
  currentStatus: string;
}) {
  const unknown = currentStatus === "unknown";
  return (
    <>
      <section className="panel detail">
        <div className="section-heading">
          <div>
            <div className="eyebrow">SERVICE INSPECTOR</div>
            <h2>{service.name}</h2>
          </div>
          <State value={currentStatus} />
        </div>
        <div className="flow">
          {[
            ["Public endpoint", service.public.status],
            ["Local connector", service.tunnelStatus],
            ["Origin", service.origin.status],
            ["Container", service.containerState],
          ].map(([label, state], i) => (
            <div className="flow-node" key={label}>
              <span className="node-icon">
                <Icon
                  name={(["globe", "tunnel", "origin", "server"] as const)[i]}
                />
              </span>
              <strong>{label}</strong>
              <State value={currentStatus === "unknown" ? "unknown" : state} />
            </div>
          ))}
        </div>
        <p className="check-scope">
          HTTP checks run from this host. Connector routing is not independently
          verified.
        </p>
        <div className="diagnosis">
          <div className="eyebrow">
            {currentStatus === "healthy" ? "ALL CLEAR" : "CHECK FINDINGS"}
          </div>
          <p>
            {currentStatus === "unknown"
              ? "Current evidence is unavailable. Wait for checks to resume."
              : service.diagnosis}
          </p>
        </div>
        <div className="evidence">
          <div>
            <span>Origin response</span>
            <strong>
              {unknown
                ? "—"
                : service.origin.statusCode ||
                  service.origin.error ||
                  "No response"}
            </strong>
          </div>
          <div>
            <span>Public response</span>
            <strong>
              {unknown
                ? "—"
                : service.public.statusCode ||
                  service.public.error ||
                  service.public.status.replaceAll("_", " ")}
            </strong>
          </div>
          <div>
            <span>Last checked</span>
            <strong>{time(service.checkedAt)}</strong>
          </div>
        </div>
      </section>
      <section className="panel chart-panel">
        <div className="section-heading">
          <h2>Origin response time</h2>
          <span className="muted">RECENT CHECKS · ms</span>
        </div>
        {service.history.length > 1 ? (
          <>
            <svg
              viewBox="0 0 600 100"
              role="img"
              aria-label="Historical origin latency"
            >
              <polyline
                fill="none"
                stroke="#a8b6f7"
                strokeWidth="2"
                points={service.history
                  .map(
                    (v, i) =>
                      `${(i * 600) / (service.history.length - 1)},${90 - Math.min(80, (v.latencyMs / Math.max(1, ...service.history.map((h) => h.latencyMs))) * 80)}`,
                  )
                  .join(" ")}
              />
            </svg>
            <div className="chart-labels">
              <span>{time(service.history[0].at)}</span>
              <span>
                Historical observations
                {unknown ? " · current status unknown" : ""}
              </span>
              <span>{time(service.history.at(-1)!.at)}</span>
            </div>
          </>
        ) : (
          <div className="empty">
            Collecting observations. History appears after the next check.
          </div>
        )}
      </section>
    </>
  );
}
