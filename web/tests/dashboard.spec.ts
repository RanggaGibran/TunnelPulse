import { expect, test } from "@playwright/test";
const check = { status: "healthy", latencyMs: 24, statusCode: 200 };
const snapshot = () => ({
  docker: {
    status: "available",
    checkedAt: new Date().toISOString(),
    containers: [],
  },
  tunnel: {
    status: "connected",
    checkedAt: new Date().toISOString(),
    connections: 4,
  },
  services: [
    {
      id: "api",
      name: "Example API",
      originUrl: "http://127.0.0.1:9000",
      status: "healthy",
      diagnosis: "All configured checks pass.",
      checkedAt: new Date().toISOString(),
      origin: check,
      public: { status: "not_configured", latencyMs: 0 },
      containerState: "running",
      tunnelStatus: "connected",
      history: [
        { at: new Date().toISOString(), status: "healthy", latencyMs: 24 },
      ],
    },
  ],
  incidents: [],
});
test("service inspector and navigation", async ({ page }) => {
  await page.route("**/api/status", (r) => r.fulfill({ json: snapshot() }));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your services, connected." }),
  ).toBeVisible();
  await expect(page.getByText("All configured checks pass.")).toBeVisible();
  await page
    .getByRole("button", { name: "Infrastructure", exact: false })
    .click();
  await expect(page.getByLabel("Filter containers")).toBeVisible();
});
test("failure evidence and incidents", async ({ page }) => {
  const data = snapshot();
  data.services[0].status = "down";
  data.services[0].diagnosis =
    "Origin check failed while the tunnel remains connected.";
  await page.route("**/api/status", (r) => r.fulfill({ json: data }));
  await page.goto("/");
  await expect(
    page.getByText("Origin check failed while the tunnel remains connected."),
  ).toBeVisible();
});
test("stale observations are unknown", async ({ page }) => {
  const data = snapshot();
  data.docker.checkedAt = new Date(Date.now() - 60000).toISOString();
  await page.route("**/api/status", (r) => r.fulfill({ json: data }));
  await page.goto("/");
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.locator(".flow .state")).toHaveText([
    "unknown",
    "unknown",
    "unknown",
    "unknown",
  ]);
});
test("manual refresh triggers collection", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "↻ Refresh" })).toBeEnabled();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/api/refresh") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "↻ Refresh" }).click();
  expect((await request).headers()["x-tunnelpulse-refresh"]).toBe("1");
});
test("live desktop and mobile", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your services, connected." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "↻ Refresh" })).toBeEnabled();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("sidebar collapses and persists after reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator(".shell")).toHaveClass(/sidebar-collapsed/);
  await page
    .getByRole("button", { name: "Infrastructure", exact: true })
    .click();
  await expect(page.getByLabel("Filter containers")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.locator(".shell")).not.toHaveClass(/sidebar-collapsed/);
});

test("sidebar toggle icon is centered inside its button", async ({ page }) => {
 await page.goto("/");
 const button = page.getByRole("button", { name: "Collapse sidebar" });
 const outer = await button.boundingBox();
 const inner = await button.locator("svg").boundingBox();
 expect(outer).not.toBeNull(); expect(inner).not.toBeNull();
 expect(Math.abs(inner!.x + inner!.width / 2 - outer!.x - outer!.width / 2)).toBeLessThan(1);
 expect(Math.abs(inner!.y + inner!.height / 2 - outer!.y - outer!.height / 2)).toBeLessThan(1);
});
