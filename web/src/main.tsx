import { createRoot } from "react-dom/client";
import { ContainerPanel } from "./ContainerPanel";
import { StatusSummary } from "./StatusSummary";
import { stale } from "./status";
import { useStatus } from "./useStatus";
import "./style.css";

function App() {
  const { data, error, loading, refresh } = useStatus();
  const outdated =
    error || !data || data.docker.status !== "available" || stale(data.docker);
  const tunnelStatus =
    !data || error || stale(data.tunnel) ? "unknown" : data.tunnel.status;
  return (
    <main>
      <header>
        <a className="brand" href="/">
          ◉ <span>TunnelPulse</span>
        </a>
        <span className="host">LOCAL INFRASTRUCTURE</span>
      </header>
      <section className="intro">
        <div>
          <div className="eyebrow">YOUR SYSTEM, AT A GLANCE</div>
          <h1>A little less guesswork.</h1>
          <p>Containers and tunnel connectivity. One place to check.</p>
        </div>
        <button disabled={loading} onClick={() => void refresh()}>
          {loading ? "Checking…" : "↻ Refresh"}
        </button>
      </section>
      {error && (
        <div role="alert" className="notice">
          Unable to reach the dashboard. Displayed data may be outdated.
        </div>
      )}
      <StatusSummary
        data={data}
        outdated={outdated}
        tunnelStatus={tunnelStatus}
      />
      <ContainerPanel data={data} outdated={outdated} />
      <footer>
        <span>Read-only monitoring</span>
        <span>
          Checks every 15 seconds · Connected tunnels do not verify origin
          health
        </span>
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
