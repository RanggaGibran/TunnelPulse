export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`badge ${["running", "healthy", "connected", "available"].includes(value) ? "good" : ["exited", "dead", "unhealthy", "disconnected"].includes(value) ? "bad" : ""}`}
    >
      {value}
    </span>
  );
}
