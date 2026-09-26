import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('recorded stats change offline dialogue and completed transcripts survive corrections', async ({
  page,
  context,
}) => {
  const rules = JSON.parse(
    readFileSync(new URL('../../src/data/rules.json', import.meta.url), 'utf8'),
  );
  const build = rules.archetypes.find((a: { id: string }) => a.id === 'floor-general');
  const at = '2026-09-25T00:00:00.000Z';
  const c = {
    id: 'performance-fixture',
    version: 1,
    rulesVersion: 1,
    game: 'nba2k',
    createdAt: at,
    updatedAt: at,
    player: {
      name: 'Casey Morgan',
      number: 3,
      position: 'PG',
      archetype: 'floor-general',
      height: 75,
      weight: 195,
      development: 'Normal',
      allocations: {},
    },
    storyId: 'keys-to-offense',
    status: 'season',
    checklist: [true, true, true, true],
    draft: { team: 'Chicago Bulls', round: 1, pick: 10, byeWeek: 9 },
    ratings: build.ratings,
    ceilings: build.ceilings,
    initialRatings: build.ratings,
    points: 2,
    relationships: { coach: 62, teammate: 56, reputation: 47 },
    role: 'Rookie floor general',
    flags: ['learn-first'],
    promises: [],
    conflicts: [],
    actions: [],
    timeline: [],
    playoffRound: 0,
    ending: null,
    milestones: [],
    choices: [
      {
        eventId: 'arrival',
        choiceId: 'learn',
        title: 'One ball, two timelines',
        choice: 'Learn how this team plays',
        outcome: 'The veteran offers a place in film sessions.',
        at,
      },
    ],
    recaps: [
      {
        id: 'game-one',
        phase: 'regular',
        week: 1,
        opponent: 'Boston Celtics',
        ownScore: 110,
        opponentScore: 100,
        participation: 'played',
        stats: { minutes: 30, assists: 10, turnovers: 1 },
        note: '',
        reward: 2,
        edited: false,
      },
    ],
  };
  const initialState = { version: 1, settings: { theme: 'broadcast', reducedMotion: false } };
  await context.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Import career file').setInputFiles({
    name: 'performance.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ ...initialState, careers: [c], activeId: c.id })),
  });
  await page.getByRole('button', { name: 'Add these careers', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('imported');
  await page.getByRole('button', { name: 'My careers', exact: false }).click();
  await page.locator('.career-card').first().click();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.conversation .dialogue')).toContainText('creating baskets');
  await page.getByText('Why this conversation?', { exact: true }).click();
  await expect(page.locator('.conversation')).toContainText('Making teammates better');
  const correct = async (turnovers: string) => {
    await page.getByRole('button', { name: 'Season & games', exact: true }).click();
    await page.getByRole('button', { name: 'Edit regular 1', exact: true }).click();
    await page.getByLabel('Turnovers', { exact: true }).fill(turnovers);
    await page.getByRole('button', { name: 'Save correction', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save correction', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Your story', exact: true }).click();
  };
  await correct('5');
  await expect(page.locator('.conversation .dialogue')).toContainText('too many turnovers');
  const shown = await page.locator('.conversation .dialogue').innerText();
  await page.screenshot({
    path: 'artifacts/performance-conversation.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.choice').first().click();
  await expect(page.locator('.choice')).toHaveCount(0);
  await correct('0');
  await page.reload();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await page.getByText('Read the conversation', { exact: true }).first().click();
  await expect(page.locator('.decision-history .panel').first().locator('.dialogue')).toHaveText(
    shown,
  );
  await expect(page.locator('.decision-history .panel').first()).toContainText(
    'Protect the possession',
  );
});
