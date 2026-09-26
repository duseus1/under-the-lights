import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
test('big games offer optional side events, preserve them on reload, and record the chosen response', async ({
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
    recaps: [],
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
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Opponent', exact: true })
    .selectOption('Boston Celtics');
  await page.getByLabel('Your score', { exact: true }).fill('110');
  await page.getByLabel('Opponent score', { exact: true }).fill('100');
  await page.getByLabel('Minutes played', { exact: true }).fill('30');
  await page.getByLabel('Assists', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open side event', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open side event', exact: true }).click();
  await expect(page.locator('.side-event')).toContainText('The microphones are waiting');
  const body = await page.locator('.side-event .dialogue').innerText();
  await page.reload();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.side-event .dialogue')).toHaveText(body);
  await page.screenshot({
    path: 'artifacts/postgame-side-event.png',
    fullPage: true,
    animations: 'disabled',
  });
  // Resolve the main conversation while leaving the optional event pending.
  await page.locator('.conversation .choice').first().click();
  await expect(page.locator('.conversation')).toHaveCount(0);
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Opponent', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open side event', exact: true }).click();
  await page.locator('.side-choice').filter({ hasText: 'Share the credit' }).click();
  await expect(page.locator('.side-event')).toHaveCount(0);
  await page.locator('.side-event-history summary').first().click();
  await expect(page.locator('.side-event-history')).toContainText('Share the credit');
  await page.reload();
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await expect(page.locator('.side-event')).toHaveCount(0);
  await expect(page.locator('.side-event-history')).toBeVisible();
});
