import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
test('NBA 2K onboarding, full point guard season, playoffs, progression and mixed-game library', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose your game.' })).toBeVisible();
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({
    path: 'artifacts/choose-game.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'NBA 2K', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'PG Point Guard', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'QB Quarterback', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Development trait')).toHaveCount(0);
  await page.getByLabel('Player name').fill('Jordan Reed');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.archetype-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Increase Ball handle', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.locator('.story-option')).toHaveCount(1);
  await page.getByRole('button', { name: 'Create my career', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Jordan.' })).toBeVisible();
  for (const box of await page.locator('.setup-list input').all()) {
    await box.click();
    await expect(box).toBeChecked();
  }
  await page.getByRole('button', { name: 'Ready for the draft', exact: true }).click();
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page.getByLabel('Drafted by').selectOption('Chicago Bulls');
  await page.getByLabel('Overall pick').fill('12');
  await expect(page.getByLabel('Regular-season games')).toHaveValue('82');
  await page.getByRole('button', { name: 'Begin my rookie season', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continue story', exact: true })).toBeVisible();
  const resolveStory = async () => {
    await page.getByRole('button', { name: 'Continue story', exact: true }).click();
    await page.locator('.choice').first().click();
    await expect(page.locator('.choice')).toHaveCount(0);
    await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  };
  const play = async () => {
    await page
      .getByRole('combobox', { name: 'Opponent', exact: true })
      .selectOption('Boston Celtics');
    for (const [label, value] of Object.entries({
      'Your score': '110',
      'Opponent score': '100',
      'Minutes played': '30',
      Points: '20',
      Assists: '8',
      Rebounds: '4',
      Steals: '2',
      'Field goals made': '8',
      'Field goals attempted': '15',
      'Three-pointers made': '2',
      'Three-pointers attempted': '5',
      'Free throws made': '2',
      'Free throws attempted': '2',
    }))
      await page.getByLabel(label, { exact: true }).fill(value);
    await expect(page.locator('.reward-breakdown')).toContainText(
      'Estimated game reward: +4 points',
    );
    await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
  };
  for (let i = 0; i < 82; i++) {
    if (await page.getByRole('button', { name: 'Continue story', exact: true }).isVisible())
      await resolveStory();
    await play();
    await expect(page.locator('tbody tr')).toHaveCount(i + 1);
  }
  await expect(page.getByRole('button', { name: 'First-round bye', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Qualified for playoffs', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Opponent', exact: true })).toBeVisible();
  for (let i = 0; i < 16; i++) {
    await play();
    await expect(page.locator('tbody tr')).toHaveCount(83 + i);
  }
  await page.getByRole('button', { name: 'View retrospective', exact: true }).click();
  await expect(page.locator('.retrospective')).toContainText('championship');
  await expect(page.locator('.decision-history .panel')).toHaveCount(5);
  await page.reload();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.retrospective')).toContainText('82–0');
  await page.getByRole('button', { name: 'Player progression', exact: true }).click();
  await page.getByRole('button', { name: 'Upgrade Ball handle', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your NBA 2K notebook' })).toBeVisible();
  await page.getByRole('button', { name: 'Career hub', exact: true }).click();
  await page.screenshot({
    path: 'artifacts/nba-career-hub.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await page.getByRole('button', { name: 'New career', exact: true }).click();
  await page.getByRole('button', { name: 'Madden', exact: true }).click();
  await page.getByLabel('Player name').fill('Alex Carter');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Create my career', exact: true }).click();
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await expect(page.locator('.career-card')).toHaveCount(2);
  await page.getByRole('button', { name: /NBA 2K.*PG.*Jordan Reed/ }).click();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.retrospective')).toContainText('82–0');
  expect(errors).toEqual([]);
});
