import { describe, expect, it } from 'vitest';
import {
  appSchema,
  careerSchema,
  emptyStats,
  initialState,
  rules,
  type Career,
  type Recap,
  type StoryId,
} from '../src/domain/types';
import {
  buildRatings,
  choosePostseason,
  createCareer,
  defaultRecap,
  editRecap,
  eventBody,
  finishSetup,
  nextGame,
  pendingEvent,
  recordDraft,
  resolveAction,
  resolveChoice,
  submitRecap,
  totals,
  updateChecklist,
  upgrade,
  upgradeCost,
} from '../src/domain/engine';
import { getStory, stories } from '../src/data/stories';
import { mergeImport, parseSave } from '../src/storage';
import { positions } from '../src/data/positions';

function create(storyId: StoryId = 'succession'): Career {
  const position = getStory(storyId).position;
  const definition = positions.find((p) => p.id === position)!;
  const a = rules.archetypes.find((a) => a.id === definition.archetype)!;
  const wr = position === 'WR' || position === 'TE';
  return createCareer(
    {
      name: wr ? 'Jordan Brooks' : 'Alex Carter',
      number: wr ? 11 : 7,
      position,
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    storyId,
  );
}
function drafted(storyId: StoryId = 'succession'): Career {
  let c = create(storyId);
  for (let i = 0; i < 4; i++) c = updateChecklist(c, i, true);
  c = finishSetup(c);
  return recordDraft(
    c,
    c.game === 'nba2k'
      ? { team: 'Chicago Bulls', round: 1, pick: 7, byeWeek: 9 }
      : { team: 'Chicago Bears', round: 3, pick: 70, byeWeek: 9 },
  );
}
function resolveAll(c: Career, choiceIndex = 0) {
  while (pendingEvent(c)) {
    const e = pendingEvent(c)!;
    c = resolveChoice(c, e.choices[Math.min(choiceIndex, e.choices.length - 1)].id);
  }
  return c;
}
function game(c: Career, win = true): Recap {
  const r = defaultRecap(c);
  if (r.participation === 'bye') return r;
  return {
    ...r,
    opponent: c.game === 'nba2k' ? 'Boston Celtics' : 'Green Bay Packers',
    ownScore: win ? 27 : 10,
    opponentScore: win ? 17 : 30,
    stats:
      c.player.position === 'PG'
        ? {
            ...emptyStats,
            minutes: 28,
            points: 20,
            assists: 8,
            rebounds: 4,
            steals: 2,
            turnovers: 2,
            fieldGoalsMade: 8,
            fieldGoalsAttempted: 15,
            threePointersMade: 2,
            threePointersAttempted: 5,
            freeThrowsMade: 2,
            freeThrowsAttempted: 2,
          }
        : c.player.position === 'QB'
          ? { ...emptyStats, attempts: 30, completions: 22, passingYards: 280, passingTD: 2 }
          : c.player.position === 'WR' || c.player.position === 'TE'
            ? { ...emptyStats, targets: 10, receptions: 7, receivingYards: 95, receivingTD: 1 }
            : c.player.position === 'RB'
              ? {
                  ...emptyStats,
                  carries: 20,
                  rushingYards: 110,
                  rushingTD: 1,
                  targets: 4,
                  receptions: 3,
                  receivingYards: 30,
                  receivingTD: 1,
                }
              : {
                  ...emptyStats,
                  tackles: 8,
                  tacklesForLoss: 2,
                  sacks: 1.5,
                  defensiveInterceptions: 1,
                  passDeflections: 2,
                  defensiveSnaps: 55,
                },
  };
}
function regularSeason(story: StoryId, index = 0): Career {
  let c = drafted(story);
  while (c.status === 'season') {
    c = resolveAll(c, index);
    c = submitRecap(c, game(c));
  }
  return resolveAll(c, index);
}

describe('custom builds and upgrades', () => {
  it('supports every archetype, including heavier power edge builds, without phantom offensive attributes', () => {
    for (const a of rules.archetypes) {
      const built = buildRatings(a.id, a.height, a.weight, {});
      expect(Object.keys(built.ratings)).toEqual(Object.keys(a.ratings));
      expect(Object.values(built.ratings).every(Number.isFinite)).toBe(true);
    }
    expect(buildRatings('power-edge', 77, 275, {}).ratings.strength).toBe(85);
  });
  it('separates starting values from potential and applies a capped size effect', () => {
    const base = buildRatings('deep', 71, 185, {}),
      small = buildRatings('deep', 66, 165, { speed: 4 });
    expect(base.ratings.speed).toBe(88);
    expect(small.ratings.speed).toBe(98);
    expect(small.ceilings.speed).toBe(99);
    expect(() => buildRatings('deep', 71, 185, { speed: 5 })).toThrow();
    expect(() =>
      buildRatings('deep', 71, 185, { speed: 4, catching: 4, release: 4, juke: 1 }),
    ).toThrow();
    expect(() => buildRatings('deep', 71, 185, { throwPower: 1 })).toThrow();
  });
  it('prices the transition based on current rating and respects ceilings', () => {
    expect([79, 80, 89, 90].map(upgradeCost)).toEqual([1, 2, 2, 3]);
    const c = drafted();
    c.points = 2;
    c.ratings.shortAccuracy = 80;
    const next = upgrade(c, 'shortAccuracy');
    expect(next.points).toBe(0);
    expect(next.ratings.shortAccuracy).toBe(81);
    expect(c.ratings.shortAccuracy).toBe(80);
    expect(() => upgrade(next, 'shortAccuracy')).toThrow('Not enough');
    next.points = 99;
    next.ratings.shortAccuracy = next.ceilings.shortAccuracy;
    expect(() => upgrade(next, 'shortAccuracy')).toThrow('ceiling');
    expect(next.actions.filter((a) => a.type === 'ratings')).toHaveLength(1);
  });
  it('rejects wrong position/story and malformed imported builds', () => {
    const c = create();
    expect(() => careerSchema.parse({ ...c, storyId: 'dependable' })).toThrow();
    expect(() => careerSchema.parse({ ...c, ratings: { speed: 50 } })).toThrow();
    expect(() =>
      careerSchema.parse({
        ...c,
        player: {
          ...c.player,
          allocations: { speed: 4, awareness: 4, throwPower: 4, carrying: 4 },
        },
      }),
    ).toThrow();
  });
});
describe('onboarding and chronology', () => {
  it('requires a checklist and actual draft before play', () => {
    const c = create();
    expect(nextGame(c)).toBeNull();
    expect(pendingEvent(c)).toBeNull();
    expect(() => finishSetup(c)).toThrow();
    const d = drafted();
    expect(d.draft?.pick).toBe(70);
    expect(pendingEvent(d)?.id).toBe('arrival');
    expect(eventBody(d)).toContain('Chicago Bears');
    expect(eventBody(d)).toContain('pocket passer');
    expect(() => submitRecap(d, game(d))).toThrow('story event');
    expect(() => recordDraft(d, d.draft!)).toThrow('already');
  });
  it('uses three preseason games, 17 regular games and exactly one bye', () => {
    const c = regularSeason('succession');
    expect(c.recaps).toHaveLength(21);
    expect(c.recaps.filter((r) => r.phase === 'preseason')).toHaveLength(3);
    expect(c.recaps.filter((r) => r.phase === 'regular' && r.participation !== 'bye')).toHaveLength(
      17,
    );
    expect(c.recaps.filter((r) => r.participation === 'bye')).toHaveLength(1);
    expect(c.status).toBe('postseason');
    expect(totals(c, 'regular').passingYards).toBe(4760);
    expect(c.milestones).toHaveLength(3);
  });
  it('rejects invalid stats and duplicate or out-of-order recaps', () => {
    const c = resolveAll(drafted());
    const r = game(c);
    expect(() => submitRecap(c, { ...r, week: 2 })).toThrow('schedule');
    expect(() => submitRecap(c, { ...r, stats: { ...r.stats, completions: 40 } })).toThrow();
    expect(() => submitRecap(c, { ...r, participation: 'inactive' })).toThrow();
    const wr = resolveAll(drafted('dependable'));
    const w = game(wr);
    expect(() => submitRecap(wr, { ...w, stats: { ...w.stats, receptions: 11 } })).toThrow();
  });
});
describe('all authored branches and season endings', () => {
  it('can reach a strained ending without requesting a trade or choosing the independent legacy', () => {
    let c = drafted('succession');
    const choices: Record<string, string> = {
      arrival: 'compete',
      response: 'alone',
      pressure: 'ready',
      turn: 'job',
      finish: 'share',
    };
    while (c.status === 'season') {
      const e = pendingEvent(c);
      if (e) c = resolveChoice(c, choices[e.id]);
      else c = submitRecap(c, { ...game(c), stats: { ...emptyStats } });
    }
    c = choosePostseason(c, 'none');
    expect(c.ending).toContain(getStory('succession').endings.strained);
  });
  for (const story of stories) {
    it(`${story.name}: supports a full rookie year, postseason and distinct choices`, () => {
      const good = regularSeason(story.id, 0);
      expect(good.choices).toHaveLength(5);
      expect(careerSchema.safeParse(good).success).toBe(true);
      let finished = choosePostseason(good, good.game === 'nba2k' ? 'wildcard' : 'divisional');
      while (finished.status !== 'complete') finished = submitRecap(finished, game(finished));
      expect(finished.recaps.filter((r) => r.phase === 'playoff')).toHaveLength(
        good.game === 'nba2k' ? 16 : 3,
      );
      expect(finished.ending).toContain('championship');
      expect(finished.flags).toContain('champion');
      const bold = choosePostseason(regularSeason(story.id, 1), 'none');
      expect(bold.ending).not.toEqual(finished.ending);
      expect(bold.ending).toContain(getStory(story.id).endings.independent);
      const restored = parseSave(
        JSON.stringify({ ...initialState, careers: [finished], activeId: finished.id }),
      );
      expect(restored.careers[0]).toEqual(finished);
    });
    for (const event of story.events)
      for (const ch of event.choices)
        it(`${story.id}/${event.id}/${ch.id} is reachable and has a persistent consequence`, () => {
          let c = drafted(story.id);
          while (pendingEvent(c)?.id !== event.id) {
            if (pendingEvent(c)) c = resolveAll(c);
            else c = submitRecap(c, game(c));
          }
          const before = c;
          c = resolveChoice(c, ch.id);
          expect(c.choices.at(-1)?.choiceId).toBe(ch.id);
          expect(c.timeline.length).toBeGreaterThan(before.timeline.length);
          expect(c.relationships).not.toEqual(before.relationships);
          expect(careerSchema.safeParse(c).success).toBe(true);
          if (ch.flag) expect(c.flags).toContain(ch.flag);
          if (ch.action) expect(c.actions.at(-1)?.status).toBe('pending');
        });
  }
  it('remembers the selected branch after reloading instead of rerolling', () => {
    let c = resolveChoice(drafted(), 'learn');
    c = submitRecap(c, game(c));
    expect(eventBody(c)).toContain('second chair');
    const saved = careerSchema.parse(JSON.parse(JSON.stringify(c)));
    expect(eventBody(saved)).toBe(eventBody(c));
    expect(pendingEvent(saved)?.id).toBe('response');
  });
  it('supports a wildcard loss and prevents invalid postseason ties or changed advancement', () => {
    let c = choosePostseason(regularSeason('dependable'), 'wildcard');
    const r = game(c, false);
    expect(() => submitRecap(c, { ...r, ownScore: 30 })).toThrow();
    c = submitRecap(c, r);
    expect(c.status).toBe('complete');
    expect(c.recaps.filter((r) => r.phase === 'playoff')).toHaveLength(1);
    expect(() => editRecap(c, { ...r, ownScore: 40 })).toThrow('advancement');
  });
});
describe('promises, manual consequences and corrections', () => {
  it('counts half-sacks toward promises and grants defensive milestones once', () => {
    let c = resolveAll(drafted('rush-hour'));
    c.promises = [
      {
        id: 'sacks',
        label: 'Three sacks',
        metric: 'sacks',
        target: 3,
        progress: 0,
        remaining: 3,
        status: 'active',
      },
    ];
    c = submitRecap(c, game(c));
    expect(c.promises[0].progress).toBe(1.5);
    c = resolveAll(c);
    c = submitRecap(c, game(c));
    expect(c.promises[0].status).toBe('kept');
    for (const id of ['last-line', 'green-dot', 'rush-hour'] as const) {
      const season = regularSeason(id);
      expect(season.milestones).toHaveLength(3);
      expect(new Set(season.milestones).size).toBe(3);
      expect(totals(season, 'regular').sacks).toBe(25.5);
    }
  });
  it('upgrades existing version-one offensive saves with zero defensive stats', () => {
    let c = resolveAll(drafted());
    c = submitRecap(c, game(c));
    const data = JSON.parse(JSON.stringify({ ...initialState, careers: [c], activeId: c.id }));
    for (const key of [
      'tackles',
      'tacklesForLoss',
      'sacks',
      'defensiveInterceptions',
      'passDeflections',
      'forcedFumbles',
      'fumbleRecoveries',
      'defensiveTD',
      'defensiveSnaps',
      'missedTackles',
    ])
      delete data.careers[0].recaps[0].stats[key];
    const restored = parseSave(JSON.stringify(data));
    expect(restored.careers[0].recaps[0].stats.sacks).toBe(0);
    expect(restored.careers[0].recaps[0].stats.passingYards).toBe(280);
  });
  it('pauses promises for injury, no snaps and bye; resolves only on appearances', () => {
    let c = resolveAll(drafted());
    c.promises = [
      {
        id: 'test',
        label: 'Two clean games',
        metric: 'clean',
        target: 2,
        progress: 0,
        remaining: 3,
        status: 'active',
      },
    ];
    c = submitRecap(c, { ...game(c), participation: 'injured', stats: { ...emptyStats } });
    expect(c.promises[0].remaining).toBe(3);
    c = resolveAll(c);
    c = submitRecap(c, { ...game(c), participation: 'inactive', stats: { ...emptyStats } });
    expect(c.promises[0].remaining).toBe(3);
    c = submitRecap(c, game(c));
    c = submitRecap(c, game(c));
    expect(c.promises[0].status).toBe('kept');
    let b = regularSeason('spotlight');
    b = choosePostseason(b, 'none');
    expect(b.promises.every((p) => p.status !== 'active')).toBe(true);
  });
  it('does not grant clean-game credit for zero pass attempts/targets', () => {
    let c = resolveAll(drafted());
    c.promises = [
      {
        id: 'test',
        label: 'Clean',
        metric: 'clean',
        target: 1,
        progress: 0,
        remaining: 1,
        status: 'active',
      },
    ];
    c = submitRecap(c, { ...game(c), stats: { ...emptyStats } });
    expect(c.promises[0].status).toBe('broken');
  });
  it('updates team only on a confirmed actual trade and handles unavailable changes', () => {
    let c = drafted();
    c.actions = [
      {
        id: 'trade',
        type: 'trade',
        title: 'Move',
        detail: 'Ask',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
    expect(() => resolveAction(c, 'trade', 'completed')).toThrow('actual new team');
    expect(c.draft?.team).toBe('Chicago Bears');
    const unavailable = resolveAction(c, 'trade', 'unavailable');
    expect(unavailable.draft?.team).toBe('Chicago Bears');
    expect(unavailable.actions[0].status).toBe('unavailable');
    c = resolveAction(c, 'trade', 'completed', 'Buffalo Bills');
    expect(c.draft?.team).toBe('Buffalo Bills');
    expect(c.flags).toContain('traded');
    expect(() => resolveAction(c, 'trade', 'completed', 'Dallas Cowboys')).toThrow('already');
  });
  it('does not pretend an unavailable depth-chart change happened', () => {
    const c = drafted();
    c.role = 'Developmental backup';
    c.actions = [
      {
        id: 'depth',
        type: 'depth',
        title: 'Try QB1',
        detail: 'Manually change',
        targetRole: 'QB1 trial',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ];
    expect(resolveAction(c, 'depth', 'unavailable').role).toBe('Developmental backup');
    expect(resolveAction(c, 'depth', 'completed').role).toBe('QB1 trial');
  });
  it('corrects stats without double rewards, replayed promises, or overwritten decisions', () => {
    let c = resolveAll(drafted());
    c = submitRecap(c, game(c));
    c = resolveAll(c);
    const original = c.recaps[0];
    const before = structuredClone(c);
    c = editRecap(c, { ...original, stats: { ...original.stats, passingYards: 400 } });
    expect(totals(c).passingYards).toBe(400);
    expect(c.points).toBe(before.points);
    expect(c.choices).toEqual(before.choices);
    expect(c.promises).toEqual(before.promises);
    expect(c.milestones).toEqual(before.milestones);
    expect(c.recaps[0].edited).toBe(true);
  });
  it('does not leak state between careers or import duplicate IDs', () => {
    const qb = drafted(),
      wr = drafted('dependable');
    const current = { ...initialState, careers: [qb, wr], activeId: qb.id };
    const changed = resolveChoice(qb, 'compete');
    expect(wr.relationships.teammate).toBe(50);
    expect(qb.relationships.teammate).toBe(50);
    expect(changed.relationships.teammate).toBe(38);
    const imported = mergeImport(current, current);
    expect(imported.careers).toHaveLength(4);
    expect(new Set(imported.careers.map((c) => c.id)).size).toBe(4);
    expect(imported.settings).toEqual(current.settings);
    expect(() => parseSave('{"version":99}')).toThrow('valid version 1');
    expect(() => appSchema.parse({ ...current, activeId: 'absent' })).toThrow();
  });
});

describe('running back and tight end progression', () => {
  it('counts both rushing and receiving production toward RB promises', () => {
    let c = resolveAll(drafted('carry-share'));
    c.promises = ['yards', 'touchdowns'].map((metric) => ({
      id: metric,
      label: metric,
      metric: metric as 'yards' | 'touchdowns',
      target: metric === 'yards' ? 140 : 2,
      progress: 0,
      remaining: 3,
      status: 'active' as const,
    }));
    c = submitRecap(c, game(c));
    expect(c.promises.map((p) => p.status)).toEqual(['kept', 'kept']);
    expect(c.promises.map((p) => p.progress)).toEqual([140, 2]);
  });
  it('requires actual involvement for a clean RB appearance and rejects a lost fumble', () => {
    let c = resolveAll(drafted('third-down'));
    c.promises = [
      {
        id: 'clean',
        label: 'Ball security',
        metric: 'clean',
        target: 3,
        progress: 0,
        remaining: 5,
        status: 'active',
      },
    ];
    for (const stats of [
      { ...emptyStats },
      { ...emptyStats, carries: 10 },
      { ...emptyStats, carries: 10, fumbles: 1 },
    ]) {
      c = resolveAll(c);
      c = submitRecap(c, { ...game(c), stats });
    }
    expect(c.promises[0].progress).toBe(1);
  });
  it.each(['carry-share', 'third-down', 'two-jobs', 'safety-valve'] as const)(
    '%s awards its three milestones only once and survives export',
    (id) => {
      const c = regularSeason(id);
      expect(c.milestones).toHaveLength(3);
      expect(new Set(c.milestones).size).toBe(3);
      const parsed = parseSave(JSON.stringify({ ...initialState, careers: [c], activeId: c.id }));
      expect(parsed.careers[0]).toEqual(c);
    },
  );
  it('loads older recaps without carries without changing their resolved story', () => {
    let c = resolveAll(drafted());
    c = submitRecap(c, game(c));
    const old = JSON.parse(JSON.stringify(c));
    delete old.recaps[0].stats.carries;
    const parsed = careerSchema.parse(old);
    expect(parsed.recaps[0].stats.carries).toBe(0);
    expect(parsed.choices).toEqual(c.choices);
  });
});
