import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Archetype } from '../../src/domain/types';

for (const game of ['nba2k', 'madden'] as const)
  test(`${game}: snapshot, team history, correction preview, bookmarks and undo survive reload`, async ({
    page,
  }) => {
    const rules = JSON.parse(
      readFileSync(new URL('../../src/data/rules.json', import.meta.url), 'utf8'),
    );
    const a = (rules.archetypes as Archetype[]).find(
      (a) => a.position === (game === 'nba2k' ? 'PG' : 'QB'),
    )!;
    const at = '2026-09-26T00:00:00Z';
    const c = {
      id: 'memory-fixture',
      version: 1,
      rulesVersion: 1,
      game,
      status: 'season',
      seasonGames: 8,
      createdAt: at,
      updatedAt: at,
      player: {
        name: 'Taylor James',
        number: 4,
        position: game === 'nba2k' ? 'PG' : 'QB',
        archetype: a.id,
        height: a.height,
        weight: a.weight,
        development: 'Normal',
        allocations: {},
      },
      storyId: game === 'nba2k' ? 'keys-to-offense' : 'succession',
      draft: {
        team: game === 'nba2k' ? 'Chicago Bulls' : 'Chicago Bears',
        round: 1,
        pick: 10,
        byeWeek: 9,
      },
      checklist: [true, true, true, true],
      ratings: a.ratings,
      initialRatings: a.ratings,
      ceilings: a.ceilings,
      points: 10,
      relationships: { coach: 50, teammate: 50, reputation: 40 },
      role: 'Rookie',
      flags: [],
      promises: [],
      conflicts: [],
      actions: [],
      timeline: [],
      playoffRound: 0,
      ending: null,
      milestones: [],
      choices: ['arrival', 'response', 'pressure', 'turn', 'finish'].map((eventId) => ({
        eventId,
        choiceId: 'learn',
        title: 'Previous chapter',
        choice: 'Learn together',
        outcome: 'Team first',
        at,
      })),
      recaps: Array.from({ length: 6 }, (_, i) => ({
        id: `g${i}`,
        phase: game === 'madden' && i < 3 ? 'preseason' : 'regular',
        week: game === 'madden' && i >= 3 ? i - 2 : i + 1,
        opponent: game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
        participation: 'played',
        ownScore: 100,
        opponentScore: 90,
        stats: {},
        note: '',
        reward: 1,
        edited: false,
      })),
    };
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
      .getByLabel('Import career file')
      .setInputFiles({
        name: 'memory.json',
        mimeType: 'application/json',
        buffer: Buffer.from(
          JSON.stringify({
            version: 1,
            settings: { theme: 'broadcast', reducedMotion: false },
            careers: [c],
            activeId: c.id,
          }),
        ),
      });
    await page.getByRole('button', { name: 'Add these careers', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('imported');
    await page.getByRole('button', { name: 'Career snapshot', exact: true }).click();
    await expect(page.getByRole('heading', { name: '#4 Taylor James' })).toBeVisible();
    await expect(page.getByText('COLD', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Awards & records', exact: true }).click();
    await page.getByRole('button', { name: 'Add franchise record' }).click();
    await page
      .getByRole('combobox', { name: 'Record category', exact: true })
      .selectOption('rookie');
    await page
      .getByLabel('Existing league mark', { exact: true })
      .fill(game === 'nba2k' ? '50' : '300');
    await page
      .getByLabel('Existing holder / context', { exact: true })
      .fill('Team rookie baseline');
    await page.getByRole('button', { name: 'Save franchise record' }).click();
    await page.getByRole('button', { name: 'Close editor' }).click();
    const enterGame = async () => {
      await page.getByRole('button', { name: 'Season & games', exact: true }).click();
      await page
        .getByRole('combobox', { name: 'Opponent', exact: true })
        .selectOption(game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers');
      await page.getByLabel('Your score', { exact: true }).fill('120');
      await page.getByLabel('Opponent score', { exact: true }).fill('100');
      if (game === 'nba2k') {
        await page.getByLabel('Points', { exact: true }).fill('54');
        await page.getByLabel('Field goals made', { exact: true }).fill('27');
        await page.getByLabel('Field goals attempted', { exact: true }).fill('30');
      } else await page.getByLabel('Passing yards', { exact: true }).fill('350');
      await page.getByLabel('Game title').fill('The comeback');
      await page.getByLabel('Your notes').fill('Down late. Found a way.');
      await page.getByRole('button', { name: 'Save game recap', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Undo last check-in', exact: true }),
      ).toBeVisible();
    };
    await enterGame();
    await page.reload();
    await page.getByRole('button', { name: 'Undo last check-in', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm undo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo last check-in', exact: true })).toHaveCount(
      0,
    );
    await enterGame();
    await page.getByRole('button', { name: 'Your story', exact: true }).click();
    await expect(page.locator('.side-event').first()).toContainText('HISTORIC');
    await page.getByRole('button', { name: 'Season & games', exact: true }).click();
    await page.getByRole('button', { name: 'Remember The comeback', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Undo last check-in', exact: true })).toHaveCount(
      0,
    );
    await page
      .getByRole('button', { name: `Edit regular ${game === 'nba2k' ? 7 : 4}`, exact: true })
      .click();
    await page
      .getByLabel(game === 'nba2k' ? 'Assists' : 'Passing yards', { exact: true })
      .fill(game === 'nba2k' ? '9' : '375');
    await page.getByRole('button', { name: 'Save correction', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Correction preview' })).toContainText(
      'unchanged',
    );
    await page.getByRole('button', { name: 'Confirm correction', exact: true }).click();
    await page.getByRole('button', { name: 'Career timeline', exact: true }).click();
    await expect(page.getByRole('heading', { name: '★ Remembered moments' })).toBeVisible();
    await expect(page.getByText('Down late. Found a way.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: /Cinematic Career Hub/ }).click();
    await expect(page.locator('.app')).toHaveClass(/theme-cinematic/);
    await page.getByRole('checkbox').first().click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    await page.getByRole('button', { name: 'Career snapshot', exact: true }).click();
    await expect(page.locator('.page-enter')).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: `artifacts/${game}-career-snapshot.png`,
      fullPage: true,
      animations: 'disabled',
    });
    await page.reload();
    await page.getByRole('button', { name: 'Career timeline', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Forget The comeback', exact: true }),
    ).toBeVisible();
  });
