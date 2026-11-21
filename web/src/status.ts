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
export type Snapshot = {
  docker: Source;
  tunnel: Source;
  services: Service[];
  incidents: Incident[];
};
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
  return (
    record(value) &&
    isSource(value.docker) &&
    isSource(value.tunnel) &&
    Array.isArray(value.services) &&
    value.services.every(
      (s) =>
        record(s) &&
        [
          "id",
          "name",
          "originUrl",
          "status",
          "diagnosis",
          "checkedAt",
          "containerState",
          "tunnelStatus",
        ].every((k) => typeof s[k] === "string") &&
        Number.isFinite(Date.parse(s.checkedAt as string)) &&
        optionalString(s.publicUrl) &&
        optionalString(s.container) &&
        isCheck(s.origin) &&
        isCheck(s.public) &&
        Array.isArray(s.history) &&
        s.history.every(
          (h) =>
            record(h) &&
            typeof h.at === "string" &&
            Number.isFinite(Date.parse(h.at)) &&
            typeof h.status === "string" &&
            typeof h.latencyMs === "number",
        ),
    ) &&
    Array.isArray(value.incidents) &&
    value.incidents.every(
      (i) =>
        record(i) &&
        ["id", "serviceId", "serviceName", "openedAt", "summary"].every(
          (k) => typeof i[k] === "string",
        ) &&
        Number.isFinite(Date.parse(i.openedAt as string)) &&
        optionalString(i.resolvedAt) &&
        (i.resolvedAt === undefined ||
          Number.isFinite(Date.parse(i.resolvedAt as string))),
    )
  );
}

export type Check = {
  status: string;
  latencyMs: number;
  statusCode?: number;
  error?: string;
};
export type Service = {
  id: string;
  name: string;
  originUrl: string;
  publicUrl?: string;
  container?: string;
  status: string;
  diagnosis: string;
  checkedAt: string;
  origin: Check;
  public: Check;
  containerState: string;
  tunnelStatus: string;
  history: { at: string; status: string; latencyMs: number }[];
};
export type Incident = {
  id: string;
  serviceId: string;
  serviceName: string;
  openedAt: string;
  resolvedAt?: string;
  summary: string;
};

function isCheck(v: unknown): boolean {
  return (
    record(v) && typeof v.status === "string" && typeof v.latencyMs === "number"
  );
}
