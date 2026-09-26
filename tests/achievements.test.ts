import { describe, it, expect } from 'vitest';
import {
  createCareer,
  submitRecap,
  defaultRecap,
  pendingEvent,
  resolveChoice,
  editRecap,
} from '../src/domain/engine';
import {
  availableAwards,
  recordAward,
  awardsUnlocked,
  performanceTier,
  setLeagueRecord,
  leagueBook,
  recordValue,
} from '../src/domain/achievements';
import {
  careerSchema,
  rules,
  emptyStats,
  type Career,
  type Position,
  type Recap,
  type Stats,
} from '../src/domain/types';
import { positions } from '../src/data/positions';
import { resolveSideEvent } from '../src/domain/side-events';

function career(p: Position = 'PG') {
  const d = positions.find((x) => x.id === p)!;
  const a = rules.archetypes.find((x) => x.id === d.archetype)!;
  const c = createCareer(
    {
      name: 'Test Player',
      number: 3,
      position: p,
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    d.story,
  );
  c.status = 'season';
  c.checklist = [true, true, true, true];
  c.draft = {
    team: p === 'PG' ? 'Chicago Bulls' : 'Chicago Bears',
    round: 1,
    pick: 10,
    byeWeek: 9,
  };
  return c;
}
function recap(stats: Partial<Stats> = {}, phase: Recap['phase'] = 'regular'): Recap {
  return {
    id: crypto.randomUUID(),
    phase,
    week: 1,
    opponent: 'Boston Celtics',
    ownScore: 150,
    opponentScore: 100,
    participation: 'played',
    stats: { ...emptyStats, ...stats },
    note: '',
    reward: 0,
    edited: false,
  };
}
function points(n: number) {
  return {
    points: n,
    fieldGoalsMade: Math.floor(n / 2),
    fieldGoalsAttempted: Math.floor(n / 2),
    freeThrowsMade: n % 2,
    freeThrowsAttempted: n % 2,
  };
}
function play(c: Career, s: Partial<Stats>) {
  while (pendingEvent(c)) c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
  return submitRecap(c, {
    ...defaultRecap(c),
    opponent: c.game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
    ownScore: 150,
    opponentScore: 100,
    stats: { ...emptyStats, ...s },
  });
}
describe('four performance calibers and awards', () => {
  it.each([
    [5, 15, 'breakout'],
    [20, 45, 'standout'],
    [20, 75, 'exceptional'],
    [20, 101, 'historic'],
  ] as const)('average %s then %s earns %s', (avg, value, tier) => {
    const c = career();
    c.recaps = Array.from({ length: 3 }, () => recap(points(avg)));
    expect(performanceTier(c, recap(points(value)))?.tier).toBe(tier);
  });
  it('requires enough prior played games, excludes other phases, and does not include the current game in its baseline', () => {
    const c = career(),
      r = recap(points(15));
    c.recaps = [recap(points(5)), recap(points(5))];
    expect(performanceTier(c, r)).toBeUndefined();
    c.recaps.push({ ...recap(), participation: 'injured' }, recap(points(5), 'preseason'));
    expect(performanceTier(c, r)).toBeUndefined();
    c.recaps.push(recap(points(5)), r);
    expect(performanceTier(c, r)?.evidence).toContain('Prior average: 5.0 across 3');
    expect(performanceTier(c, { ...r, participation: 'inactive' })).toBeUndefined();
  });
  it.each([
    ['QB', 'passingYards', 100, 200, 400, 500],
    ['WR', 'receivingYards', 25, 75, 180, 250],
    ['TE', 'receivingYards', 20, 60, 125, 200],
    ['RB', 'rushingYards', 40, 100, 200, 275],
    ['S', 'tackles', 3, 8, 14, 20],
    ['LB', 'tackles', 4, 10, 18, 25],
    ['EDGE', 'sacks', 0.5, 2, 3, 5],
  ] as [Position, keyof Stats, number, number, number, number][])(
    '%s has position-aware breakout, standout and exceptional thresholds',
    (position, metric, avg, b, s, e) => {
      const c = career(position);
      c.recaps = Array.from({ length: 3 }, () => recap({ [metric]: avg }));
      for (const [value, tier] of [
        [b, 'breakout'],
        [s, 'standout'],
        [e, 'exceptional'],
      ] as const)
        expect(performanceTier(c, recap({ [metric]: value }))?.tier).toBe(tier);
    },
  );
  it('requires beating, not tying, a record, tracks new marks, and keeps phases separate', () => {
    const c = career();
    expect(performanceTier(c, recap(points(100)))?.tier).toBe('exceptional');
    c.recaps = [recap(points(110))];
    expect(performanceTier(c, recap(points(105)))?.tier).toBe('exceptional');
    expect(performanceTier(c, recap(points(111)))?.tier).toBe('historic');
    expect(performanceTier(c, recap(points(111), 'playoff'))?.tier).toBe('exceptional');
  });
  it.each([
    ['QB', 'passingYards', 555],
    ['WR', 'receivingYards', 337],
    ['RB', 'rushingYards', 297],
    ['TE', 'receivingYards', 337],
    ['S', 'defensiveInterceptions', 5],
    ['LB', 'sacks', 7.5],
    ['EDGE', 'sacks', 7.5],
  ] as [Position, keyof Stats, number][])(
    '%s can break a seeded league record',
    (p, metric, value) =>
      expect(performanceTier(career(p), recap({ [metric]: value }))?.tier).toBe('historic'),
  );
  it('allows custom season and postseason records without changing another save', () => {
    const original = career();
    let c = setLeagueRecord(original, {
      metric: 'assists',
      phase: 'regular',
      scope: 'season',
      value: 20,
      holder: 'My league',
    });
    c.recaps = [recap({ assists: 10 }), recap({ assists: 10 })];
    expect(performanceTier(c, recap({ assists: 1 }))?.tier).toBe('historic');
    c.recaps.push(recap({ assists: 1 }));
    expect(performanceTier(c, recap({ assists: 1 }))).toBeUndefined();
    c = setLeagueRecord(c, {
      metric: 'points',
      phase: 'playoff',
      scope: 'game',
      value: 63,
      holder: 'Playoff book',
    });
    expect(performanceTier(c, recap(points(64), 'playoff'))?.tier).toBe('historic');
    expect(original.recordBook).toEqual([]);
  });
  it('queues exceptional and historic conversations during cooldown, with stable history on correction and reload', () => {
    let c = play(career(), points(40));
    c = play(c, points(75));
    c = play(c, points(101));
    expect(c.sideEvents.map((e) => e.tier)).toEqual(['standout', 'exceptional', 'historic']);
    const snapshot = structuredClone(c.sideEvents),
      highlight = c.recaps[2].highlight;
    c = editRecap(c, { ...c.recaps[2], stats: { ...emptyStats, ...points(10) } });
    expect(c.sideEvents).toEqual(snapshot);
    expect(c.recaps[2].highlight).toEqual(highlight);
    expect(
      recordValue(
        c.recaps,
        leagueBook(c).find((r) => r.metric === 'points')!,
      ),
    ).toBe(75);
    c = careerSchema.parse(JSON.parse(JSON.stringify(c)));
    c = resolveSideEvent(c, c.sideEvents[0].id, null);
    expect(c.sideEvents.filter((e) => e.status === 'pending')).toHaveLength(2);
  });
  it('records highlights even when a normal side event is suppressed', () => {
    let c = play(career(), { assists: 15 });
    c = play(c, { assists: 15 });
    expect(c.sideEvents).toHaveLength(1);
    expect(c.recaps[1].highlight?.tier).toBe('standout');
  });
  it.each(['PG', 'QB', 'LB'] as Position[])(
    '%s unlocks awards after regular season, pays once and preserves the ledger on reload',
    (p) => {
      let c = career(p);
      expect(() => recordAward(c, 'mvp')).toThrow();
      c.recaps = Array.from({ length: p === 'PG' ? 82 : 18 }, () => recap());
      expect(awardsUnlocked(c)).toBe(true);
      const bank = c.points;
      c = recordAward(c, 'mvp');
      expect(c.points).toBe(bank + 12);
      expect(() => recordAward(c, 'mvp')).toThrow();
      expect(careerSchema.parse(JSON.parse(JSON.stringify(c))).awards).toEqual(c.awards);
      expect(() => recordAward(c, p === 'PG' ? 'finals-mvp' : 'super-bowl-mvp')).toThrow();
      c.status = 'complete';
      c.playoffRound = 4;
      c.recaps.push(recap({}, 'playoff'));
      expect(recordAward(c, p === 'PG' ? 'finals-mvp' : 'super-bowl-mvp').points).toBe(
        c.points + 10,
      );
    },
  );
  it('filters offensive/defensive awards and migrates older saves', () => {
    expect(availableAwards(career('LB')).some((a) => a.id === 'oroy')).toBe(false);
    expect(availableAwards(career('QB')).some((a) => a.id === 'droy')).toBe(false);
    const raw = JSON.parse(JSON.stringify(career()));
    delete raw.awards;
    delete raw.recordBook;
    const c = careerSchema.parse(raw);
    expect(c.awards).toEqual([]);
    expect(c.recordBook).toEqual([]);
  });
});
