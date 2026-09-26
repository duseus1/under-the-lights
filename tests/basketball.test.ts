import { describe, expect, it } from 'vitest';
import {
  careerSchema,
  emptyStats,
  initialState,
  rules,
  type Career,
  type Recap,
} from '../src/domain/types';
import {
  createCareer,
  recordDraft,
  finishSetup,
  updateChecklist,
  pendingEvent,
  resolveChoice,
  nextGame,
  defaultRecap,
  submitRecap,
  choosePostseason,
  editRecap,
  resolveAction,
  upgrade,
  eventBody,
} from '../src/domain/engine';
import { parseSave } from '../src/storage';
function start(games = 82) {
  const a = rules.archetypes.find((a) => a.id === 'floor-general')!;
  let c = createCareer(
    {
      name: 'Jordan Reed',
      number: 3,
      position: 'PG',
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    'keys-to-offense',
  );
  for (let i = 0; i < 4; i++) c = updateChecklist(c, i, true);
  return recordDraft(
    { ...finishSetup(c), seasonGames: games },
    { team: 'Chicago Bulls', round: 1, pick: 12, byeWeek: 9 },
  );
}
function resolve(c: Career) {
  while (pendingEvent(c)) c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
  return c;
}
function recap(c: Career, win = true): Recap {
  return {
    ...defaultRecap(c),
    opponent: 'Boston Celtics',
    ownScore: win ? 110 : 90,
    opponentScore: 100,
    stats: {
      ...emptyStats,
      minutes: 30,
      points: 22,
      assists: 8,
      rebounds: 4,
      steals: 2,
      fieldGoalsMade: 8,
      fieldGoalsAttempted: 16,
      threePointersMade: 2,
      threePointersAttempted: 6,
      freeThrowsMade: 4,
      freeThrowsAttempted: 4,
    },
  };
}
function season(games = 82) {
  let c = start(games);
  while (c.status === 'season') {
    c = resolve(c);
    c = submitRecap(c, recap(c));
  }
  return resolve(c);
}
describe('NBA 2K point guard career', () => {
  it('plays 82 games with no football weeks and reaches every story event', () => {
    const c = season();
    expect(c.recaps).toHaveLength(82);
    expect(c.recaps.every((r) => r.phase === 'regular' && r.participation === 'played')).toBe(true);
    expect(c.choices).toHaveLength(5);
    expect(c.milestones).toHaveLength(3);
    expect(careerSchema.parse(c)).toEqual(c);
  });
  it('scales the story to an eight-game custom league and does not skip the first appearance', () => {
    let c = resolve(start(8));
    expect(c.choices).toHaveLength(1);
    c = submitRecap(c, recap(c));
    expect(pendingEvent(c)?.id).toBe('response');
    const end = choosePostseason(season(8), 'none');
    expect(end.choices).toHaveLength(5);
    expect(end.ending).toContain('without a postseason');
  });
  it('uses best-of-seven series, survives a loss and resets each new round', () => {
    let c = choosePostseason(season(8), 'wildcard');
    c = submitRecap(c, recap(c, false));
    expect(c.status).toBe('postseason');
    expect(c.seriesLosses).toBe(1);
    for (let i = 0; i < 4; i++) c = submitRecap(c, recap(c));
    expect(c.playoffRound).toBe(2);
    expect(c.seriesWins + c.seriesLosses).toBe(0);
    expect(nextGame(c)?.label).toContain('Conference semifinals');
    while (c.status !== 'complete') c = submitRecap(c, recap(c));
    expect(c.flags).toContain('champion');
    expect(c.recaps.filter((r) => r.phase === 'playoff')).toHaveLength(17);
  });
  it('eliminates only after four losses and preserves resolved results during corrections', () => {
    let c = choosePostseason(season(8), 'wildcard');
    for (let i = 0; i < 4; i++) c = submitRecap(c, recap(c, false));
    expect(c.status).toBe('complete');
    expect(c.flags).not.toContain('champion');
    const last = c.recaps.at(-1)!;
    expect(() => editRecap(c, { ...last, ownScore: 120 })).toThrow('advancement');
    const corrected = editRecap(c, { ...last, note: 'Corrected note' });
    expect(corrected.ending).toBe(c.ending);
    expect(corrected.choices).toEqual(c.choices);
  });
  it('rejects invalid basketball box scores, ties, league opponents and football playoff entry', () => {
    const c = resolve(start());
    const r = recap(c);
    for (const changed of [
      { ...r, ownScore: 100 },
      { ...r, opponent: 'Chicago Bears' },
      { ...r, stats: { ...r.stats, points: 23 } },
      { ...r, stats: { ...r.stats, threePointersMade: 9 } },
      { ...r, participation: 'injured' as const },
    ])
      expect(() => submitRecap(c, changed)).toThrow();
    expect(() => choosePostseason(season(8), 'divisional')).toThrow('first round');
  });
  it('tracks assists promises and pauses them for a missed game', () => {
    let c = resolve(start());
    c.promises = [
      {
        id: 'promise',
        label: '24 assists',
        metric: 'assists',
        target: 24,
        progress: 0,
        remaining: 3,
        status: 'active',
      },
    ];
    c = submitRecap(c, { ...recap(c), participation: 'injured', stats: { ...emptyStats } });
    expect(c.promises[0].remaining).toBe(3);
    for (let i = 0; i < 3; i++) {
      c = resolve(c);
      c = submitRecap(c, recap(c));
    }
    expect(c.promises[0].status).toBe('kept');
    expect(eventBody(c)).not.toContain('Madden');
  });
  it('keeps NBA trades unresolved until actual completion and validates the destination league', () => {
    let c = start(8);
    while (pendingEvent(c)?.id !== 'turn') {
      const e = pendingEvent(c);
      c = e ? resolveChoice(c, e.choices[0].id) : submitRecap(c, recap(c));
    }
    c = resolveChoice(c, 'trade');
    const a = c.actions.at(-1)!;
    expect(c.draft?.team).toBe('Chicago Bulls');
    expect(() => resolveAction(c, a.id, 'completed', 'Chicago Bears')).toThrow();
    const unavailable = resolveAction(c, a.id, 'unavailable');
    expect(unavailable.draft?.team).toBe('Chicago Bulls');
    expect(eventBody(unavailable)).not.toContain('Madden');
    c = resolveAction(c, a.id, 'completed', 'Miami Heat');
    expect(c.draft?.team).toBe('Miami Heat');
  });
  it('migrates older Madden saves and preserves independent mixed-game saves', () => {
    const pg = start();
    const a = rules.archetypes[0];
    const nfl = createCareer(
      {
        name: 'Alex Carter',
        number: 7,
        position: 'QB',
        archetype: a.id,
        height: a.height,
        weight: a.weight,
        development: 'Normal',
        allocations: {},
      },
      'succession',
    );
    const old = JSON.parse(JSON.stringify(nfl));
    delete old.game;
    delete old.seasonGames;
    delete old.seriesWins;
    delete old.seriesLosses;
    const state = parseSave(
      JSON.stringify({ ...initialState, careers: [old, pg], activeId: pg.id }),
    );
    expect(state.careers.map((c) => c.game)).toEqual(['madden', 'nba2k']);
    const before = structuredClone(state.careers[0]);
    pg.points = 3;
    const changed = upgrade(pg, 'ballHandle');
    expect(changed.actions[0].detail).toContain('NBA 2K');
    expect(state.careers[0]).toEqual(before);
    expect(() => careerSchema.parse({ ...pg, game: 'madden' })).toThrow();
  });
});
