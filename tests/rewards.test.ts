import { describe, expect, it } from 'vitest';
import { gameReward } from '../src/domain/rewards';
import {
  createCareer,
  updateChecklist,
  finishSetup,
  recordDraft,
  pendingEvent,
  resolveChoice,
  defaultRecap,
  submitRecap,
  editRecap,
} from '../src/domain/engine';
import {
  emptyStats,
  recapSchema,
  careerSchema,
  type Position,
  type Stats,
} from '../src/domain/types';
const reward = (
  position: Position,
  stats: Partial<Stats>,
  participation: 'played' | 'injured' | 'inactive' | 'bye' = 'played',
) => gameReward(position, { participation, stats: { ...emptyStats, ...stats } });
describe('performance progression rewards', () => {
  it.each([
    ['QB', { passingYards: 320, passingTD: 3, attempts: 30, completions: 22 }],
    ['WR', { receivingYards: 110, receivingTD: 1, targets: 10, receptions: 8 }],
    ['TE', { receivingYards: 80, receivingTD: 1, targets: 8, receptions: 6 }],
    ['RB', { rushingYards: 100, receivingYards: 30, rushingTD: 1, carries: 20 }],
    ['PG', { points: 30, assists: 10, fieldGoalsMade: 12, fieldGoalsAttempted: 20 }],
    ['S', { tackles: 7, defensiveInterceptions: 1, defensiveSnaps: 40 }],
    ['LB', { tackles: 12, defensiveInterceptions: 1, defensiveSnaps: 40 }],
    ['EDGE', { tackles: 3, sacks: 2, tacklesForLoss: 2, defensiveSnaps: 40 }],
  ] as [Position, Partial<Stats>][])(
    '%s earns more for an excellent game than a quiet one',
    (p, s) => {
      const excellent = reward(p, s);
      expect(excellent.total).toBe(5);
      expect(reward(p, {}).total).toBe(1);
      expect(excellent.items.reduce((n, i) => n + i.points, 0)).toBe(5);
    },
  );
  it('checks inclusive tier boundaries without stacking production tiers', () => {
    expect(reward('WR', { receivingYards: 49 }).total).toBe(1);
    expect(reward('WR', { receivingYards: 50 }).total).toBe(2);
    expect(reward('WR', { receivingYards: 100 }).total).toBe(3);
  });
  it('penalizes turnovers and drops without taking away banked points', () => {
    const good = { points: 30, assists: 10, fieldGoalsMade: 12, fieldGoalsAttempted: 20 };
    expect(reward('PG', { ...good, turnovers: 4 }).total).toBe(3);
    expect(reward('PG', { ...good, turnovers: 6 }).total).toBe(2);
    expect(reward('WR', { drops: 6 }).total).toBe(1);
    expect(reward('RB', { fumbles: 2 }).total).toBe(1);
  });
  it('requires opportunities for efficiency and does not infer a clean game from missing defensive snaps', () => {
    expect(reward('PG', { fieldGoalsMade: 1, fieldGoalsAttempted: 1 }).total).toBe(1);
    expect(reward('QB', { attempts: 1, completions: 1 }).total).toBe(1);
    expect(reward('EDGE', { tackles: 4 }).total).toBe(2);
    expect(reward('EDGE', { tackles: 4, defensiveSnaps: 20 }).total).toBe(3);
  });
  it.each(['injured', 'inactive', 'bye'] as const)(
    '%s earns only a preparation point',
    (participation) => {
      expect(reward('PG', {}, participation).total).toBe(1);
    },
  );
  it('uses combined rushing and receiving for backs, accepts half sacks and clamps negative yardage', () => {
    expect(reward('RB', { rushingYards: 60, receivingYards: 60 }).total).toBe(3);
    expect(reward('EDGE', { sacks: 1.5 }).total).toBe(3);
    expect(reward('RB', { rushingYards: -50 }).total).toBe(1);
  });
  it('persists actual awarded points once and keeps reward history through corrections and exports', () => {
    let c = createCareer(
      {
        name: 'Alex Carter',
        number: 7,
        position: 'QB',
        archetype: 'pocket',
        height: 76,
        weight: 225,
        development: 'Normal',
        allocations: {},
      },
      'succession',
    );
    for (let i = 0; i < 4; i++) c = updateChecklist(c, i, true);
    c = recordDraft(finishSetup(c), { team: 'Chicago Bears', round: 1, pick: 5, byeWeek: 9 });
    c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
    const r = {
      ...defaultRecap(c),
      opponent: 'Green Bay Packers',
      ownScore: 28,
      opponentScore: 14,
      stats: { ...emptyStats, attempts: 30, completions: 22, passingYards: 320, passingTD: 3 },
      reward: 999,
    };
    c = submitRecap(c, r);
    expect(c.points).toBe(5);
    expect(c.recaps[0].reward).toBe(5);
    expect(c.recaps[0].rewardBreakdown?.total).toBe(5);
    const before = structuredClone(c);
    c = editRecap(c, {
      ...c.recaps[0],
      stats: { ...emptyStats },
      reward: 0,
      rewardBreakdown: undefined,
    });
    expect(c.points).toBe(before.points);
    expect(c.recaps[0].rewardBreakdown).toEqual(before.recaps[0].rewardBreakdown);
    expect(careerSchema.parse(JSON.parse(JSON.stringify(c))).recaps).toEqual(c.recaps);
    const older = { ...c.recaps[0], reward: 2, rewardBreakdown: undefined };
    expect(recapSchema.safeParse(older).success).toBe(true);
    expect(recapSchema.safeParse({ ...c.recaps[0], reward: 9 }).success).toBe(false);
  });
});
