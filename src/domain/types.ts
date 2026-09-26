import { z } from 'zod';
import rawRules from '../data/rules.json';
import { leagueTeams } from '../data/games';
import { positions } from '../data/positions';
export const rules = rawRules;
export type Position = (typeof positions)[number]['id'];
export type Attribute = keyof typeof rules.attributes;
export type Ratings = Partial<Record<Attribute, number>>;
export type Archetype = (typeof rules.archetypes)[number];
export const storyIds = [
  'succession',
  'playbook',
  'dependable',
  'spotlight',
  'last-line',
  'positionless',
  'green-dot',
  'three-down',
  'rush-hour',
  'complete-edge',
  'carry-share',
  'third-down',
  'two-jobs',
  'safety-valve',
  'keys-to-offense',
] as const;
export type StoryId = (typeof storyIds)[number];
const integer = z.number().int();
const ratingsSchema = z
  .record(z.number().int().min(0).max(99))
  .refine((v) => Object.keys(v).every((k) => k in rules.attributes), 'Unknown attribute');
export const statsSchema = z
  .object({
    passingYards: integer.min(0).max(1500).default(0),
    passingTD: integer.min(0).max(30).default(0),
    interceptions: integer.min(0).max(30).default(0),
    completions: integer.min(0).max(100).default(0),
    attempts: integer.min(0).max(100).default(0),
    minutes: integer.min(0).max(80).default(0),
    points: integer.min(0).max(200).default(0),
    assists: integer.min(0).max(50).default(0),
    rebounds: integer.min(0).max(60).default(0),
    steals: integer.min(0).max(30).default(0),
    blocks: integer.min(0).max(30).default(0),
    turnovers: integer.min(0).max(40).default(0),
    fieldGoalsMade: integer.min(0).max(80).default(0),
    fieldGoalsAttempted: integer.min(0).max(100).default(0),
    threePointersMade: integer.min(0).max(60).default(0),
    threePointersAttempted: integer.min(0).max(80).default(0),
    freeThrowsMade: integer.min(0).max(80).default(0),
    freeThrowsAttempted: integer.min(0).max(100).default(0),
    carries: integer.min(0).max(100).default(0),
    rushingYards: integer.min(-100).max(1000).default(0),
    rushingTD: integer.min(0).max(30).default(0),
    receptions: integer.min(0).max(60).default(0),
    targets: integer.min(0).max(100).default(0),
    receivingYards: integer.min(-100).max(1500).default(0),
    receivingTD: integer.min(0).max(30).default(0),
    drops: integer.min(0).max(50).default(0),
    fumbles: integer.min(0).max(30).default(0),
    tackles: integer.min(0).max(60).default(0),
    tacklesForLoss: integer.min(0).max(30).default(0),
    sacks: z.number().min(0).max(20).multipleOf(0.5).default(0),
    defensiveInterceptions: integer.min(0).max(15).default(0),
    passDeflections: integer.min(0).max(30).default(0),
    forcedFumbles: integer.min(0).max(15).default(0),
    fumbleRecoveries: integer.min(0).max(15).default(0),
    defensiveTD: integer.min(0).max(15).default(0),
    defensiveSnaps: integer.min(0).max(150).default(0),
    missedTackles: integer.min(0).max(30).default(0),
  })
  .refine(
    (s) => s.completions <= s.attempts && s.receptions + s.drops <= s.targets,
    'Completions cannot exceed attempts; catches plus drops cannot exceed targets.',
  )
  .refine(
    (s) =>
      s.fieldGoalsMade <= s.fieldGoalsAttempted &&
      s.threePointersMade <= s.threePointersAttempted &&
      s.threePointersMade <= s.fieldGoalsMade &&
      s.threePointersAttempted <= s.fieldGoalsAttempted &&
      s.fieldGoalsMade - s.threePointersMade <= s.fieldGoalsAttempted - s.threePointersAttempted &&
      s.freeThrowsMade <= s.freeThrowsAttempted &&
      s.points === 2 * s.fieldGoalsMade + s.threePointersMade + s.freeThrowsMade,
    'Basketball shooting totals and points must agree.',
  );
