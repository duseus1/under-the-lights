// Launch the built app with isolated UNDER_THE_LIGHTS_DATA_DIR and WebView2 CDP port 9233.
import { chromium, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9233');
try {
  const page = browser.contexts()[0].pages()[0];
  await page.waitForLoadState('domcontentloaded');
  const rules = JSON.parse(readFileSync('src/data/rules.json', 'utf8'));
  const a = rules.archetypes.find(a => a.id === 'floor-general');
  const at = new Date().toISOString();
  const c = {
    id: 'native-memory', version: 1, rulesVersion: 1, game: 'nba2k', seasonGames: 8,
    createdAt: at, updatedAt: at, status: 'season',
    player: { name: 'Native Memory', number: 4, position: 'PG', archetype: a.id, height: a.height, weight: a.weight, development: 'Normal', allocations: {} },
    storyId: 'keys-to-offense', checklist: [true, true, true, true],
    draft: { team: 'Chicago Bulls', round: 1, pick: 10, byeWeek: 9 },
    ratings: a.ratings, initialRatings: a.ratings, ceilings: a.ceilings, points: 10,
    relationships: { coach: 50, teammate: 50, reputation: 40 }, role: 'Rookie',
    flags: [], promises: [], conflicts: [], actions: [], timeline: [], recaps: [],
    choices: ['arrival', 'response', 'pressure', 'turn', 'finish'].map(eventId => ({ eventId, choiceId: 'learn', title: 'Earlier choice', choice: 'Learn', outcome: 'Prepared', at })),
    playoffRound: 0, ending: null, milestones: [],
  };
  const state = { version: 1, careers: [c], activeId: c.id, settings: { theme: 'broadcast', reducedMotion: true } };
  await page.evaluate(data => window.__TAURI_INTERNALS__.invoke('save_state', { data }), JSON.stringify(state));
  await page.reload();
  await page.getByRole('button', { name: 'Season & games', exact: true }).click();
  await page.getByRole('combobox', { name: 'Opponent', exact: true }).selectOption('Boston Celtics');
  await page.getByLabel('Your score', { exact: true }).fill('100');
  await page.getByLabel('Opponent score', { exact: true }).fill('90');
  await page.getByLabel('Game title').fill('Native checkpoint');
  await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo last check-in', exact: true })).toBeVisible();
  const load = async () => JSON.parse(await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('load_state'))).careers[0];
  let saved = await load();
  expect(saved.undo.before).toBeTruthy();
  expect(saved.recaps[0].team).toBe('Chicago Bulls');
  expect(saved.recaps[0].title).toBe('Native checkpoint');
  await page.reload();
  await page.getByRole('button', { name: 'Undo last check-in', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm undo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo last check-in', exact: true })).toHaveCount(0);
  saved = await load();
  expect(saved.recaps).toHaveLength(0);
  expect(saved.points).toBe(10);
  await page.getByRole('button', { name: 'Your story', exact: true }).click();
  await page.getByRole('button', { name: 'Remember Earlier choice', exact: true }).first().click();
  await page.reload();
  await page.getByRole('button', { name: 'Career timeline', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Earlier choice', exact: true })).toBeVisible();
  saved = await load();
  expect(saved.moments).toHaveLength(1);
  console.log('Native SQLite passed: checkpoint, reload, full undo, team/title persistence, and remembered moment.');
} finally { await browser.close(); }
