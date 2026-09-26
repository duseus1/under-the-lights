// Requires an isolated test data directory and WebView2 CDP on 9227.
import './native-side-events-smoke.mjs';
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9227');
try {
  const page = browser.contexts()[0].pages()[0];
  const state = JSON.parse(
    await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state')),
  );
  state.careers[0].relationships.coach = 80;
  await page.evaluate(
    (data) => window.__TAURI_INTERNALS__.invoke('save_state', { data }),
    JSON.stringify(state),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Relationships', exact: true }).click();
  await page.getByRole('button', { name: 'Claim earned coach benefits', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Claim earned coach benefits', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Review playing-time actions', exact: true }).click();
  const action = page
    .locator('.action-card')
    .filter({ hasText: 'Coach trust unlocked: Starting point guard' });
  await action.getByRole('button', { name: 'Applied in NBA 2K', exact: true }).click();
  await expect(action.locator('.tag')).toHaveText('completed');
  await page.reload();
  await page.getByRole('button', { name: 'Relationships', exact: true }).click();
  await expect(page.locator('.achievement-section')).toContainText(
    'Confirmed rotation target: 30 minutes/game',
  );
  const saved = JSON.parse(
    await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state')),
  ).careers[0];
  expect(saved.rotationMinutes).toBe(30);
  expect(saved.role).toBe('Starting point guard');
  expect(saved.relationshipUnlocks).toEqual([65, 80]);
  await page.screenshot({
    path: 'artifacts/native-relationship-tiers.png',
    animations: 'disabled',
  });
  await writeFile(
    'artifacts/native-relationships-result.json',
    JSON.stringify(
      {
        passed: true,
        storage: 'SQLite',
        role: saved.role,
        minutes: saved.rotationMinutes,
        unlocks: saved.relationshipUnlocks,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    'Native relationship tiers passed: earned starter role, confirmed minutes, SQLite reload.',
  );
} finally {
  await browser.close();
}
