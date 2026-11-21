export type Container = {
  id: string;
  name: string;
  image: string;
  state: string;
  health: string;
  service?: string;
  slot?: string;
};
export type Source = {
  status: string;
  checkedAt: string;
  error?: string;
  containers?: Container[];
  connections?: number;
};
export type Snapshot = { docker: Source; tunnel: Source };
export const stale = (source: Source) =>
  !Date.parse(source.checkedAt) ||
  Date.now() - Date.parse(source.checkedAt) > 45000;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isContainer(value: unknown): value is Container {
  return (
    record(value) &&
    ["id", "name", "image", "state", "health"].every(
      (key) => typeof value[key] === "string",
    ) &&
    optionalString(value.service) &&
    optionalString(value.slot)
  );
}

function isSource(value: unknown): value is Source {
  return (
    record(value) &&
    typeof value.status === "string" &&
    typeof value.checkedAt === "string" &&
    Number.isFinite(Date.parse(value.checkedAt)) &&
    optionalString(value.error) &&
    (value.containers === undefined ||
      (Array.isArray(value.containers) &&
        value.containers.every(isContainer))) &&
    (value.connections === undefined ||
      (typeof value.connections === "number" &&
        Number.isInteger(value.connections) &&
        value.connections >= 0))
  );
}

export function isSnapshot(value: unknown): value is Snapshot {
  return record(value) && isSource(value.docker) && isSource(value.tunnel);
}
