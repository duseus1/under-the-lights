import { describe, expect, it } from 'vitest';
import { positions } from '../src/data/positions';
import { performanceReaction } from '../src/domain/performance';
import {
  createCareer,
  finishSetup,
  updateChecklist,
  recordDraft,
  resolveChoice,
  submitRecap,
  defaultRecap,
  pendingEvent,
  eventBody,
  editRecap,
} from '../src/domain/engine';
import {
  careerSchema,
  emptyStats,
  rules,
  type Position,
  type Stats,
  type Career,
} from '../src/domain/types';
import { getStory } from '../src/data/stories';
function start(position: Position) {
  const def = positions.find((p) => p.id === position)!;
  const a = rules.archetypes.find((a) => a.id === def.archetype)!;
  let c = createCareer(
    {
      name: 'Taylor Morgan',
      number: 7,
      position,
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    def.story,
  );
  for (let i = 0; i < 4; i++) c = updateChecklist(c, i, true);
  c = recordDraft(
    finishSetup(c),
    position === 'PG'
      ? { team: 'Chicago Bulls', round: 1, pick: 10, byeWeek: 9 }
      : { team: 'Chicago Bears', round: 3, pick: 70, byeWeek: 9 },
  );
  return resolveChoice(c, pendingEvent(c)!.choices[0].id);
}
function record(
  c: Career,
  stats: Partial<Stats>,
  participation: 'played' | 'injured' | 'inactive' = 'played',
) {
  return submitRecap(c, {
    ...defaultRecap(c),
    opponent: c.game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
    ownScore: 110,
    opponentScore: 100,
    participation,
    stats: { ...emptyStats, ...stats },
  });
}
function reaction(c: Career) {
  return performanceReaction(c, getStory(c.storyId).events[1])!;
}
describe('authored performance dialogue', () => {
  const pg = {
    minutes: 30,
    points: 20,
    fieldGoalsMade: 8,
    fieldGoalsAttempted: 16,
    threePointersMade: 2,
    threePointersAttempted: 5,
    freeThrowsMade: 2,
    freeThrowsAttempted: 2,
  };
  it.each([
    ['PG', { ...pg, assists: 10, turnovers: 2 }, 'creator'],
    ['PG', { ...pg, turnovers: 5 }, 'loose-handle'],
    [
      'PG',
      { ...pg, points: 10, fieldGoalsMade: 3, fieldGoalsAttempted: 15, assists: 1 },
      'cold-shooting',
    ],
    ['PG', { ...pg, points: 30, fieldGoalsMade: 13, fieldGoalsAttempted: 24 }, 'scoring-run'],
    ['PG', { minutes: 8 }, 'limited-minutes'],
    ['QB', { attempts: 30, completions: 22, passingYards: 300, passingTD: 3 }, 'productive'],
    [
      'QB',
      { attempts: 30, completions: 22, passingYards: 300, passingTD: 3, interceptions: 2 },
      'turnovers',
    ],
    ['QB', { attempts: 25, completions: 10 }, 'accuracy'],
    ['QB', { attempts: 5, completions: 2 }, 'limited'],
    ['WR', { targets: 8, receptions: 6, receivingYards: 110 }, 'productive'],
    ['WR', { targets: 8, receptions: 3, drops: 2 }, 'drops'],
    ['WR', { targets: 6, receptions: 2, receivingYards: 20 }, 'quiet'],
    ['WR', { targets: 1, receptions: 1, receivingYards: 10 }, 'limited'],
    ['TE', { targets: 8, receptions: 6, receivingYards: 70 }, 'productive'],
    ['TE', { targets: 6, receptions: 2, drops: 2 }, 'drops'],
    ['TE', { targets: 6, receptions: 2, receivingYards: 20 }, 'quiet'],
    ['TE', {}, 'limited'],
    ['RB', { carries: 18, rushingYards: 120 }, 'productive'],
    ['RB', { carries: 18, rushingYards: 120, fumbles: 1 }, 'fumbles'],
    ['RB', { carries: 15, rushingYards: 30 }, 'stalled'],
    ['RB', { carries: 2, rushingYards: 5 }, 'limited'],
    ['S', { defensiveInterceptions: 2 }, 'takeaways'],
    ['LB', { tackles: 10, defensiveSnaps: 40 }, 'active'],
    ['EDGE', { sacks: 1.5, defensiveSnaps: 40 }, 'pressure'],
    ['S', { missedTackles: 3, defensiveSnaps: 40 }, 'missed-tackles'],
    ['LB', { missedTackles: 3, defensiveSnaps: 40 }, 'missed-tackles'],
    ['EDGE', { missedTackles: 3, defensiveSnaps: 40 }, 'missed-tackles'],
    ['S', { tackles: 7 }, 'active'],
    ['EDGE', { tackles: 6 }, 'active'],
    ['LB', { fumbleRecoveries: 2 }, 'takeaways'],
    ['S', { defensiveSnaps: 40, tackles: 1 }, 'quiet'],
    ['LB', { defensiveSnaps: 40, tackles: 1 }, 'quiet'],
    ['EDGE', { defensiveSnaps: 40, tackles: 1 }, 'quiet'],
  ] as [Position, Partial<Stats>, string][])('%s selects %s → %s', (pos, stats, id) => {
    const c = record(start(pos), stats);
    expect(reaction(c).branchId).toBe(`${pos}:${id}`);
    expect(eventBody(c)).toContain(reaction(c).body);
    expect(careerSchema.safeParse(c).success).toBe(true);
  });
  it('uses played appearances in the same phase, weighted shooting and only the latest three', () => {
    let c = start('PG');
    c = record(c, { ...pg, assists: 10 });
    const r = c.recaps[0];
    c.recaps = [
      { ...r, id: 'old', stats: { ...r.stats, turnovers: 30 } },
      { ...r, id: 'pre', phase: 'preseason', stats: { ...r.stats, turnovers: 30 } },
      { ...r, id: 'one' },
      { ...r, id: 'inj', participation: 'injured', stats: { ...emptyStats } },
      { ...r, id: 'two' },
      { ...r, id: 'three' },
    ];
    expect(reaction(c).branchId).toBe('PG:creator');
    expect(reaction(c).evidence).toContain('3 recent played appearances');
    c.recaps = [
      {
        ...r,
        id: 'one',
        stats: {
          ...r.stats,
          fieldGoalsMade: 1,
          fieldGoalsAttempted: 1,
          threePointersMade: 0,
          threePointersAttempted: 0,
          freeThrowsMade: 0,
          freeThrowsAttempted: 0,
          points: 2,
        },
      },
      {
        ...r,
        id: 'two',
        stats: { ...r.stats, fieldGoalsMade: 5, fieldGoalsAttempted: 30, points: 14 },
      },
    ];
    expect(reaction(c).branchId).toBe('PG:cold-shooting');
  });
  it('does not treat injuries, DNPs, byes or missing defensive snap data as poor play', () => {
    for (const status of ['injured', 'inactive'] as const) {
      const c = record(start('PG'), {}, status);
      expect(reaction(c).branchId).toBe(status === 'injured' ? 'recovery' : 'inactive');
      expect(eventBody(c)).not.toContain('shooting slump');
    }
    const c = record(start('EDGE'), {});
    expect(reaction(c).branchId).toBe('EDGE:steady');
    const qb = record(start('QB'), {
      attempts: 30,
      completions: 24,
      passingYards: 300,
      passingTD: 3,
    });
    qb.recaps.push({
      ...qb.recaps[0],
      id: 'bye',
      phase: 'regular',
      participation: 'bye',
      ownScore: 0,
      opponentScore: 0,
      stats: { ...emptyStats },
    });
    expect(reaction(qb).branchId).toBe('QB:productive');
  });
  it('uses the latest giveaway priority over impressive averages and preserves reload selection', () => {
    const c = record(start('PG'), { ...pg, assists: 12, turnovers: 5 });
    expect(reaction(c).branchId).toBe('PG:loose-handle');
    expect(eventBody(careerSchema.parse(JSON.parse(JSON.stringify(c))))).toBe(eventBody(c));
  });
  it('updates unresolved dialogue on correction but freezes the completed transcript and evidence', () => {
    let c = record(start('PG'), { ...pg, assists: 10 });
    const game = c.recaps[0];
    const positive = eventBody(c);
    c = editRecap(c, { ...game, stats: { ...game.stats, turnovers: 5 } });
    expect(eventBody(c)).not.toBe(positive);
    expect(reaction(c).branchId).toBe('PG:loose-handle');
    const shown = eventBody(c);
    c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
    expect(c.choices.at(-1)?.dialogue).toBe(shown);
    expect(c.choices.at(-1)?.performance?.branchId).toBe('PG:loose-handle');
    const history = structuredClone(c.choices);
    c = editRecap(c, { ...game, stats: { ...game.stats, turnovers: 0 } });
    expect(c.choices).toEqual(history);
    expect(careerSchema.parse(JSON.parse(JSON.stringify(c))).choices).toEqual(history);
  });
  it('leaves arrival conversations alone and accepts older history without transcripts', () => {
    const c = start('PG');
    expect(c.choices[0].performance).toBeUndefined();
    const older = JSON.parse(JSON.stringify(c));
    delete older.choices[0].dialogue;
    expect(careerSchema.safeParse(older).success).toBe(true);
  });
});