export type Stats = z.infer<typeof statsSchema>;
export const emptyStats: Stats = {
  passingYards: 0,
  passingTD: 0,
  interceptions: 0,
  completions: 0,
  attempts: 0,
  minutes: 0,
  points: 0,
  assists: 0,
  rebounds: 0,
  steals: 0,
  blocks: 0,
  turnovers: 0,
  fieldGoalsMade: 0,
  fieldGoalsAttempted: 0,
  threePointersMade: 0,
  threePointersAttempted: 0,
  freeThrowsMade: 0,
  freeThrowsAttempted: 0,
  carries: 0,
  rushingYards: 0,
  rushingTD: 0,
  receptions: 0,
  targets: 0,
  receivingYards: 0,
  receivingTD: 0,
  drops: 0,
  fumbles: 0,
  tackles: 0,
  tacklesForLoss: 0,
  sacks: 0,
  defensiveInterceptions: 0,
  passDeflections: 0,
  forcedFumbles: 0,
  fumbleRecoveries: 0,
  defensiveTD: 0,
  defensiveSnaps: 0,
  missedTackles: 0,
};
export const recapSchema = z
  .object({
    id: z.string(),
    phase: z.enum(['preseason', 'regular', 'playoff']),
    week: integer.min(1).max(82),
    opponent: z.string().trim().min(1).max(80),
    ownScore: integer.min(0).max(300),
    opponentScore: integer.min(0).max(300),
    participation: z.enum(['played', 'injured', 'inactive', 'bye']),
    stats: statsSchema,
    note: z.string().max(1000),
    title: z.string().trim().max(80).optional(),
    team: z.string().max(80).optional(),
    reward: integer.min(0),
    highlight: z
      .object({
        version: integer.min(1),
        tier: z.enum(['breakout', 'standout', 'exceptional', 'historic']),
        evidence: z.string(),
      })
      .optional(),
    rewardBreakdown: z
      .object({
        version: integer.min(1),
        total: integer.min(0),
        items: z.array(z.object({ label: z.string(), points: integer })),
      })
      .optional(),
    edited: z.boolean().default(false),
  })
  .superRefine((r, ctx) => {
    if (
      r.rewardBreakdown &&
      (r.rewardBreakdown.total !== r.reward ||
        r.rewardBreakdown.items.reduce((sum, item) => sum + item.points, 0) !== r.reward)
    )
      ctx.addIssue({ code: 'custom', message: 'Reward breakdown does not match the saved award.' });
    if (r.participation !== 'played' && Object.values(r.stats).some((v) => v !== 0))
      ctx.addIssue({
        code: 'custom',
        message: 'Missed games and bye weeks must have zero player stats.',
      });
    if (r.participation === 'bye' && (r.ownScore || r.opponentScore || r.phase !== 'regular'))
      ctx.addIssue({
        code: 'custom',
        message: 'A bye has no score and only occurs in the regular season.',
      });
    if (r.phase === 'playoff' && r.ownScore === r.opponentScore)
      ctx.addIssue({ code: 'custom', message: 'Postseason games cannot end in a tie.' });
  });
