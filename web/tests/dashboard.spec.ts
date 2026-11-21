import { expect, test } from '@playwright/test';

const container = (id: string, state: string, slot: string) => ({
  id, state, slot, name: `api.${slot}.${id}`, image: 'api:1', health: 'none', service: 'api',
});
const snapshot = () => ({
  docker: { status: 'available', checkedAt: new Date().toISOString(), containers: [
    container('current', 'running', '1'), container('replaced', 'exited', '1'), container('failed', 'exited', '2'),
  ] },
  tunnel: { status: 'connected', checkedAt: new Date().toISOString(), connections: 4 },
});

test('keeps failed replica visible and supports filtering', async ({ page }) => {
  await page.route('**/api/status', route => route.fulfill({ json: snapshot() }));
  await page.goto('/');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await page.getByLabel('Show replaced Swarm tasks').check();
  await expect(page.locator('tbody tr')).toHaveCount(3);
  await page.getByLabel('Filter containers').fill('failed');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('failed Docker source shows unknown counts while tunnel remains connected', async ({ page }) => {
  await page.route('**/api/status', route => route.fulfill({ json: {
    ...snapshot(), docker: { status: 'unknown', checkedAt: new Date().toISOString(), error: 'Docker is unavailable' },
  } }));
  await page.goto('/');
  await expect(page.locator('.summary strong')).toHaveText(['—', '—']);
  await expect(page.locator('.tunnel')).toHaveText('connected');
});

test('aged snapshots are never shown as healthy', async ({ page }) => {
  const data = snapshot();
  data.docker.checkedAt = data.tunnel.checkedAt = new Date(Date.now() - 60000).toISOString();
  await page.route('**/api/status', route => route.fulfill({ json: data }));
  await page.goto('/');
  await expect(page.locator('.summary strong')).toHaveText(['—', '—']);
  await expect(page.locator('.tunnel')).toHaveText('unknown');
});

test('manual refresh requests a new collection', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '↻ Refresh' })).toBeEnabled();
  const request = page.waitForRequest(r => r.url().endsWith('/api/refresh') && r.method() === 'POST');
  await page.getByRole('button', { name: '↻ Refresh' }).click();
  expect((await request).headers()['x-tunnelpulse-refresh']).toBe('1');
  await expect(page.getByRole('button', { name: '↻ Refresh' })).toBeEnabled();
});

test('live dashboard renders at desktop and mobile sizes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await expect(page.locator('.tunnel')).toHaveText('connected');
  await expect(page.locator('tbody tr').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
