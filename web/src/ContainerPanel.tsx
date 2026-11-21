import { useState } from "react";
import { Badge } from "./Badge";
import type { Container, Snapshot } from "./status";

export function ContainerPanel({
  data,
  outdated,
}: {
  data?: Snapshot;
  outdated: boolean;
}) {
  const [history, setHistory] = useState(false);
  const [query, setQuery] = useState("");
  const containers = data?.docker.containers ?? [];
  const activeServices = new Set(
    containers
      .filter((c) => c.state === "running" && c.service && c.slot)
      .map((c) => `${c.service}:${c.slot}`),
  );
  const archived = (c: Container) =>
    c.state === "exited" &&
    !!c.service &&
    !!c.slot &&
    activeServices.has(`${c.service}:${c.slot}`);
  const visible = containers.filter(
    (c) =>
      (history || !archived(c)) &&
      `${c.name} ${c.image} ${c.service ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>
            Containers <span className="count">{containers.length}</span>
          </h2>
          <p>
            {data?.docker.error ??
              (outdated
                ? "Waiting for a current Docker check"
                : `Last checked ${new Date(data?.docker.checkedAt ?? 0).toLocaleTimeString()}`)}
          </p>
        </div>
        <input
          aria-label="Filter containers"
          placeholder="Filter containers…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={history}
          onChange={(e) => setHistory(e.target.checked)}
        />{" "}
        Show replaced Swarm tasks
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>CONTAINER</th>
              <th>STATE</th>
              <th>HEALTH CHECK</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="name">{c.service ?? c.name}</div>
                  <div className="image">{c.image}</div>
                  {c.service && (
                    <details>
                      <summary>Container details</summary>
                      <code>{c.name}</code>
                    </details>
                  )}
                </td>
                <td>
                  <Badge value={outdated ? "unknown" : c.state} />
                </td>
                <td>
                  <Badge
                    value={
                      outdated
                        ? "unknown"
                        : c.health === "none"
                          ? "not configured"
                          : c.health
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            {!data
              ? "Loading your infrastructure…"
              : data.docker.error
                ? "Docker data is unavailable."
                : "No containers to show."}
          </div>
        )}
      </div>
    </section>
  );
}
