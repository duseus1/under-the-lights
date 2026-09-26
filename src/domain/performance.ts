import data from '../data/performance-dialogue.json';
import { emptyStats, type Career, type Stats, type StoryEvent } from './types';

export interface PerformanceReaction {
  version: number;
  branchId: string;
  label: string;
  evidence: string;
  body: string;
}
// Ordered authored rules. No randomness, network calls, or generated dialogue.
export function performanceReaction(
  c: Career,
  event: StoryEvent | null,
): PerformanceReaction | null {
  if (!event || event.after === 0) return null;
  const latest = c.recaps.at(-1);
  if (!latest) return null;
  const status =
    latest.participation === 'injured'
      ? data.injured
      : latest.participation === 'inactive'
        ? data.inactive
        : null;
  if (status)
    return {
      version: data.version,
      branchId: status.id,
      label: status.label,
      evidence: `Latest check-in: ${latest.participation}. Missed games are not graded as poor performances.`,
      body: status.body,
    };
  const lastPlayed = c.recaps
    .slice()
    .reverse()
    .find((r) => r.participation === 'played');
  if (!lastPlayed) return null;
  const games = c.recaps
    .filter((r) => r.participation === 'played' && r.phase === lastPlayed.phase)
    .slice(-data.window);
  const sums: Stats = { ...emptyStats };
  for (const r of games)
    for (const key of Object.keys(sums) as (keyof Stats)[]) sums[key] += r.stats[key];
  const extend = (s: Stats): Record<string, number> => ({
    ...s,
    giveaways: s.interceptions + s.fumbles,
    qbYards: s.passingYards + s.rushingYards,
    qbTD: s.passingTD + s.rushingTD,
    scrimmageYards: s.rushingYards + s.receivingYards,
    touches: s.carries + s.receptions,
    takeaways: s.defensiveInterceptions + s.fumbleRecoveries,
  });
  const metrics: Record<string, number> = {};
  for (const [key, value] of Object.entries(extend(sums))) {
    metrics[`sum.${key}`] = value;
    metrics[`avg.${key}`] = value / games.length;
  }
  for (const [key, value] of Object.entries(extend(lastPlayed.stats)))
    metrics[`last.${key}`] = value;
  metrics.fgPercent = sums.fieldGoalsAttempted
    ? (100 * sums.fieldGoalsMade) / sums.fieldGoalsAttempted
    : 0;
  metrics.completionPercent = sums.attempts ? (100 * sums.completions) / sums.attempts : 0;
  metrics.yardsPerCarry = sums.carries ? sums.rushingYards / sums.carries : 0;
  const matches = ([metric, op, target]: (string | number)[]) => {
    const actual = metrics[metric];
    if (actual === undefined || typeof target !== 'number') return false;
    return op === 'gte'
      ? actual >= target
      : op === 'lte'
        ? actual <= target
        : op === 'lt'
          ? actual < target
          : false;
  };
  const selected = data.profiles[c.player.position].find((rule) => rule.when.every(matches));
  const reaction = selected ?? data.steady;
  const names: Record<string, string> = {
    giveaways: 'giveaways',
    qbYards: 'passing + rushing yards',
    qbTD: 'passing + rushing touchdowns',
    scrimmageYards: 'rushing + receiving yards',
    touches: 'carries + receptions',
    takeaways: 'interceptions + fumble recoveries',
    fgPercent: 'field-goal percentage',
    completionPercent: 'completion percentage',
    yardsPerCarry: 'yards per carry',
  };
  const evidence = selected
    ? selected.when
        .map(([metric]) => {
          const key = String(metric);
          const [kind, stat] = key.split('.');
          const label =
            names[stat ?? kind] ?? (stat ?? kind).replace(/([A-Z])/g, ' $1').toLowerCase();
          return `${kind === 'last' ? 'Latest played game' : kind === 'avg' ? 'Per appearance in this sample' : 'Sample total'} · ${label}: ${Number(metrics[key].toFixed(1))}${key.endsWith('Percent') ? '%' : ''}`;
        })
        .join('; ')
    : 'No standout performance rule matched this sample; the conversation focuses on consistency.';
  const result =
    games.length === 3 && games.every((r) => r.ownScore < r.opponentScore)
      ? ' “The team has lost all three games in this sample. Your individual line is part of the conversation, but we also need to find what helps us win together.”'
      : games.length === 3 && games.every((r) => r.ownScore > r.opponentScore)
        ? ' “The team has won all three games in this sample. Keep the work honest; winning does not mean there is nothing left to improve.”'
        : '';
  return {
    version: data.version,
    branchId: `${c.player.position}:${reaction.id}`,
    label: reaction.label,
    evidence: `Based on ${games.length} recent played ${games.length === 1 ? 'appearance' : 'appearances'} in the ${lastPlayed.phase} phase. ${evidence}`,
    body: reaction.body + result,
  };
}
