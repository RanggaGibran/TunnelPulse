import { State, formatTime as time } from "./display";
import type { Incident } from "./status";
export function IncidentTimeline({ incidents }: { incidents: Incident[] }) {
  return (
    <section className="panel timeline">
      <div className="section-heading">
        <h2>Incident timeline</h2>
        <span className="muted">{incidents.length} RECORDED</span>
      </div>
      {!incidents.length ? (
        <div className="empty">
          No incidents recorded.
          <p>Status transitions appear here as services fail and recover.</p>
        </div>
      ) : (
        incidents
          .slice()
          .reverse()
          .map((i) => (
            <article className="incident" key={i.id}>
              <span
                className={`incident-dot ${i.resolvedAt ? "resolved" : ""}`}
              />
              <div>
                <h3>
                  {i.serviceName}
                  <State value={i.resolvedAt ? "resolved" : "open"} />
                </h3>
                <p>{i.summary}</p>
                <small>
                  Opened {time(i.openedAt)}
                  {i.resolvedAt
                    ? ` · Recovered ${time(i.resolvedAt)}`
                    : " · Awaiting recovery"}
                </small>
              </div>
            </article>
          ))
      )}
    </section>
  );
}
