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
const position = 'PG';

const attribute = 'Ball handle';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9227');
try {
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'NBA 2K', exact: true }).click();
  await page.getByLabel('Player name').fill('Morgan Hayes');
  await page.getByLabel('Jersey number').fill('94');
  await page
    .getByRole('button', {
      name: 'PG Point Guard',
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
  await page.getByLabel('Drafted by').selectOption('Chicago Bulls');
  await page.getByLabel('Round', { exact: true }).fill('1');
  await page.getByLabel('Overall pick').fill('12');
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
    .selectOption('Boston Celtics');
  await page.getByLabel('Your score', { exact: true }).fill('110');
  await page.getByLabel('Opponent score', { exact: true }).fill('100');
  for (const [label, value] of Object.entries({
    'Minutes played': '30',
    Points: '20',
    Assists: '15',
    'Field goals made': '8',
    'Field goals attempted': '15',
    'Three-pointers made': '2',
    'Three-pointers attempted': '5',
    'Free throws made': '2',
    'Free throws attempted': '2',
  }))
    await page.getByLabel(label, { exact: true }).fill(value);
  await expect(page.locator('.reward-breakdown')).toContainText('Estimated game reward: +5 points');
  await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.side-event')).toContainText('The microphones are waiting');
  await page.screenshot({
    path: 'artifacts/native-side-event.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.side-choice').first().click();
  await expect(page.locator('.side-event')).toHaveCount(0);
  await expect(page.locator('.conversation .dialogue')).toContainText('creating baskets');
  await page.getByText('Why this conversation?', { exact: true }).click();
  await expect(page.locator('.conversation')).toContainText('Making teammates better');
  await page.screenshot({
    path: 'artifacts/native-performance-conversation.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.choice').first().click();
  await expect(page.locator('.choice')).toHaveCount(0);
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
  expect(state.careers[0].recaps[0].stats.points).toBe(20);
  expect(state.careers[0].recaps[0].stats.assists).toBe(15);
  expect(state.careers[0].game).toBe('nba2k');
  expect(state.careers[0].sideEvents[0].status).toBe('resolved');
  expect(state.careers[0].sideEvents[0].choiceId).toBe('credit');
  expect(state.careers[0].recaps[0].reward).toBe(5);
  expect(state.careers[0].recaps[0].rewardBreakdown.total).toBe(5);
  expect(state.careers[0].points).toBe(3);
  expect(state.careers[0].choices[1].performance.branchId).toBe('PG:creator');
  expect(state.careers[0].choices[1].dialogue).toContain('creating baskets');
  expect(state.careers[0].ratings.ballHandle).toBe(84);
  expect(backups).toHaveLength(10);
  await page.screenshot({ path: `artifacts/native-${position}-hub.png`, animations: 'disabled' });
  await writeFile(
    'artifacts/native-side-event-result.json',
    JSON.stringify(
      {
        passed: true,
        storage: 'SQLite',
        position,
        performanceBranch: state.careers[0].choices[1].performance.branchId,
        awardedPoints: state.careers[0].recaps[0].reward,
        remainingDevelopmentPoints: state.careers[0].points,
        points: 20,
        assists: 15,
        sideEvent: state.careers[0].sideEvents[0].title,
        sideEventStatus: state.careers[0].sideEvents[0].status,
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
