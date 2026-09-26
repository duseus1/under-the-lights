// Run against a locally installed test instance with WebView2 debugging on port 9227.
// Set UNDER_THE_LIGHTS_DATA_DIR before launch to keep test careers out of user saves.
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch('http://127.0.0.1:9227/json/version');
    if (response.ok) break;
  } catch {}
  if (attempt === 59)
    throw new Error('Native WebView2 debugging endpoint did not become ready within 30 seconds.');
  await new Promise((resolve) => setTimeout(resolve, 500));
}
const position = process.argv[2] ?? 'RB';
if (!['RB', 'TE'].includes(position)) throw new Error('Expected RB or TE');
const attribute = position === 'RB' ? 'Carrying' : 'Catching';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9227');
try {
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Madden', exact: true }).click();
  await page.getByLabel('Player name').fill('Morgan Hayes');
  await page.getByLabel('Jersey number').fill('94');
  await page
    .getByRole('button', {
      name: position === 'RB' ? 'RB Running Back' : 'TE Tight End',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: `Increase ${attribute}`, exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my career', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Morgan.' })).toBeVisible();
  for (const checkbox of await page.locator('.setup-list input').all()) {
    await checkbox.click();
    await expect(checkbox).toBeChecked();
  }
  await page.getByRole('button', { name: 'Ready for the draft', exact: true }).click();
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page.getByLabel('Drafted by').selectOption('Baltimore Ravens');
  await page.getByLabel('Round', { exact: true }).fill('2');
  await page.getByLabel('Overall pick').fill('35');
  await page.getByRole('button', { name: 'Begin my rookie season', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue story', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Cinematic Career Hub/ }).click();
  await expect(page.locator('.app')).toHaveClass(/theme-cinematic/);
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.choice')).toHaveCount(2);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: `artifacts/native-${position}-story.png`, animations: 'disabled' });
  await page.locator('.choice').first().click();
  await expect(page.locator('.choice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Opponent', exact: true })
    .selectOption('Cincinnati Bengals');
  await page.getByLabel('Your score', { exact: true }).fill('24');
  await page.getByLabel('Opponent score', { exact: true }).fill('17');
  if (position === 'RB') {
    await page.getByLabel('Carries', { exact: true }).fill('18');
    await page.getByLabel('Rushing yards', { exact: true }).fill('102');
    await page.getByLabel('Rushing TDs', { exact: true }).fill('1');
  }
  await page.getByLabel('Targets', { exact: true }).fill('6');
  await page.getByLabel('Receptions', { exact: true }).fill('5');
  await page.getByLabel('Receiving yards', { exact: true }).fill('65');
  await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Player progression', exact: true }).click();
  await page.getByRole('button', { name: `Upgrade ${attribute}`, exact: true }).click();
  await expect(
    page.locator('.action-card').filter({ hasText: 'Reconcile player ratings' }),
  ).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back, Morgan.' })).toBeVisible();
  await expect(page.locator('.app')).toHaveClass(/theme-cinematic/);
  await expect(page.locator('footer')).toContainText('SQLite');
  const state = JSON.parse(
    await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state')),
  );
  const backups = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('list_backups'));
  expect(state.careers[0].player.position).toBe(position);
  expect(state.careers[0].recaps[0].stats.receivingYards).toBe(65);
  expect(state.careers[0].recaps[0].stats.carries).toBe(position === 'RB' ? 18 : 0);
  expect(state.careers[0].ratings[position === 'RB' ? 'carrying' : 'catching']).toBe(
    position === 'RB' ? 78 : 79,
  );
  expect(backups).toHaveLength(10);
  await page.screenshot({ path: `artifacts/native-${position}-hub.png`, animations: 'disabled' });
  await writeFile(
    `artifacts/native-${position}-result.json`,
    JSON.stringify(
      {
        passed: true,
        storage: 'SQLite',
        position,
        receivingYards: 65,
        upgradedAttribute: attribute,
        recoveryPoints: backups.length,
        theme: 'cinematic',
        checkedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(
    `Native ${position} smoke passed: creation, draft, story, recap, upgrade, SQLite reload, ten backups and cinematic settings.`,
  );
} finally {
  await browser.close();
}
