import { describe, it, expect } from 'vitest';
import {
  createCareer,
  finishSetup,
  updateChecklist,
  recordDraft,
  resolveChoice,
  pendingEvent,
  submitRecap,
  defaultRecap,
  editRecap,
} from '../src/domain/engine';
import { offerSideEvent, resolveSideEvent } from '../src/domain/side-events';
import { positions } from '../src/data/positions';
import {
  rules,
  emptyStats,
  careerSchema,
  type Position,
  type Stats,
  type Career,
} from '../src/domain/types';
function start(p: Position = 'PG') {
  const d = positions.find((x) => x.id === p)!;
  const a = rules.archetypes.find((x) => x.id === d.archetype)!;
  let c = createCareer(
    {
      name: 'Casey Morgan',
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
  for (let i = 0; i < 4; i++) c = updateChecklist(c, i, true);
  c = recordDraft(
    finishSetup(c),
    p === 'PG'
      ? { team: 'Chicago Bulls', round: 1, pick: 10, byeWeek: 9 }
      : { team: 'Chicago Bears', round: 1, pick: 10, byeWeek: 9 },
  );
  return resolveChoice(c, pendingEvent(c)!.choices[0].id);
}
function play(c: Career, stats: Partial<Stats> = { assists: 15 }, win = true) {
  while (pendingEvent(c)) c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
  return submitRecap(c, {
    ...defaultRecap(c),
    opponent: c.game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
    ownScore: win ? 110 : 90,
    opponentScore: 100,
    stats: { ...emptyStats, ...stats },
  });
}
describe('big-game side events', () => {
  it.each([
    ['PG', { assists: 15 }],
    ['QB', { passingYards: 400 }],
    ['WR', { receivingYards: 180 }],
    ['TE', { receivingYards: 125 }],
    ['RB', { rushingYards: 150, receivingYards: 50 }],
    ['S', { defensiveInterceptions: 2 }],
    ['LB', { tackles: 18 }],
    ['EDGE', { sacks: 3 }],
  ] as [Position, Partial<Stats>][])(
    '%s offers a saved optional conversation after a standout game',
    (p, stats) => {
      const c = play(start(p), stats);
      expect(c.sideEvents).toHaveLength(1);
      expect(c.sideEvents[0].status).toBe('pending');
      expect(c.sideEvents[0].kind).toBe('press');
      expect(careerSchema.parse(JSON.parse(JSON.stringify(c))).sideEvents).toEqual(c.sideEvents);
    },
  );
  it('uses thresholds, excludes injury and does not reward ordinary games with a side event', () => {
    expect(play(start(), { assists: 14 }).sideEvents).toHaveLength(0);
    const c = start();
    const r = {
      ...defaultRecap(c),
      opponent: 'Boston Celtics',
      ownScore: 110,
      opponentScore: 100,
      participation: 'injured' as const,
      stats: { ...emptyStats },
    };
    expect(submitRecap(c, r).sideEvents).toHaveLength(0);
  });
  it('responds to a loss without describing a win', () => {
    const c = play(start(), { assists: 15 }, false);
    expect(c.sideEvents[0].body).toContain('team did not win');
    expect(c.sideEvents[0].body).not.toContain('after this win');
  });
  it('allows normal play with a pending side event, prevents duplicates and caps the queue', () => {
    let c = play(start());
    const original = structuredClone(c.sideEvents);
    offerSideEvent(c, c.recaps[0]);
    expect(c.sideEvents).toEqual(original);
    c = play(c);
    expect(c.recaps).toHaveLength(2);
    expect(c.sideEvents).toEqual(original);
  });
  it('rotates press, coach and teammate events after three more played appearances', () => {
    let c = play(start());
    for (const kind of ['coach', 'teammate']) {
      c = resolveSideEvent(c, c.sideEvents.at(-1)!.id, null);
      c = play(c);
      c = play(c);
      expect(c.sideEvents.at(-1)?.status).toBe('skipped');
      c = play(c);
      expect(c.sideEvents.at(-1)?.kind).toBe(kind);
    }
  });
  it('applies a choice once, keeps the main arc independent, and lets skipping have no penalty', () => {
    let c = play(start());
    const before = structuredClone(c);
    c = resolveSideEvent(c, c.sideEvents[0].id, 'credit');
    expect(c.relationships.teammate).toBe(before.relationships.teammate + 4);
    expect(c.points).toBe(before.points);
    expect(c.choices).toEqual(before.choices);
    expect(() => resolveSideEvent(c, c.sideEvents[0].id, 'credit')).toThrow();
    expect(() => resolveSideEvent(before, before.sideEvents[0].id, 'bad-id')).toThrow();
    const skipped = resolveSideEvent(before, before.sideEvents[0].id, null);
    expect(skipped.relationships).toEqual(before.relationships);
  });
  it('preserves the offered conversation when recaps change and does not create events retroactively', () => {
    let c = play(start());
    const original = structuredClone(c.sideEvents);
    c = editRecap(c, { ...c.recaps[0], stats: { ...emptyStats } });
    expect(c.sideEvents).toEqual(original);
    let ordinary = play(start(), {});
    ordinary = editRecap(ordinary, {
      ...ordinary.recaps[0],
      stats: { ...emptyStats, assists: 15 },
    });
    expect(ordinary.sideEvents).toHaveLength(0);
  });
  it('allows a final-game conversation after the season ends and supports old saves', () => {
    let c = { ...start(), seasonGames: 8 };
    for (let i = 0; i < 7; i++) c = play(c, {});
    c = play(c);
    c.status = 'complete';
    c.ending = 'The original ending.';
    const next = resolveSideEvent(c, c.sideEvents[0].id, 'credit');
    expect(next.ending).toBe(c.ending);
    const old = JSON.parse(JSON.stringify(start()));
    delete old.sideEvents;
    expect(careerSchema.parse(old).sideEvents).toEqual([]);
  });
});