export type Recap = z.infer<typeof recapSchema>;
const actionSchema = z.object({
  id: z.string(),
  type: z.enum(['ratings', 'depth', 'trade']),
  title: z.string(),
  detail: z.string(),
  status: z.enum(['pending', 'completed', 'unavailable']),
  createdAt: z.string(),
  resolution: z.string().optional(),
  targetRole: z.string().optional(),
  targetMinutes: integer.min(0).max(48).optional(),
  relationshipBenefit: integer.refine((v) => [65, 80, 90].includes(v)).optional(),
});
export type ManualAction = z.infer<typeof actionSchema>;
const promiseSchema = z.object({
  id: z.string(),
  label: z.string(),
  metric: z.enum([
    'yards',
    'clean',
    'touchdowns',
    'tackles',
    'sacks',
    'takeaways',
    'deflections',
    'assists',
  ]),
  target: integer.min(1),
  progress: z.number().min(0).multipleOf(0.5),
  remaining: integer.min(0),
  status: z.enum(['active', 'kept', 'broken']),
});
export type PromiseState = z.infer<typeof promiseSchema>;
export const careerSchema = z
  .object({
    id: z.string().min(1).max(100),
    version: z.literal(1),
    rulesVersion: z.literal(1),
    game: z.enum(['madden', 'nba2k']).default('madden'),
    seasonGames: integer.min(8).max(82).default(82),
    seriesWins: integer.min(0).max(4).default(0),
    seriesLosses: integer.min(0).max(4).default(0),
    createdAt: z.string(),
    updatedAt: z.string(),
    player: z.object({
      name: z.string().trim().min(1).max(40),
      number: integer.min(0).max(99),
      position: z.enum(['QB', 'WR', 'S', 'LB', 'EDGE', 'RB', 'TE', 'PG']),
      archetype: z.string(),
      height: integer.min(66).max(80),
      weight: integer.min(165).max(300),
      development: z.enum(['Normal', 'Star']),
      allocations: z.record(integer.min(0).max(4)),
    }),
    storyId: z.enum(storyIds),
    status: z.enum(['setup', 'draft', 'season', 'postseason', 'complete']),
    checklist: z.array(z.boolean()).length(4),
    draft: z
      .object({
        team: z.string(),
        round: integer.min(1).max(7),
        pick: integer.min(1).max(300),
        byeWeek: integer.min(1).max(18),
      })
      .nullable(),
    ratings: ratingsSchema,
    ceilings: ratingsSchema,
    initialRatings: ratingsSchema,
    points: integer.min(0),
    relationships: z.object({
      coach: integer.min(0).max(100),
      teammate: integer.min(0).max(100),
      reputation: integer.min(0).max(100),
    }),
    role: z.string().max(100),
    rotationMinutes: integer.min(0).max(48).nullable().default(null),
    relationshipUnlocks: z.array(integer.refine((v) => [65, 80, 90].includes(v))).default([]),
    flags: z.array(z.string()),
    promises: z.array(promiseSchema),
    conflicts: z.array(z.string()),
    recaps: z.array(recapSchema).max(110),
    undo: z.object({ label: z.string().max(160), before: z.string().max(2000000) }).optional(),
    moments: z
      .array(
        z.object({
          id: z.string().max(240),
          title: z.string().max(160),
          body: z.string().max(20000),
          at: z.string(),
        }),
      )
      .max(500)
      .default([]),
    awards: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          points: integer.min(0),
          at: z.string(),
        }),
      )
      .max(30)
      .default([]),
    recordBook: z
      .array(
        z.object({
          metric: z.string().refine((key) => key in emptyStats, 'Unknown record stat'),
          phase: z.enum(['regular', 'playoff']),
          scope: z.enum(['game', 'season']),
          value: z.number().finite().min(0).max(100000).multipleOf(0.5),
          holder: z.string().trim().min(1).max(100),
          level: z.enum(['league', 'franchise']).optional(),
          team: z.string().max(80).optional(),
          rookieOnly: z.boolean().optional(),
        }),
      )
      .max(100)
      .default([]),
    sideEvents: z
      .array(
        z.object({
          id: z.string(),
          version: integer.min(1),
          sourceRecapId: z.string(),
          kind: z.enum(['press', 'coach', 'teammate']),
          tier: z.enum(['breakout', 'standout', 'exceptional', 'historic']).optional(),
          title: z.string(),
          speaker: z.string(),
          body: z.string(),
          evidence: z.string(),
          status: z.enum(['pending', 'resolved', 'skipped']),
          offeredAt: z.string(),
          resolvedAt: z.string().optional(),
          choiceId: z.string().optional(),
          choice: z.string().optional(),
          outcome: z.string().optional(),
          choices: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                description: z.string(),
                outcome: z.string(),
                effects: z.object({ coach: integer, teammate: integer, reputation: integer }),
              }),
            )
            .min(1),
        }),
      )
      .max(110)
      .default([]),
    choices: z.array(
      z.object({
        eventId: z.string(),
        choiceId: z.string(),
        title: z.string(),
        choice: z.string(),
        outcome: z.string(),
        dialogue: z.string().max(20000).optional(),
        performance: z
          .object({
            version: integer.min(1),
            branchId: z.string(),
            label: z.string(),
            evidence: z.string(),
            body: z.string(),
          })
          .optional(),
        at: z.string(),
      }),
    ),
    actions: z.array(actionSchema),
    timeline: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string(),
        at: z.string(),
        kind: z.enum(['story', 'game', 'progression', 'setup', 'action']),
        sourceRecapId: z.string().optional(),
      }),
    ),
    playoffRound: integer.min(0).max(4),
    ending: z.string().nullable(),
    milestones: z.array(z.string()),
  })
  .superRefine((c, ctx) => {
    if (
      new Set(c.moments.map((m) => m.id)).size !== c.moments.length ||
      c.recaps.some((r) => r.team && !leagueTeams(c.game).includes(r.team))
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid moments or game team history.' });
    if (
      new Set(c.awards.map((a) => a.id)).size !== c.awards.length ||
      new Set(
        c.recordBook.map(
          (r) =>
            `${r.phase}-${r.scope}-${r.metric}-${r.level ?? 'league'}-${r.team ?? ''}-${!!r.rookieOnly}`,
        ),
      ).size !== c.recordBook.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate awards or league records.' });
    if (
      c.recordBook.some((r) =>
        r.level === 'franchise' ? !r.team || !leagueTeams(c.game).includes(r.team) : !!r.team,
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Franchise records need a team in this league.' });
    if ((c.player.position === 'PG') !== (c.game === 'nba2k'))
      ctx.addIssue({ code: 'custom', message: 'Position does not match game.' });
    if (
      c.draft &&
      (!leagueTeams(c.game).includes(c.draft.team) ||
        (c.game === 'nba2k' &&
          (c.draft.round > 2 ||
            c.draft.pick > 60 ||
            (c.draft.round === 1 && c.draft.pick > 30) ||
            (c.draft.round === 2 && c.draft.pick <= 30))))
    )
      ctx.addIssue({ code: 'custom', message: 'Draft result does not match this league.' });
    if (
      new Set(c.sideEvents.map((e) => e.id)).size !== c.sideEvents.length ||
      new Set(c.sideEvents.map((e) => e.sourceRecapId)).size !== c.sideEvents.length ||
      c.sideEvents.some(
        (e) =>
          !c.recaps.some((r) => r.id === e.sourceRecapId) ||
          (e.status !== 'pending' && (!e.resolvedAt || !e.outcome)) ||
          (e.status === 'resolved' && !e.choices.some((choice) => choice.id === e.choiceId)),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid side-event history.' });
    const archetype = rules.archetypes.find(
      (a) => a.id === c.player.archetype && a.position === c.player.position,
    );
    if (!archetype) {
      ctx.addIssue({ code: 'custom', message: 'Invalid archetype.' });
      return;
    }
    const attrs = Object.keys(archetype.ratings);
    if (
      [c.ratings, c.ceilings, c.initialRatings].some(
        (r) => Object.keys(r).length !== attrs.length || attrs.some((a) => r[a] === undefined),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Incomplete player ratings.' });
    if (
      Object.keys(c.player.allocations).some((a) => !attrs.includes(a)) ||
      Object.values(c.player.allocations).reduce((a, b) => a + b, 0) > rules.buildBudget
    )
      ctx.addIssue({ code: 'custom', message: 'Invalid attribute allocation.' });
    if (attrs.some((a) => c.ratings[a] > c.ceilings[a] || c.initialRatings[a] > c.ceilings[a]))
      ctx.addIssue({ code: 'custom', message: 'Ratings exceed potential.' });
    const positionStories: Record<Position, readonly string[]> = {
      QB: ['succession', 'playbook'],
      WR: ['dependable', 'spotlight'],
      S: ['last-line', 'positionless'],
      LB: ['green-dot', 'three-down'],
      EDGE: ['rush-hour', 'complete-edge'],
      RB: ['carry-share', 'third-down'],
      TE: ['two-jobs', 'safety-valve'],
      PG: ['keys-to-offense'],
    };
    if (!positionStories[c.player.position].includes(c.storyId))
      ctx.addIssue({ code: 'custom', message: 'Story does not match position.' });
    if (!['setup', 'draft'].includes(c.status) && !c.draft)
      ctx.addIssue({ code: 'custom', message: 'Career is missing its draft result.' });
    if (
      new Set(c.recaps.map((r) => r.id)).size !== c.recaps.length ||
      new Set(c.choices.map((r) => r.eventId)).size !== c.choices.length
    )
      ctx.addIssue({ code: 'custom', message: 'Duplicate career records.' });
  });
export type Career = z.infer<typeof careerSchema>;
export const appSchema = z
  .object({
    version: z.literal(1),
    careers: z.array(careerSchema).max(100),
    activeId: z.string().nullable(),
    settings: z.object({ theme: z.enum(['broadcast', 'cinematic']), reducedMotion: z.boolean() }),
  })
  .superRefine((s, ctx) => {
    if (new Set(s.careers.map((c) => c.id)).size !== s.careers.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate save IDs.' });
    if (s.activeId && !s.careers.some((c) => c.id === s.activeId))
      ctx.addIssue({ code: 'custom', message: 'Active career is missing.' });
  });
export type AppState = z.infer<typeof appSchema>;
export const initialState: AppState = {
  version: 1,
  careers: [],
  activeId: null,
  settings: { theme: 'broadcast', reducedMotion: false },
};
export interface StoryChoice {
  id: string;
  label: string;
  description: string;
  outcome: string;
  effects: Partial<Career['relationships']>;
  flag?: string;
  role?: string;
  conflict?: string;
  resolveConflict?: boolean;
  promise?: { label: string; metric: PromiseState['metric']; target: number; games: number };
  action?: { type: 'depth' | 'trade'; title: string; detail: string };
  rating?: Attribute;
}
export interface StoryEvent {
  id: string;
  title: string;
  speaker: string;
  body: string;
  after: number;
  choices: StoryChoice[];
  branches?: { flag: string; body: string }[];
}
export interface StoryArc {
  id: StoryId;
  position: Position;
  name: string;
  subtitle: string;
  description: string;
  events: StoryEvent[];
  endings: { earned: string; strained: string; independent: string };
}
