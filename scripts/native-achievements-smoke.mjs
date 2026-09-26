// Run only in an isolated UNDER_THE_LIGHTS_DATA_DIR with WebView2 CDP on 9227.
// The first smoke creates a real career; this extension seeds its season finish
// to exercise award entry and record overrides through the native SQLite adapter.
import './native-side-events-smoke.mjs';
import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9227');
try {
  const page = browser.contexts()[0].pages()[0];
  const state = JSON.parse(
    await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state')),
  );
  const c = state.careers[0];
  c.seasonGames = 8;
  c.status = 'complete';
  c.ending = 'Native awards test season complete.';
  c.recaps = Array.from({ length: 8 }, (_, i) => ({
    ...c.recaps[0],
    id: i === 0 ? c.recaps[0].id : `native-finish-${i}`,
    week: i + 1,
    highlight: i === 0 ? c.recaps[0].highlight : undefined,
  }));
  for (const eventId of ['pressure', 'turn', 'finish'])
    c.choices.push({
      eventId,
      choiceId: 'test-fixture',
      title: 'Native fixture',
      choice: 'Test',
      outcome: 'Test',
      at: new Date().toISOString(),
    });
  await page.evaluate(
    (data) => window.__TAURI_INTERNALS__.invoke('save_state', { data }),
    JSON.stringify(state),
  );
  await page.reload();
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await page.getByRole('button', { name: 'Record Rookie of the Year', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, I won this award', exact: true }).click();
  await expect(page.locator('.award-card.earned')).toContainText('Rookie of the Year');
  await page.getByRole('button', { name: 'Edit regular game points record', exact: true }).click();
  await page.getByLabel('Existing league mark', { exact: true }).fill('19');
  await page.getByLabel('Existing holder / context', { exact: true }).fill('Native test league');
  await page.getByRole('button', { name: 'Save league record', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Native test league' })).toContainText(
    'Record broken',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(page.locator('.award-card.earned')).toContainText('Rookie of the Year');
  const saved = JSON.parse(
    await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state')),
  ).careers[0];
  expect(saved.points).toBe(c.points + 8);
  expect(saved.awards).toHaveLength(1);
  expect(saved.recordBook[0].value).toBe(19);
  expect(saved.recaps[0].highlight.tier).toBe('standout');
  await page.screenshot({ path: 'artifacts/native-awards-records.png', animations: 'disabled' });
  await writeFile(
    'artifacts/native-achievements-result.json',
    JSON.stringify(
      {
        passed: true,
        storage: 'SQLite',
        award: saved.awards[0],
        points: saved.points,
        record: saved.recordBook[0],
        tier: saved.recaps[0].highlight.tier,
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    'Native awards and records passed: award reward, record override, SQLite reload, no duplicate claim.',
  );
} finally {
  await browser.close();
}
