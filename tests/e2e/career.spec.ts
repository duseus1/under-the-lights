import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import type { Position } from '../../src/domain/types';
import { positions } from '../../src/data/positions';

async function createPlayer(page: Page, position: Position) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Madden', exact: true }).click();
  await page.getByLabel('Player name').fill(position === 'QB' ? 'Alex Carter' : 'Jordan Brooks');
  if (position !== 'QB')
    await page
      .getByRole('button', {
        name: `${position} ${positions.find((p) => p.id === position)!.name}`,
        exact: true,
      })
      .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('button', {
      name:
        position === 'QB'
          ? 'Increase Short accuracy'
          : position === 'WR' || position === 'TE'
            ? 'Increase Catching'
            : position === 'RB'
              ? 'Increase Carrying'
              : 'Increase Tackling',
      exact: true,
    })
    .click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my career' }).click();
  await expect(
    page.getByRole('heading', {
      name: position === 'QB' ? 'Welcome back, Alex.' : 'Welcome back, Jordan.',
    }),
  ).toBeVisible();
  for (const box of await page.locator('.setup-list input').all()) {
    await box.click();
    await expect(box).toBeChecked();
  }
  await page.getByRole('button', { name: 'Ready for the draft' }).click();
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page.getByLabel('Drafted by').selectOption('Chicago Bears');
  await page.getByLabel('Round', { exact: true }).fill('3');
  await page.getByLabel('Overall pick').fill('70');
  await page.getByRole('button', { name: 'Begin my rookie season' }).click();
  await expect(page.getByRole('button', { name: 'Continue story', exact: true })).toBeVisible();
}
async function resolveStory(page: Page) {
  await page.getByRole('button', { name: 'Continue story', exact: true }).click();
  await expect(page.locator('.choice').first()).toBeVisible();
  await page.locator('.choice').first().click();
  await expect(page.locator('.choice')).toHaveCount(0);
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
}
for (const position of ['QB', 'WR', 'S', 'LB', 'EDGE', 'RB', 'TE'] as const)
  test(`${position}: create, play a complete rookie season, reload and preserve ending`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await createPlayer(page, position);
    for (let i = 0; i < 21; i++) {
      if (await page.getByRole('button', { name: 'Continue story', exact: true }).isVisible())
        await resolveStory(page);
      if (await page.getByRole('button', { name: 'Record bye week', exact: true }).isVisible())
        await page.getByRole('button', { name: 'Record bye week', exact: true }).click();
      else {
        await page
          .getByRole('combobox', { name: 'Opponent', exact: true })
          .selectOption('Green Bay Packers');
        await page.getByLabel('Your score', { exact: true }).fill('28');
        await page.getByLabel('Opponent score', { exact: true }).fill('17');
        if (position === 'QB') {
          await page.getByLabel('Pass attempts', { exact: true }).fill('30');
          await page.getByLabel('Completions', { exact: true }).fill('22');
          await page.getByLabel('Passing yards', { exact: true }).fill('280');
          await page.getByLabel('Passing TDs', { exact: true }).fill('2');
        } else if (position === 'WR' || position === 'TE') {
          await page.getByLabel('Targets', { exact: true }).fill('10');
          await page.getByLabel('Receptions', { exact: true }).fill('7');
          await page.getByLabel('Receiving yards', { exact: true }).fill('95');
          await page.getByLabel('Receiving TDs', { exact: true }).fill('1');
        } else if (position === 'RB') {
          await page.getByLabel('Carries', { exact: true }).fill('20');
          await page.getByLabel('Rushing yards', { exact: true }).fill('110');
          await page.getByLabel('Rushing TDs', { exact: true }).fill('1');
        } else {
          await page.getByLabel('Total tackles', { exact: true }).fill('8');
          await page.getByLabel('Tackles for loss', { exact: true }).fill('2');
          await page.getByLabel('Sacks', { exact: true }).fill('1.5');
          await page.getByLabel('Interceptions made', { exact: true }).fill('1');
          await page.getByLabel('Pass deflections', { exact: true }).fill('2');
          await page.getByLabel('Defensive snaps', { exact: true }).fill('55');
        }
        await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
      }
      await expect(page.locator('tbody tr')).toHaveCount(i + 1);
    }
    await page.getByRole('button', { name: 'Season ended', exact: true }).click();
    await page.getByRole('button', { name: 'View retrospective', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'You wrote this one.' })).toBeVisible();
    await expect(page.locator('.retrospective')).toContainText('17–0');
    await expect(page.locator('.decision-history .panel')).toHaveCount(5);
    await page.reload();
    await page.getByRole('button', { name: 'Your story', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'You wrote this one.' })).toBeVisible();
    await page.getByRole('button', { name: 'Player progression', exact: true }).click();
    await page
      .getByRole('button', {
        name:
          position === 'QB'
            ? 'Upgrade Short accuracy'
            : position === 'WR' || position === 'TE'
              ? 'Upgrade Catching'
              : position === 'RB'
                ? 'Upgrade Carrying'
                : 'Upgrade Tackling',
        exact: true,
      })
      .click();
    await expect(
      page.locator('.action-card').filter({ hasText: 'Reconcile player ratings' }),
    ).toHaveCount(1);
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
test('presentation, offline reload, export/import, recovery and keyboard access', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await mkdir('artifacts', { recursive: true });
  await expect(
    page.getByRole('heading', { name: 'The game is theirs. The story is yours.' }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'artifacts/welcome.png', fullPage: true, animations: 'disabled' });
  await createPlayer(page, 'QB');
  await resolveStory(page);
  await page.getByRole('button', { name: 'Career hub', exact: true }).click();
  await page.screenshot({
    path: 'artifacts/career-hub.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Cinematic Career Hub/ }).click();
  await expect(page.locator('.app')).toHaveClass(/theme-cinematic/);
  await page.getByLabel('Reduce motion').click();
  await expect(page.locator('.app')).toHaveClass(/reduce-motion/);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all careers' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByLabel('Import career file').setInputFiles(path!);
  await page.getByRole('button', { name: 'Add these careers' }).click();
  await expect(page.getByRole('status')).toContainText('imported');
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await expect(page.locator('.career-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('.backup-list>div')).toHaveCount(10);
  await page.getByRole('button', { name: 'Restore', exact: true }).first().click();
  await page.getByRole('button', { name: 'Restore snapshot' }).click();
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await expect(page.locator('.career-card')).toHaveCount(1);
  // The preview server remains reachable; all external network access is blocked.
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome back, Alex.' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Reduce motion')).toBeChecked();
  await expect(page.locator('.app')).toHaveClass(/theme-cinematic/);
  await page.getByRole('button', { name: /Sports Broadcast/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.app')).toHaveClass(/theme-broadcast/);
  await page.setViewportSize({ width: 960, height: 700 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'artifacts/settings-960.png', fullPage: true });
});
test('malformed import is rejected without changing the career library', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Import career file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('not a valid version 1');
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await expect(page.locator('.career-card')).toHaveCount(0);
});
