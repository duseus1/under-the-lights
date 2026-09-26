import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

async function fixture(page: Page, game: 'nba2k' | 'madden', coach = 60) {
  const rules = JSON.parse(
    readFileSync(new URL('../../src/data/rules.json', import.meta.url), 'utf8'),
  );
  const a = rules.archetypes.find(
    (a: { id: string }) => a.id === (game === 'nba2k' ? 'floor-general' : 'speed-edge'),
  );
  const at = '2026-09-25T00:00:00Z';
  const c = {
    id: 'achievements-fixture',
    version: 1,
    rulesVersion: 1,
    game,
    seasonGames: 8,
    createdAt: at,
    updatedAt: at,
    player: {
      name: 'Morgan Hayes',
      number: 3,
      position: game === 'nba2k' ? 'PG' : 'EDGE',
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    storyId: game === 'nba2k' ? 'keys-to-offense' : 'rush-hour',
    status: game === 'nba2k' ? 'season' : 'complete',
    checklist: [true, true, true, true],
    draft: {
      team: game === 'nba2k' ? 'Chicago Bulls' : 'Chicago Bears',
      round: 1,
      pick: 10,
      byeWeek: 9,
    },
    ratings: a.ratings,
    ceilings: a.ceilings,
    initialRatings: a.ratings,
    points: 2,
    relationships: { coach, teammate: 60, reputation: 50 },
    role: 'Rookie',
    flags: [],
    promises: [],
    conflicts: [],
    actions: [],
    timeline: [],
    playoffRound: 0,
    ending: game === 'nba2k' ? null : 'Rookie season complete.',
    milestones: [],
    choices: ['arrival', 'response', 'pressure', 'turn', 'finish'].map((eventId) => ({
      eventId,
      choiceId: 'test',
      title: 'Previous decision',
      choice: 'Recorded',
      outcome: 'Resolved',
      at,
    })),
    recaps: Array.from({ length: game === 'nba2k' ? 6 : 18 }, (_, i) => ({
      id: `game-${i}`,
      phase: 'regular',
      week: i + 1,
      opponent: game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
      ownScore: game === 'madden' && i === 8 ? 0 : 100,
      opponentScore: game === 'madden' && i === 8 ? 0 : 90,
      participation: game === 'madden' && i === 8 ? 'bye' : 'played',
      stats:
        game === 'nba2k'
          ? {
              points: 5,
              fieldGoalsMade: 2,
              fieldGoalsAttempted: 4,
              freeThrowsMade: 1,
              freeThrowsAttempted: 1,
            }
          : i === 8
            ? {}
            : { sacks: i === 0 ? 7.5 : 1 },
      note: '',
      reward: 1,
    })),
  };
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Import career file').setInputFiles({
    name: 'awards.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        version: 1,
        careers: [c],
        activeId: c.id,
        settings: { theme: 'broadcast', reducedMotion: false },
      }),
    ),
  });
  await page.getByRole('button', { name: 'Add these careers', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('imported');
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await page.locator('.career-card').first().click();
  await expect(page.getByRole('heading', { name: 'Welcome back, Morgan.' })).toBeVisible();
}
test('NBA tiers, season awards, editable records, reload and both presentations', async ({
  page,
  context,
}) => {
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await fixture(page, 'nba2k');
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Record Rookie of the Year', exact: true }),
  ).toBeDisabled();
  for (const [points, tier] of [
    [15, 'BREAKOUT'],
    [75, 'EXCEPTIONAL'],
  ] as const) {
    await page.getByRole('button', { name: 'Season & games', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Opponent', exact: true })
      .selectOption('Boston Celtics');
    await page.getByLabel('Your score', { exact: true }).fill('120');
    await page.getByLabel('Opponent score', { exact: true }).fill('100');
    await page.getByLabel('Minutes played', { exact: true }).fill('40');
    await page.getByLabel('Points', { exact: true }).fill(String(points));
    await page.getByLabel('Field goals made', { exact: true }).fill(String(Math.floor(points / 2)));
    await page
      .getByLabel('Field goals attempted', { exact: true })
      .fill(String(Math.floor(points / 2)));
    await page.getByLabel('Free throws made', { exact: true }).fill('1');
    await page.getByLabel('Free throws attempted', { exact: true }).fill('1');
    await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
    await page.getByRole('button', { name: 'Open side event', exact: true }).click();
    await expect(page.locator('.side-event .eyebrow')).toContainText(tier);
    await page.getByRole('button', { name: 'Skip this side event', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(page.locator('.tier-badge')).toHaveText(['Exceptional', 'Breakout']);
  await page.getByRole('button', { name: 'Record Rookie of the Year', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, I won this award', exact: true }).click();
  await expect(page.locator('.award-card.earned')).toContainText('Rookie of the Year');
  await expect(page.locator('.achievement-summary')).toContainText('+8');
  await page.getByRole('button', { name: 'Edit regular game points record', exact: true }).click();
  await page.getByLabel('Existing league mark', { exact: true }).fill('70');
  await page.getByLabel('Existing holder / context', { exact: true }).fill('My custom league');
  await page.getByRole('button', { name: 'Save league record', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'My custom league' })).toContainText(
    'Record broken',
  );
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(page.locator('.award-card.earned')).toContainText('Rookie of the Year');
  await expect(
    page.getByRole('button', { name: 'Record Rookie of the Year', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'My custom league' })).toContainText('75');
  await page.screenshot({ path: 'artifacts/awards-records-broadcast.png', fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /Cinematic Career Hub/ }).click();
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await page.screenshot({ path: 'artifacts/awards-records-cinematic.png', fullPage: true });
});
test('coach tiers grant a starter opportunity, confirmed minutes and persistent role', async ({
  page,
}) => {
  await fixture(page, 'nba2k', 80);
  await page.getByRole('button', { name: 'Relationships', exact: true }).click();
  await expect(page.locator('.relationship-card').first()).toContainText('Starter confidence');
  await page.getByRole('button', { name: 'Claim earned coach benefits', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Claim earned coach benefits', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Review playing-time actions', exact: true }).click();
  const action = page.locator('.action-card').filter({ hasText: 'Coach trust unlocked' });
  await expect(action).toHaveCount(1);
  await expect(action).toContainText('30 minutes/game');
  await action.getByRole('button', { name: 'Applied in NBA 2K', exact: true }).click();
  await expect(action.locator('.tag')).toHaveText('completed');
  await page.reload();
  await page.getByRole('button', { name: 'Relationships', exact: true }).click();
  await expect(page.locator('.achievement-section')).toContainText('Starting point guard');
  await expect(page.locator('.achievement-section')).toContainText(
    'Confirmed rotation target: 30 minutes/game',
  );
  await page.screenshot({ path: 'artifacts/relationship-tiers.png', animations: 'disabled' });
});

test('Madden defensive awards and league records use the football career', async ({ page }) => {
  await fixture(page, 'madden');
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Record Offensive Rookie of the Year', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Record Defensive Player of the Year', exact: true })
    .click();
  await page.getByRole('button', { name: 'Yes, I won this award', exact: true }).click();
  await expect(page.locator('.achievement-summary')).toContainText('+10');
  await expect(page.getByRole('row').filter({ hasText: 'Derrick Thomas' })).toContainText(
    'Record broken',
  );
  await page.reload();
  await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
  await expect(page.locator('.award-card.earned')).toContainText('Defensive Player of the Year');
  await page.screenshot({ path: 'artifacts/awards-records-madden.png', fullPage: true });
});
