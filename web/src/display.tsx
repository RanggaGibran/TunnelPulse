import { Icon } from "./Icon";
export const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
export function State({ value }: { value: string }) {
  return (
    <span className={`state ${value}`}>
      <Icon
        name={
          ["healthy", "connected", "running", "resolved"].includes(value)
            ? "check"
            : ["down", "degraded", "unhealthy", "open", "exited"].includes(
                  value,
                )
              ? "warning"
              : "clock"
        }
      />
      {value.replaceAll("_", " ")}
    </span>
  );
}
