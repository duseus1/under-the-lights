import { describe, it, expect } from 'vitest';
import {
  createCareer,
  defaultRecap,
  submitRecap,
  resolveChoice,
  pendingEvent,
  upgrade,
  editRecap,
} from '../src/domain/engine';
import {
  careerSchema,
  rules,
  emptyStats,
  initialState,
  type Recap,
  type Position,
} from '../src/domain/types';
import {
  trends,
  recentForm,
  tendencies,
  prepareCareerChange,
  undoCheckIn,
  remember,
  correctionPreview,
  previously,
} from '../src/domain/career-memory';
import {
  performanceTier,
  setLeagueRecord,
  leagueBook,
  recordValue,
  recordGames,
} from '../src/domain/achievements';
import { resolveSideEvent } from '../src/domain/side-events';
import { positions } from '../src/data/positions';
import { stories } from '../src/data/stories';
import memory from '../src/data/career-memory.json';
import { parseSave, mergeImport } from '../src/storage';

export function fixture(position: Position = 'PG') {
  const p = positions.find((p) => p.id === position)!,
    a = rules.archetypes.find((a) => a.id === p.archetype)!;
  let c = createCareer(
    {
      name: 'Taylor James',
      number: 4,
      position,
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    p.story,
  );
  c.status = 'season';
  c.draft = {
    team: position === 'PG' ? 'Chicago Bulls' : 'Chicago Bears',
    round: 1,
    pick: 10,
    byeWeek: 9,
  };
  while (pendingEvent(c)) c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
  return c;
}
function game(n: number, patch: Partial<Recap> = {}): Recap {
  return {
    id: `g-${n}`,
    phase: 'regular',
    week: n + 1,
    opponent: 'Boston Celtics',
    ownScore: 120,
    opponentScore: 100,
    participation: 'played',
    stats: { ...emptyStats, points: 10, fieldGoalsMade: 5, fieldGoalsAttempted: 10 },
    note: '',
    reward: 1,
    edited: false,
    ...patch,
  };
}
describe('career memory', () => {
  it('loads old saves with defaults and keeps independent bookmarks through export/import', () => {
    const c = fixture();
    const old = { ...c, moments: undefined, undo: undefined };
    expect(careerSchema.parse(old).moments).toEqual([]);
    const saved = remember(c, 'custom', 'The comeback', 'A fourth-quarter moment.');
    expect(c.moments).toEqual([]);
    const imported = mergeImport(
      initialState,
      parseSave(JSON.stringify({ ...initialState, careers: [saved], activeId: saved.id })),
    );
    expect(imported.careers[0].moments[0].title).toBe('The comeback');
    expect(imported.careers[0].id).not.toBe(c.id);
    expect(remember(saved, 'custom', '', '').moments).toEqual([]);
  });
  it('compares disjoint windows and uses weighted percentages', () => {
    const c = fixture('QB');
    c.recaps = Array.from({ length: 10 }, (_, i) =>
      game(i, {
        stats: {
          ...emptyStats,
          passingYards: i < 5 ? 100 : 300,
          attempts: i === 9 ? 10 : 30,
          completions: i === 9 ? 10 : 15,
        },
      }),
    );
    c.recaps.push(game(10, { participation: 'injured', stats: { ...emptyStats } }));
    const rows = trends(c);
    expect(rows[0]).toMatchObject({ current: 300, previous: 100, count: 5 });
    expect(rows.find((r) => r.label === 'Completion %')!.current).toBeCloseTo(7000 / 130);
    expect(trends(c, 'playoff')[0].current).toBeNull();
  });
  it('classifies hot, cold, surging, inconsistent and insufficient samples without counting absence', () => {
    const c = fixture();
    const hot = {
      ...emptyStats,
      points: 40,
      assists: 12,
      fieldGoalsMade: 20,
      fieldGoalsAttempted: 25,
    };
    const cold = { ...emptyStats };
    c.recaps = [0, 1, 2].map((i) => game(i, { stats: hot }));
    expect(recentForm(c).tag).toBe('HOT');
    c.recaps = [0, 1, 2].map((i) => game(i, { stats: cold }));
    expect(recentForm(c).tag).toBe('COLD');
    c.recaps = [
      game(0, { stats: cold }),
      game(1, {
        stats: { ...emptyStats, points: 30, fieldGoalsMade: 15, fieldGoalsAttempted: 30 },
      }),
      game(2, { stats: hot }),
    ];
    expect(recentForm(c).tag).toBe('SURGING');
    c.recaps.push(game(3, { stats: cold }));
    expect(recentForm(c).tag).toBe('INCONSISTENT');
    c.recaps = [game(0), game(1, { participation: 'injured', stats: cold })];
    expect(recentForm(c).tag).toBe('BUILDING');
  });
  it('tags every authored major choice and distinguishes accountability from ambition', () => {
    for (const story of stories)
      for (const event of story.events)
        for (const choice of event.choices) expect(choice.id in memory.choices).toBe(true);
    const c = fixture('QB');
    c.storyId = 'playbook';
    c.choices = [
      { eventId: 'response', choiceId: 'own', title: '', choice: '', outcome: '', at: '' },
    ];
    expect(tendencies(c)).toMatchObject({ Accountability: 1, Ambitious: 0 });
  });
  it('restores a full game checkpoint after reload without duplicating rewards or events', () => {
    const c = fixture();
    const input = {
      ...defaultRecap(c),
      opponent: 'Boston Celtics',
      ownScore: 120,
      opponentScore: 100,
      stats: { ...emptyStats, points: 80, fieldGoalsMade: 40, fieldGoalsAttempted: 45 },
    };
    const next = prepareCareerChange(c, submitRecap(c, input));
    expect(next.sideEvents).toHaveLength(1);
    const restored = undoCheckIn(careerSchema.parse(JSON.parse(JSON.stringify(next))));
    expect({ ...restored, updatedAt: c.updatedAt }).toEqual(c);
    expect(() => undoCheckIn(restored)).toThrow();
    const retry = submitRecap(restored, input);
    expect(retry.points).toBe(next.points);
    expect(retry.sideEvents).toHaveLength(1);
    const imported = mergeImport(initialState, {
      ...initialState,
      careers: [next],
      activeId: next.id,
    });
    expect(undoCheckIn(imported.careers[0]).id).toBe(imported.careers[0].id);
    const spent = prepareCareerChange(next, upgrade(next, 'speed'));
    expect(spent.undo).toBeUndefined();
  });
  it('restores a major decision and side-event relationship consequences', () => {
    const c = fixture();
    c.choices = [];
    const chosen = prepareCareerChange(c, resolveChoice(c, 'compete'));
    expect(undoCheckIn(chosen).relationships).toEqual(c.relationships);
    const base = fixture();
    const next = submitRecap(base, {
      ...defaultRecap(base),
      opponent: 'Boston Celtics',
      ownScore: 120,
      opponentScore: 100,
      stats: { ...emptyStats, points: 80, fieldGoalsMade: 40, fieldGoalsAttempted: 45 },
    });
    const resolved = prepareCareerChange(
      next,
      resolveSideEvent(next, next.sideEvents[0].id, 'credit'),
    );
    expect(undoCheckIn(resolved).sideEvents[0].status).toBe('pending');
    expect(undoCheckIn(resolved).relationships).toEqual(next.relationships);
  });
  it('previews corrections while preserving resolved dialogue and rewards', () => {
    const c = fixture();
    c.recaps = [game(0)];
    const updated = {
      ...c.recaps[0],
      title: 'First start',
      stats: { ...c.recaps[0].stats, points: 20, fieldGoalsMade: 10 },
    };
    expect(correctionPreview(c, updated).find((x) => x.label === 'points')).toMatchObject({
      before: 10,
      after: 20,
      best: 10,
      newBest: 20,
    });
    const corrected = editRecap(c, updated);
    expect(corrected.choices).toEqual(c.choices);
    expect(corrected.points).toBe(c.points);
    expect(corrected.recaps[0].reward).toBe(c.recaps[0].reward);
    expect(previously(corrected).join(' ')).toContain('First start');
  });
  it('recognizes team rookie history below league marks and separates trade production', () => {
    let c = fixture();
    c = setLeagueRecord(c, {
      metric: 'points',
      scope: 'game',
      phase: 'regular',
      value: 50,
      holder: 'League save baseline',
      level: 'franchise',
      team: 'Chicago Bulls',
      rookieOnly: true,
    });
    const r = game(0, {
      team: 'Chicago Bulls',
      stats: { ...emptyStats, points: 54, fieldGoalsMade: 27 },
    });
    expect(performanceTier(c, r)?.tier).toBe('historic');
    expect(performanceTier(c, r)?.evidence).toContain('Chicago Bulls franchise rookie');
    expect(performanceTier(c, { ...r, team: 'Boston Celtics' })?.tier).not.toBe('historic');
    expect(performanceTier(c, { ...r, stats: { ...r.stats, points: 50 } })?.tier).not.toBe(
      'historic',
    );
    c.recaps = [
      r,
      { ...r, id: 'other', team: 'Boston Celtics', stats: { ...r.stats, points: 80 } },
    ];
    const team = leagueBook(c).find((r) => r.level === 'franchise')!;
    expect(recordValue(recordGames(c), team)).toBe(54);
    c.flags.push('traded');
    c.recaps[0].team = undefined;
    expect(recordValue(recordGames(c), team)).toBe(0);
    expect(() => setLeagueRecord(c, { ...team, team: 'Wrong team' })).toThrow();
  });
  it.each(['bye', 'injured', 'playoff-loss'] as const)(
    'undo restores schedule and season state after %s',
    (kind) => {
      const c = fixture('QB');
      c.choices = stories
        .find((s) => s.id === c.storyId)!
        .events.map((e) => ({
          eventId: e.id,
          choiceId: e.choices[0].id,
          title: e.title,
          choice: e.choices[0].label,
          outcome: '',
          at: c.createdAt,
        }));
      if (kind === 'bye') {
        c.draft!.byeWeek = 1;
        c.recaps = [0, 1, 2].map((i) =>
          game(i, { phase: 'preseason', stats: { ...emptyStats }, opponent: 'Green Bay Packers' }),
        );
      }
      if (kind === 'playoff-loss') {
        c.status = 'postseason';
        c.playoffRound = 4;
      }
      const r = defaultRecap(c);
      if (kind !== 'bye') {
        r.opponent = 'Green Bay Packers';
        r.ownScore = 7;
        r.opponentScore = 28;
      }
      if (kind === 'injured') r.participation = 'injured';
      const next = prepareCareerChange(c, submitRecap(c, r));
      if (kind === 'playoff-loss') expect(next.status).toBe('complete');
      const restored = undoCheckIn(next);
      expect({ ...restored, updatedAt: c.updatedAt }).toEqual(c);
    },
  );
  it('rejects malformed and cross-career undo imports before touching saves', () => {
    const c = fixture();
    c.undo = { label: 'Bad checkpoint', before: '{' };
    expect(() =>
      parseSave(JSON.stringify({ ...initialState, careers: [c], activeId: c.id })),
    ).toThrow();
    c.undo.before = JSON.stringify(fixture());
    expect(() => undoCheckIn(c)).toThrow('another career');
  });
});
