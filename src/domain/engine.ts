import { offerSideEvent } from './side-events';
import { recentForm, tendencyDialogue } from './career-memory';
import { syncRelationshipBenefits } from './relationships';
import { gameReward } from './rewards';
import { performanceReaction } from './performance';
import {
  careerSchema,
  emptyStats,
  recapSchema,
  rules,
  type Attribute,
  type Career,
  type Ratings,
  type Recap,
  type Stats,
  type StoryId,
} from './types';
import { getStory } from '../data/stories';
import { gameName, leagueTeams, isBasketball } from '../data/games';
import { isDefense, performanceSummary } from './position';

export const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const clamp = (n: number) => Math.min(100, Math.max(0, n));
const clone = (c: Career): Career => structuredClone(c);
export const archetypeFor = (id: string) => rules.archetypes.find((a) => a.id === id)!;
export const ratingLabel = (key: string) => rules.attributes[key as Attribute] ?? key;
export function buildRatings(
  archetype: string,
  height: number,
  weight: number,
  allocations: Record<string, number>,
) {
  const a = archetypeFor(archetype);
  if (!a) throw new Error('Choose an archetype.');
  if (
    !Number.isInteger(height) ||
    height < 66 ||
    height > 80 ||
    !Number.isInteger(weight) ||
    weight < 165 ||
    weight > 300
  )
    throw new Error('Height must be 66–80 inches and weight 165–300 lb.');
  if (
    Object.entries(allocations).some(
      ([k, v]) => !(k in a.ratings) || !Number.isInteger(v) || v < 0 || v > rules.maxAllocation,
    ) ||
    Object.values(allocations).reduce((s, v) => s + v, 0) > rules.buildBudget
  )
    throw new Error('Stay within the 12-point build budget (four per attribute).');
  const ratings: Ratings = { ...a.ratings };
  const ceilings: Ratings = { ...a.ceilings };
  // Size changes athleticism and ball security; never silently change potential.
  const speedAdjustment = Math.max(
    -3,
    Math.min(3, Math.floor((a.weight - weight) / 15) + Math.floor((a.height - height) / 3)),
  );
  ratings.speed! += speedAdjustment;
  ratings.acceleration! += speedAdjustment;
  const sizeAttribute = ratings.carrying === undefined ? 'strength' : 'carrying';
  ratings[sizeAttribute]! += Math.max(-2, Math.min(2, Math.floor((weight - a.weight) / 15)));
  for (const [key, value] of Object.entries(ratings))
    ratings[key as Attribute] = Math.min(
      ceilings[key as Attribute]!,
      value! + (allocations[key] ?? 0) * rules.ratingPerAllocation,
    );
  return { ratings, ceilings };
}
export function createCareer(player: Career['player'], storyId: StoryId): Career {
  const { ratings, ceilings } = buildRatings(
    player.archetype,
    player.height,
    player.weight,
    player.allocations,
  );
  const time = now();
  return careerSchema.parse({
    id: uid(),
    version: 1,
    rulesVersion: 1,
    createdAt: time,
    updatedAt: time,
    player,
    game: player.position === 'PG' ? 'nba2k' : 'madden',
    storyId,
    status: 'setup',
    checklist: [false, false, false, false],
    draft: null,
    ratings,
    ceilings,
    initialRatings: { ...ratings },
    points: 0,
    relationships: { coach: 50, teammate: 50, reputation: 40 },
    role: 'Draft prospect',
    flags: [],
    promises: [],
    conflicts: [],
    recaps: [],
    choices: [],
    actions: [],
    timeline: [
      {
        id: uid(),
        title: 'A career begins',
        body: `${player.name} · ${getStory(storyId).name}`,
        at: time,
        kind: 'setup',
      },
    ],
    playoffRound: 0,
    ending: null,
    milestones: [],
  });
}
function log(c: Career, title: string, body: string, kind: Career['timeline'][number]['kind']) {
  c.timeline.push({ id: uid(), title, body, kind, at: now() });
  c.updatedAt = now();
}
export function updateChecklist(career: Career, index: number, value: boolean) {
  const c = clone(career);
  if (c.status !== 'setup') throw new Error('Setup has already been completed.');
  c.checklist[index] = value;
  c.updatedAt = now();
  return c;
}
export function finishSetup(career: Career) {
  const c = clone(career);
  if (c.status !== 'setup' || !c.checklist.every(Boolean))
    throw new Error('Complete all setup steps first.');
  c.status = 'draft';
  log(
    c,
    'Ready for the draft',
    `Report ${gameName(c)}’s actual draft result when it is complete.`,
    'setup',
  );
  return c;
}
export function recordDraft(career: Career, draft: NonNullable<Career['draft']>) {
  const c = clone(career);
  if (c.status !== 'draft') throw new Error('Draft has already been recorded.');
  if (!leagueTeams(c.game).includes(draft.team)) throw new Error('Choose a team in this league.');
  c.draft = draft;
  c.status = 'season';
  c.role = (isBasketball(c) ? draft.pick <= 14 : draft.round <= 2)
    ? 'High-expectation rookie'
    : 'Rookie competing for a role';
  c.relationships.reputation += (isBasketball(c) ? draft.pick <= 14 : draft.round <= 2) ? 10 : 0;
  log(
    c,
    `Drafted by ${draft.team}`,
    `Round ${draft.round} · pick ${draft.pick}. The rookie season starts here.`,
    'setup',
  );
  return careerSchema.parse(c);
}
export function pendingEvent(c: Career) {
  if (c.status === 'setup' || c.status === 'draft') return null;
  return (
    getStory(c.storyId).events.find(
      (e) =>
        (isBasketball(c)
          ? e.after === 0
            ? 0
            : Math.max(1, Math.floor((e.after * c.seasonGames) / 82))
          : e.after) <= c.recaps.length && !c.choices.some((x) => x.eventId === e.id),
    ) ?? null
  );
}
export function eventBody(c: Career) {
  const event = pendingEvent(c);
  if (!event) return '';
  const branch = event.branches?.find((b) => c.flags.includes(b.flag));
  const reaction = performanceReaction(c, event);
  let context = '';
  if (event.id === 'arrival')
    context = `${c.draft!.team}. Round ${c.draft!.round}, pick ${c.draft!.pick}. ${(isBasketball(c) ? c.draft!.pick <= 14 : c.draft!.round <= 2) ? 'They invested early. Expectations arrive before you do.' : 'You were made to wait. Now you have a place to start.'} As a ${archetypeFor(c.player.archetype).name.toLowerCase()}, you bring a specific promise to this room.`;
  else {
    const last = c.recaps.at(-1);
    if (last && last.participation === 'played')
      context = `The last appearance produced ${performanceSummary(c.player.position, last.stats)}. ${c.relationships.coach >= 65 ? 'The staff has begun to trust your preparation.' : c.relationships.coach < 45 ? 'The staff is still waiting for a reason to trust you.' : 'The staff is still deciding what to make of you.'}`;
    else if (last)
      context =
        last.participation === 'injured'
          ? 'Your recovery has changed the rhythm of the week. The conversation still matters.'
          : 'Even without an appearance last time, your place in the room is changing.';
  }
  const promise = c.promises.at(-1);
  const followThrough =
    promise?.status === 'kept'
      ? 'You delivered on your promise. This room has evidence that your words mean something.'
      : promise?.status === 'broken'
        ? 'You missed the promise you made. Before anyone discusses the next opportunity, they want to know what will change.'
        : '';
  const tradeResult = c.actions.filter((a) => a.type === 'trade').at(-1);
  const situation =
    tradeResult?.status === 'completed'
      ? `The trade is real. You are having this conversation with your new team, ${c.draft!.team}, with your old reputation still following you.`
      : tradeResult?.status === 'unavailable'
        ? 'The trade did not happen. You still have to build a future in this locker room.'
        : tradeResult?.status === 'pending'
          ? 'Your trade request is still unresolved. Nobody in this room is treating a departure as certain.'
          : '';
  return [
    context,
    event.after > 0 && c.recaps.at(-1)?.participation === 'played' ? recentForm(c).body : '',
    event.after > 0 ? tendencyDialogue(c) : '',
    reaction ? (branch?.body ?? event.body) + '\n\n' + reaction.body : (branch?.body ?? event.body),
    followThrough,
    situation,
  ]
    .filter(Boolean)
    .join('\n\n');
}
function ratingAction(c: Career, detail: string) {
  const existing = c.actions.find((a) => a.type === 'ratings' && a.status === 'pending');
  if (existing) {
    existing.detail = detail;
    return;
  }
  c.actions.push({
    id: uid(),
    type: 'ratings',
    title: 'Reconcile player ratings',
    detail,
    status: 'pending',
    createdAt: now(),
  });
}
export function resolveChoice(career: Career, choiceId: string) {
  const c = clone(career),
    event = pendingEvent(c);
  if (!event) throw new Error('No story event is waiting.');
  const choice = event.choices.find((x) => x.id === choiceId);
  if (!choice) throw new Error('That choice is not available.');
  const dialogue = eventBody(c);
  const performance = performanceReaction(c, event);
  for (const [key, delta] of Object.entries(choice.effects)) {
    const k = key as keyof Career['relationships'];
    c.relationships[k] = clamp(c.relationships[k] + delta);
  }
  if (choice.flag && !c.flags.includes(choice.flag)) c.flags.push(choice.flag);
  if (choice.role && choice.action?.type !== 'depth') c.role = choice.role;
  if (choice.resolveConflict) c.conflicts = [];
  if (choice.conflict) c.conflicts.push(choice.conflict);
  if (choice.promise)
    c.promises.push({
      id: uid(),
      label: choice.promise.label,
      metric: choice.promise.metric,
      target: choice.promise.target,
      remaining: choice.promise.games,
      progress: 0,
      status: 'active',
    });
  if (choice.action)
    c.actions.push({
      id: uid(),
      ...choice.action,
      ...(choice.action.type === 'depth' ? { targetRole: choice.role } : {}),
      status: 'pending',
      createdAt: now(),
    });
  if (choice.rating && c.ratings[choice.rating] !== undefined) {
    c.ratings[choice.rating] = Math.min(c.ceilings[choice.rating]!, c.ratings[choice.rating]! + 1);
    ratingAction(
      c,
      `Story development improved ${ratingLabel(choice.rating)}. Apply all current target ratings shown in Progression.`,
    );
  }
  c.choices.push({
    eventId: event.id,
    choiceId: choice.id,
    title: event.title,
    choice: choice.label,
    outcome: choice.outcome,
    dialogue,
    ...(performance ? { performance } : {}),
    at: now(),
  });
  log(c, event.title, `${choice.label}. ${choice.outcome}`, 'story');
  syncRelationshipBenefits(c);
  return c;
}
export interface GameSlot {
  phase: Recap['phase'];
  week: number;
  label: string;
  bye: boolean;
}
export function nextGame(c: Career): GameSlot | null {
  if (isBasketball(c)) {
    if (c.status === 'season' && c.recaps.length < c.seasonGames)
      return {
        phase: 'regular',
        week: c.recaps.length + 1,
        label: 'Game ' + (c.recaps.length + 1),
        bye: false,
      };
    if (c.status === 'postseason' && c.playoffRound > 0)
      return {
        phase: 'playoff',
        week: c.recaps.filter((r) => r.phase === 'playoff').length + 1,
        label:
          ['', 'First round', 'Conference semifinals', 'Conference finals', 'NBA Finals'][
            c.playoffRound
          ] +
          ' · Game ' +
          (c.seriesWins + c.seriesLosses + 1) +
          ' · Series ' +
          c.seriesWins +
          '–' +
          c.seriesLosses,
        bye: false,
      };
    return null;
  }
  if (c.status === 'season') {
    const n = c.recaps.filter((r) => r.phase !== 'playoff').length;
    if (n < 3) return { phase: 'preseason', week: n + 1, label: `Preseason ${n + 1}`, bye: false };
    if (n < 21) {
      const week = n - 2;
      return { phase: 'regular', week, label: `Week ${week}`, bye: week === c.draft!.byeWeek };
    }
  }
  if (c.status === 'postseason' && c.playoffRound > 0)
    return {
      phase: 'playoff',
      week: c.playoffRound,
      label: ['', 'Wild Card', 'Divisional', 'Conference Championship', 'Championship'][
        c.playoffRound
      ],
      bye: false,
    };
  return null;
}
export function defaultRecap(c: Career): Recap {
  const slot = nextGame(c);
  if (!slot) throw new Error('No game is scheduled.');
  return {
    id: uid(),
    phase: slot.phase,
    week: slot.week,
    opponent: slot.bye ? 'Bye week' : '',
    ownScore: 0,
    opponentScore: 0,
    participation: slot.bye ? 'bye' : 'played',
    stats: { ...emptyStats },
    note: '',
    reward: 0,
    edited: false,
  };
}
export function totals(c: Career, phase?: Recap['phase']): Stats {
  return c.recaps
    .filter((r) => !phase || r.phase === phase)
    .reduce(
      (sum, r) => {
        for (const key of Object.keys(sum) as (keyof Stats)[]) sum[key] += r.stats[key];
        return sum;
      },
      { ...emptyStats },
    );
}
export function record(c: Career) {
  return c.recaps
    .filter((r) => r.phase === 'regular' && r.participation !== 'bye')
    .reduce(
      (s, r) => {
        if (r.ownScore > r.opponentScore) s.w++;
        else if (r.ownScore < r.opponentScore) s.l++;
        else s.t++;
        return s;
      },
      { w: 0, l: 0, t: 0 },
    );
}
function conclude(c: Career) {
  c.status = 'complete';
  const story = getStory(c.storyId);
  const bond = c.relationships.coach + c.relationships.teammate;
  const ending =
    c.flags.includes('trade-request') || c.flags.includes('own-legacy')
      ? 'independent'
      : bond >= 125
        ? 'earned'
        : 'strained';
  const season = record(c);
  const ring = c.flags.includes('champion')
    ? ' A championship caps the rookie year.'
    : c.recaps.some((r) => r.phase === 'playoff')
      ? ' The season reached the postseason.'
      : ' The season ends without a postseason appearance.';
  const path = c.choices.map((x) => x.choice).join(' → ');
  const stats = totals(c, 'regular');
  const output = performanceSummary(c.player.position, stats);
  c.ending = `${story.endings[ending]}${ring}\n\nYou finished with ${output}. ${season.w}–${season.l}${season.t ? `–${season.t}` : ''} regular-season record. Final story role: ${c.role}.\n\nYour path: ${path}.`;
  for (const p of c.promises.filter((p) => p.status === 'active')) {
    p.status = 'broken';
    c.relationships.reputation = clamp(c.relationships.reputation - 5);
    log(
      c,
      'Promise unfinished',
      `${p.label}. The season ended before the target was met.`,
      'story',
    );
  }
  log(c, 'The rookie chapter closes', c.ending, 'story');
}
function milestones(c: Career) {
  const s = totals(c, 'regular');
  const pos = c.player.position;
  const options =
    pos === 'PG'
      ? [
          ['points-500', s.points >= 500, '500 points'],
          ['assists-200', s.assists >= 200, '200 assists'],
          ['steals-50', s.steals >= 50, '50 steals'],
        ]
      : pos === 'QB'
        ? [
            ['yards-1000', s.passingYards >= 1000, '1,000 passing yards'],
            ['yards-3000', s.passingYards >= 3000, '3,000 passing yards'],
            ['td-20', s.passingTD + s.rushingTD >= 20, '20 total touchdowns'],
          ]
        : pos === 'WR'
          ? [
              ['yards-500', s.receivingYards >= 500, '500 receiving yards'],
              ['yards-1000', s.receivingYards >= 1000, '1,000 receiving yards'],
              ['td-8', s.receivingTD >= 8, '8 receiving touchdowns'],
            ]
          : pos === 'RB'
            ? [
                ['yards-500', s.rushingYards + s.receivingYards >= 500, '500 scrimmage yards'],
                ['yards-1000', s.rushingYards + s.receivingYards >= 1000, '1,000 scrimmage yards'],
                ['td-8', s.rushingTD + s.receivingTD >= 8, '8 total touchdowns'],
              ]
            : pos === 'TE'
              ? [
                  ['yards-400', s.receivingYards >= 400, '400 receiving yards'],
                  ['yards-800', s.receivingYards >= 800, '800 receiving yards'],
                  ['td-6', s.receivingTD >= 6, '6 receiving touchdowns'],
                ]
              : pos === 'S'
                ? [
                    ['tackles-50', s.tackles >= 50, '50 tackles'],
                    ['interceptions-3', s.defensiveInterceptions >= 3, '3 defensive interceptions'],
                    ['deflections-10', s.passDeflections >= 10, '10 pass deflections'],
                  ]
                : pos === 'LB'
                  ? [
                      ['tackles-75', s.tackles >= 75, '75 tackles'],
                      ['tackles-100', s.tackles >= 100, '100 tackles'],
                      ['tfl-8', s.tacklesForLoss >= 8, '8 tackles for loss'],
                    ]
                  : [
                      ['sacks-5', s.sacks >= 5, '5 sacks'],
                      ['sacks-10', s.sacks >= 10, '10 sacks'],
                      ['tfl-12', s.tacklesForLoss >= 12, '12 tackles for loss'],
                    ];
  for (const [id, achieved, title] of options)
    if (achieved && !c.milestones.includes(id as string)) {
      c.milestones.push(id as string);
      c.points += rules.milestoneReward;
      log(
        c,
        `${title}`,
        `Milestone earned: +${rules.milestoneReward} development points.`,
        'progression',
      );
    }
}
export function submitRecap(career: Career, input: Recap) {
  const c = clone(career),
    slot = nextGame(c);
  if (!slot) throw new Error('No game is scheduled.');
  if (pendingEvent(c)) throw new Error('Resolve your story event before advancing.');
  const r = recapSchema.parse(input);
  validateLeagueRecap(c, r);
  if (r.phase !== slot.phase || r.week !== slot.week || slot.bye !== (r.participation === 'bye'))
    throw new Error('This recap does not match your current schedule.');
  if (c.recaps.some((x) => x.id === r.id)) throw new Error('This game is already recorded.');
  r.rewardBreakdown = gameReward(c.player.position, r);
  r.reward = r.rewardBreakdown.total;
  r.edited = false;
  r.team = c.draft!.team;
  c.points += r.reward;
  c.recaps.push(r);
  if (r.participation === 'played') {
    for (const p of c.promises.filter((p) => p.status === 'active')) {
      p.remaining--;
      p.progress +=
        p.metric === 'assists'
          ? r.stats.assists
          : p.metric === 'tackles'
            ? r.stats.tackles
            : p.metric === 'sacks'
              ? r.stats.sacks
              : p.metric === 'takeaways'
                ? r.stats.defensiveInterceptions + r.stats.fumbleRecoveries
                : p.metric === 'deflections'
                  ? r.stats.passDeflections
                  : p.metric === 'yards'
                    ? Math.max(
                        0,
                        c.player.position === 'QB'
                          ? r.stats.passingYards + r.stats.rushingYards
                          : c.player.position === 'RB'
                            ? r.stats.rushingYards + r.stats.receivingYards
                            : r.stats.receivingYards,
                      )
                    : p.metric === 'touchdowns'
                      ? c.player.position === 'QB'
                        ? r.stats.passingTD + r.stats.rushingTD
                        : c.player.position === 'RB'
                          ? r.stats.rushingTD + r.stats.receivingTD
                          : isDefense(c.player.position)
                            ? r.stats.defensiveTD
                            : r.stats.receivingTD
                      : Number(
                          r.stats.fumbles === 0 &&
                            (c.player.position === 'QB'
                              ? r.stats.interceptions === 0 && r.stats.attempts > 0
                              : isDefense(c.player.position)
                                ? r.stats.missedTackles === 0 && r.stats.defensiveSnaps > 0
                                : r.stats.drops === 0 &&
                                  (r.stats.targets > 0 ||
                                    (c.player.position === 'RB' && r.stats.carries > 0))),
                        );
      if (p.progress >= p.target) {
        p.status = 'kept';
        c.relationships.coach = clamp(c.relationships.coach + 6);
        c.relationships.reputation = clamp(c.relationships.reputation + 8);
        log(c, 'Promise kept', p.label, 'story');
      } else if (p.remaining === 0) {
        p.status = 'broken';
        c.relationships.coach = clamp(c.relationships.coach - 6);
        c.relationships.reputation = clamp(c.relationships.reputation - 8);
        log(c, 'Promise broken', p.label, 'story');
      }
    }
  }
  offerSideEvent(c, r);
  syncRelationshipBenefits(c);
  milestones(c);
  log(
    c,
    slot.label,
    r.participation === 'bye'
      ? `Bye week · +${r.reward} development point`
      : `${r.ownScore}–${r.opponentScore} vs ${r.opponent} · ${r.participation} · +${r.reward} development points. ${r.rewardBreakdown.items.map((i) => `${i.label}: ${i.points > 0 ? '+' : ''}${i.points}`).join('; ')}`,
    'game',
  );
  c.timeline[c.timeline.length - 1].sourceRecapId = r.id;
  if (c.status === 'season' && c.recaps.length === (isBasketball(c) ? c.seasonGames : 21))
    c.status = 'postseason';
  else if (c.status === 'postseason' && isBasketball(c)) {
    if (r.ownScore > r.opponentScore) c.seriesWins++;
    else c.seriesLosses++;
    if (c.seriesLosses === 4) conclude(c);
    else if (c.seriesWins === 4) {
      if (c.playoffRound === 4) {
        c.flags.push('champion');
        conclude(c);
      } else {
        c.playoffRound++;
        c.seriesWins = 0;
        c.seriesLosses = 0;
      }
    }
  } else if (c.status === 'postseason') {
    if (r.ownScore < r.opponentScore) conclude(c);
    else if (c.playoffRound === 4) {
      c.flags.push('champion');
      conclude(c);
    } else c.playoffRound++;
  }
  return c;
}
export function editRecap(career: Career, input: Recap) {
  const c = clone(career),
    old = c.recaps.find((r) => r.id === input.id);
  if (!old) throw new Error('Game not found.');
  const r = recapSchema.parse({
    ...input,
    reward: old.reward,
    rewardBreakdown: old.rewardBreakdown,
    highlight: old.highlight,
    edited: true,
    phase: old.phase,
    week: old.week,
    team: old.team,
  });
  validateLeagueRecap(c, r);
  if ((old.participation === 'bye') !== (r.participation === 'bye'))
    throw new Error('A recorded bye cannot be changed into a game.');
  if (
    r.phase === 'playoff' &&
    Math.sign(r.ownScore - r.opponentScore) !== Math.sign(old.ownScore - old.opponentScore)
  )
    throw new Error(
      'A correction cannot change an already-resolved playoff advancement. Restore a backup to change that outcome.',
    );
  c.recaps = c.recaps.map((x) => (x.id === r.id ? r : x));
  const legacyTitle =
    old.phase === 'preseason'
      ? `Preseason ${old.week}`
      : old.phase === 'regular'
        ? `${isBasketball(c) ? 'Game' : 'Week'} ${old.week}`
        : '';
  const entry = c.timeline.find(
    (t) =>
      t.kind === 'game' && (t.sourceRecapId === r.id || (!!legacyTitle && t.title === legacyTitle)),
  );
  if (entry) entry.sourceRecapId = r.id;
  log(
    c,
    'Recap corrected',
    `${r.phase} ${r.week}: statistics updated. Previously awarded points, promises, story outcomes, and playoff advancement are preserved.`,
    'game',
  );
  return c;
}
export function choosePostseason(career: Career, start: 'none' | 'wildcard' | 'divisional') {
  const c = clone(career);
  if (c.status !== 'postseason' || c.playoffRound !== 0 || pendingEvent(c))
    throw new Error('Postseason entry is not available yet.');
  if (isBasketball(c) && start === 'divisional')
    throw new Error('NBA playoffs start in the first round.');
  if (start === 'none') conclude(c);
  else {
    c.playoffRound = start === 'wildcard' ? 1 : 2;
    log(
      c,
      isBasketball(c) ? 'Playoff basketball' : 'Postseason football',
      isBasketball(c)
        ? 'Qualified for the playoffs after any play-in. Four best-of-seven rounds begin now.'
        : start === 'divisional'
          ? 'First-round bye. Your next game is the Divisional round.'
          : 'The next chapter starts on Wild Card weekend.',
      'setup',
    );
  }
  return c;
}
export function upgradeCost(value: number) {
  return rules.upgradeTiers.find((t) => value < t.below)?.cost ?? Infinity;
}
export function upgrade(career: Career, attribute: Attribute) {
  const c = clone(career),
    value = c.ratings[attribute],
    ceiling = c.ceilings[attribute];
  if (value === undefined || ceiling === undefined || value >= ceiling)
    throw new Error('This attribute is already at its ceiling.');
  const cost = upgradeCost(value);
  if (c.points < cost) throw new Error('Not enough development points.');
  c.points -= cost;
  c.ratings[attribute] = value + 1;
  ratingAction(
    c,
    `Copy every current target rating from Progression into ${gameName(c)}, including automatic growth.`,
  );
  log(
    c,
    `${ratingLabel(attribute)} +1`,
    `${value} → ${value + 1} · ${cost} development point${cost > 1 ? 's' : ''}`,
    'progression',
  );
  return c;
}
export function reconcile(career: Career) {
  const c = clone(career);
  ratingAction(
    c,
    `Compare every target rating in Progression with ${gameName(c)}. Overwrite automatic progression for app-managed attributes.`,
  );
  log(
    c,
    'Ratings check requested',
    `Use the target ratings in Progression to reconcile ${gameName(c)}’s current values.`,
    'action',
  );
  return c;
}
export function resolveAction(
  career: Career,
  id: string,
  status: 'completed' | 'unavailable',
  team?: string,
  note = '',
) {
  const c = clone(career),
    a = c.actions.find((x) => x.id === id);
  if (!a || a.status !== 'pending') throw new Error('This action has already been resolved.');
  if (a.type === 'trade' && status === 'completed') {
    if (!team || !leagueTeams(c.game).includes(team) || team === c.draft?.team)
      throw new Error('Select the actual new team before completing a trade.');
    c.draft!.team = team;
    c.flags.push('traded');
    c.role = 'New arrival';
    c.conflicts = ['Establish your role with a new team.'];
  }
  if (a.type === 'depth' && status === 'completed' && a.targetRole) c.role = a.targetRole;
  if (a.type === 'depth' && status === 'completed' && a.targetMinutes !== undefined)
    c.rotationMinutes = Math.max(c.rotationMinutes ?? 0, a.targetMinutes);
  a.status = status;
  a.resolution =
    a.type === 'trade' && status === 'completed'
      ? `Traded to ${team}. ${note}`
      : note ||
        (status === 'completed'
          ? `Applied in ${gameName(c)}.`
          : 'Unavailable in this Franchise setup.');
  log(c, a.title, a.resolution, 'action');
  return c;
}

function validateLeagueRecap(c: Career, r: Recap) {
  if (!leagueTeams(c.game).includes(r.opponent) && r.participation !== 'bye')
    throw new Error('Choose an opponent in this league.');
  if (r.opponent === c.draft?.team) throw new Error('Choose an opposing team.');
  if (
    isBasketball(c) &&
    (r.ownScore === r.opponentScore || r.participation === 'bye' || r.stats.points > r.ownScore)
  )
    throw new Error(
      'Basketball games need a winner and player points cannot exceed the team score.',
    );
}
