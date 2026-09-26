import data from '../data/achievements.json';
import records from '../data/league-records.json';
import { careerSchema, type Career, type Recap, type Stats } from './types';

export type Tier = NonNullable<Recap['highlight']>['tier'];
export const tierNames: Record<Tier, string> = {
  breakout: 'Breakout',
  standout: 'Standout',
  exceptional: 'Exceptional',
  historic: 'Historic',
};
export const tierDescriptions = data.tiers;
export const statName = (key: string) =>
  ({
    qbTD: 'combined touchdowns',
    rbTD: 'combined touchdowns',
    scrimmageYards: 'scrimmage yards',
    takeaways: 'takeaways',
    doubleDigits: 'double-digit categories',
    defensiveInterceptions: 'defensive interceptions',
    threePointersMade: 'three-pointers made',
  })[key] ?? key.replace(/([A-Z])/g, ' $1').toLowerCase();
export function metricValues(s: Stats): Record<string, number> {
  return {
    ...s,
    qbTD: s.passingTD + s.rushingTD,
    rbTD: s.rushingTD + s.receivingTD,
    scrimmageYards: s.rushingYards + s.receivingYards,
    takeaways: s.defensiveInterceptions + s.fumbleRecoveries,
    doubleDigits: [s.points, s.assists, s.rebounds, s.steals, s.blocks].filter((v) => v >= 10)
      .length,
  };
}
export function personalMetrics(c: Career): (keyof Stats)[] {
  if (c.game === 'nba2k')
    return ['points', 'assists', 'rebounds', 'steals', 'blocks', 'threePointersMade'];
  if (c.player.position === 'QB')
    return ['passingYards', 'passingTD', 'completions', 'rushingYards', 'rushingTD'];
  if (c.player.position === 'RB')
    return ['rushingYards', 'rushingTD', 'receivingYards', 'receivingTD', 'receptions'];
  if (['WR', 'TE'].includes(c.player.position))
    return ['receivingYards', 'receivingTD', 'receptions'];
  return [
    'tackles',
    'tacklesForLoss',
    'sacks',
    'defensiveInterceptions',
    'passDeflections',
    'forcedFumbles',
    'fumbleRecoveries',
    'defensiveTD',
  ];
}
export type LeagueRecord = Career['recordBook'][number] & { source?: string };
export const recordKey = (r: LeagueRecord) => `${r.phase}-${r.scope}-${r.metric}`;
export function leagueBook(c: Career): LeagueRecord[] {
  const defaults = records[c.game].map((r) => ({
    ...r,
    phase: r.phase as 'regular',
    scope: 'game' as const,
  }));
  const book = new Map<string, LeagueRecord>(defaults.map((r) => [recordKey(r), r]));
  for (const r of c.recordBook) book.set(recordKey(r), r);
  return [...book.values()].filter((r) => personalMetrics(c).includes(r.metric as keyof Stats));
}
export function recordValue(games: Recap[], record: LeagueRecord): number {
  const values = games
    .filter((r) => r.participation === 'played' && r.phase === record.phase)
    .map((r) => r.stats[record.metric as keyof Stats]);
  return record.scope === 'season' ? values.reduce((a, b) => a + b, 0) : Math.max(0, ...values);
}
export function performanceTier(c: Career, r: Recap): Recap['highlight'] {
  if (r.participation !== 'played') return;
  const index = c.recaps.findIndex((x) => x.id === r.id);
  const prior = index < 0 ? c.recaps : c.recaps.slice(0, index);
  const broken = leagueBook(c).filter((book) => {
    if (book.phase !== r.phase) return false;
    const before = recordValue(prior, book);
    const after = recordValue([...prior, r], book);
    // A season record is first broken once; game records may be extended later.
    return after > Math.max(book.value, before) && (book.scope === 'game' || before <= book.value);
  });
  const context = `vs ${r.opponent} (${r.ownScore}–${r.opponentScore}, ${r.phase} ${r.week})`;
  if (broken.length)
    return {
      version: data.version,
      tier: 'historic',
      evidence:
        broken
          .map(
            (book) =>
              `${recordValue([...prior, r], book)} ${statName(book.metric)} — ${book.phase} ${book.scope} league record; previous mark ${Math.max(book.value, recordValue(prior, book))}`,
          )
          .join('; ') + ` ${context}.`,
    };
  const appearances = prior.filter((x) => x.phase === r.phase && x.participation === 'played');
  const values = metricValues(r.stats);
  const thresholds = data.metrics[c.player.position];
  for (const tier of ['exceptional', 'standout', 'breakout'] as const) {
    for (const [key, minimum, increase, standout, exceptional] of thresholds) {
      const metric = String(key),
        value = values[metric];
      const average = appearances.length
        ? appearances.reduce((n, x) => n + metricValues(x.stats)[metric], 0) / appearances.length
        : 0;
      const qualifies =
        tier === 'breakout'
          ? appearances.length >= data.minimumAppearances &&
            value >= Number(minimum) &&
            value >= average * data.breakoutMultiplier &&
            value - average >= Number(increase)
          : value >= Number(tier === 'exceptional' ? exceptional : standout);
      if (qualifies)
        return {
          version: data.version,
          tier,
          evidence: `${value} ${statName(metric)} ${context}.${appearances.length ? ` Prior average: ${average.toFixed(1)} across ${appearances.length} played ${r.phase} games.` : ' No prior played games in this phase.'}`,
        };
    }
  }
}
type Award = { id: string; name: string; points: number; side?: string; postseason?: boolean };
export function availableAwards(c: Career): Award[] {
  const side = ['S', 'LB', 'EDGE'].includes(c.player.position) ? 'defense' : 'offense';
  return (data.awards[c.game] as Award[]).filter((a) => !a.side || a.side === side);
}
export function awardsUnlocked(c: Career) {
  return (
    c.recaps.filter((r) => r.phase === 'regular').length >=
    (c.game === 'nba2k' ? c.seasonGames : 18)
  );
}
export function awardEligible(c: Career, a: Award) {
  return (
    awardsUnlocked(c) &&
    (!a.postseason ||
      (c.status === 'complete' &&
        c.playoffRound === 4 &&
        c.recaps.some((r) => r.phase === 'playoff')))
  );
}
export function recordAward(career: Career, id: string): Career {
  const c = structuredClone(career),
    award = availableAwards(c).find((a) => a.id === id);
  if (!award || !awardEligible(c, award))
    throw new Error('This award is not available at this stage of your season.');
  if (c.awards.some((a) => a.id === id)) throw new Error('This award has already been recorded.');
  const at = new Date().toISOString();
  c.awards.push({ id, name: award.name, points: award.points, at });
  c.points += award.points;
  c.updatedAt = at;
  c.timeline.push({
    id: crypto.randomUUID(),
    at,
    kind: 'progression',
    title: award.name,
    body: `You reported this season award. +${award.points} progression points.`,
  });
  return c;
}
export function setLeagueRecord(career: Career, record: LeagueRecord): Career {
  const c = structuredClone(career);
  if (!personalMetrics(c).includes(record.metric as keyof Stats))
    throw new Error('Choose a stat for this position.');
  c.recordBook = c.recordBook.filter((r) => recordKey(r) !== recordKey(record));
  c.recordBook.push(record);
  c.updatedAt = new Date().toISOString();
  return careerSchema.parse(c);
}
