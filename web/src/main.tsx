import { Icon } from "./Icon";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ContainerPanel } from "./ContainerPanel";
import { useStatus } from "./useStatus";
import { stale, type Service } from "./status";
import "./style.css";
import { State } from "./display";
import { ServiceInspector } from "./ServiceInspector";
import { IncidentTimeline } from "./IncidentTimeline";
function App() {
  const { data, error, loading, refresh } = useStatus();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  function toggleSidebar() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  }
  const [tab, setTab] = useState("Overview");
  const [selected, setSelected] = useState("");
  const services = data?.services ?? [];
  const incidents = data?.incidents ?? [];
  const outdated = error || !data || stale(data.docker);
  const status = (service: Service) =>
    outdated || Date.now() - Date.parse(service.checkedAt) > 45000
      ? "unknown"
      : service.status;
  const service = services.find((s) => s.id === selected) ?? services[0];
  const active = incidents.filter((i) => !i.resolvedAt);
  return (
    <div className={`shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside aria-label="Workspace navigation">
        <button
          className="sidebar-toggle"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          onClick={toggleSidebar}
        >
          <Icon name="panel" />
        </button>
        <a className="brand" href="/">
          <Icon name="pulse" /> <strong>TunnelPulse</strong>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {["Overview", "Services", "Incidents", "Infrastructure"].map(
            (name, index) => (
              <button
                aria-label={name}
                title={name}
                aria-current={tab === name ? "page" : undefined}
                className={tab === name ? "active" : ""}
                onClick={() => setTab(name)}
                key={name}
              >
                <Icon
                  name={
                    (["grid", "service", "clock", "server"] as const)[index]
                  }
                />
                <span className="nav-text">{name}</span>
                {name === "Incidents" && active.length > 0 && (
                  <b>{active.length}</b>
                )}
              </button>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          Self-hosted workspace
          <small>Read-only monitoring</small>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            Workspace <span>/</span> {tab}
          </div>
          <div className="header-actions">
            <span className="live-label">
              {outdated ? "Checks delayed" : "Monitoring active"}
            </span>
            <button onClick={() => void refresh()} disabled={loading}>
              {loading ? "Checking…" : "↻ Refresh"}
            </button>
          </div>
        </header>
        <section className="intro">
          <div>
            <div className="eyebrow">INFRASTRUCTURE, EXPLAINED</div>
            <h1>{tab === "Overview" ? "Your services, connected." : tab}</h1>
            <p>
              From public endpoint to container. Follow the signal, find the
              fault.
            </p>
          </div>
          <span className="interval">Checks every 15s</span>
        </section>
        {(error || outdated) && (
          <div role="alert" className="notice">
            {error ? "Connection lost." : "Waiting for current checks."} Current
            status is unknown until checks resume.
          </div>
        )}
        {tab !== "Infrastructure" && (
          <>
            <section className="metrics">
              <article>
                <span>Monitored services</span>
                <strong>{services.length}</strong>
                <small>Mapped application paths</small>
              </article>
              <article>
                <span>Healthy services</span>
                <strong className="mint">
                  {outdated
                    ? "—"
                    : services.filter((s) => status(s) === "healthy").length}
                </strong>
                <small>All configured checks passing</small>
              </article>
              <article>
                <span>Needs attention</span>
                <strong className={active.length ? "amber" : ""}>
                  {outdated
                    ? "—"
                    : services.filter((s) =>
                        ["down", "degraded"].includes(status(s)),
                      ).length}
                </strong>
                <small>Failed or degraded checks</small>
              </article>
              <article>
                <span>Open incidents</span>
                <strong>{active.length}</strong>
                <small>Since this monitor started</small>
              </article>
            </section>
            {tab !== "Incidents" && (
              <section className="workspace-grid">
                <div className="panel service-list">
                  <div className="section-heading">
                    <h2>
                      Services <span>{services.length}</span>
                    </h2>
                    <span className="muted">APPLICATION HEALTH</span>
                  </div>
                  {!services.length && (
                    <div className="empty">
                      No services configured yet.
                      <p>
                        Add your origin URL and container mapping in the
                        services configuration.
                      </p>
                    </div>
                  )}
                  {services.map((s) => (
                    <button
                      key={s.id}
                      className={`service-card ${service?.id === s.id ? "selected" : ""}`}
                      onClick={() => setSelected(s.id)}
                    >
                      <div className="service-card-top">
                        <span className="service-icon">
                          <Icon name="service" />
                        </span>
                        <State value={status(s)} />
                      </div>
                      <h3>{s.name}</h3>
                      <p>{s.publicUrl || s.originUrl}</p>
                      <div className="service-card-bottom">
                        <span>
                          {status(s) === "unknown"
                            ? "—"
                            : s.origin.latencyMs + " ms"}{" "}
                          <small>origin latency</small>
                        </span>
                        <span>View path →</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="detail-stack">
                  {service ? (
                    <>
                      <ServiceInspector
                        service={service}
                        currentStatus={status(service)}
                      />
                    </>
                  ) : (
                    <section className="panel empty">
                      Configure a service to inspect its connection path.
                    </section>
                  )}
                </div>
              </section>
            )}
            <IncidentTimeline incidents={incidents} />
          </>
        )}
        {tab === "Infrastructure" && (
          <ContainerPanel
            data={data}
            outdated={outdated || data?.docker.status !== "available"}
          />
        )}
        <footer>
          <span>TunnelPulse / infrastructure observability</span>
          <span>History is held in memory and resets on restart.</span>
        </footer>
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
