import balance from '../data/game-rewards.json';
import type { Position, Recap } from './types';
export interface GameReward {
  version: number;
  total: number;
  items: { label: string; points: number }[];
}
export function gameReward(
  position: Position,
  recap: Pick<Recap, 'participation' | 'stats'>,
): GameReward {
  if (recap.participation !== 'played') {
    const total = recap.participation === 'bye' ? balance.bye : balance.missedGame;
    return {
      version: balance.version,
      total,
      items: [
        {
          label:
            recap.participation === 'bye'
              ? 'Bye-week preparation'
              : 'Recovery / inactive preparation',
          points: total,
        },
      ],
    };
  }
  const s = recap.stats;
  const items = [{ label: 'Game participation', points: balance.base }];
  const tier = (v: number, thresholds: number[]) =>
    v >= thresholds[1] ? 2 : v >= thresholds[0] ? 1 : 0;
  const add = (label: string, points: number) => {
    if (points) items.push({ label, points });
  };
  let production = 0,
    efficient = false,
    impact = false,
    penalty = 0,
    description = '';
  if (position === 'QB') {
    const p = balance.profiles.QB;
    production = tier(s.passingYards + s.rushingYards, p.production);
    description = `${s.passingYards + s.rushingYards} passing + rushing yards`;
    efficient =
      s.attempts >= p.efficiencyAttempts &&
      (100 * s.completions) / s.attempts >= p.completionPercent &&
      s.interceptions + s.fumbles === 0;
    impact = s.passingTD + s.rushingTD >= p.impactTD;
    penalty = tier(s.interceptions + s.fumbles, balance.penalties.giveaways);
  } else if (position === 'WR' || position === 'TE') {
    const p = balance.profiles[position];
    production = tier(s.receivingYards, p.production);
    description = `${s.receivingYards} receiving yards`;
    efficient =
      s.targets >= p.efficiencyTargets &&
      (100 * s.receptions) / s.targets >= p.catchPercent &&
      s.drops === 0 &&
      s.fumbles === 0;
    impact = s.receivingTD + s.rushingTD >= 1;
    penalty = tier(s.drops + 2 * s.fumbles, balance.penalties.receiverErrors);
  } else if (position === 'RB') {
    const p = balance.profiles.RB;
    production = tier(s.rushingYards + s.receivingYards, p.production);
    description = `${s.rushingYards + s.receivingYards} scrimmage yards`;
    efficient =
      s.fumbles === 0 &&
      ((s.carries >= p.efficiencyCarries && s.rushingYards / s.carries >= p.yardsPerCarry) ||
        (s.receptions >= p.efficiencyCatches &&
          s.receivingYards >= p.efficiencyReceivingYards &&
          s.drops === 0));
    impact = s.rushingTD + s.receivingTD >= 1;
    penalty = tier(s.fumbles, balance.penalties.lostFumbles);
  } else if (position === 'PG') {
    const p = balance.profiles.PG;
    const score = s.points + 1.5 * s.assists + s.rebounds + 2 * (s.steals + s.blocks);
    production = tier(score, p.production);
    description = `${score} production score (PTS + 1.5×AST + REB + 2×STL/BLK)`;
    efficient =
      s.fieldGoalsAttempted >= p.efficiencyAttempts &&
      (100 * s.fieldGoalsMade) / s.fieldGoalsAttempted >= p.fieldGoalPercent &&
      s.turnovers <= p.cleanTurnovers;
    impact =
      [s.points, s.assists, s.rebounds, s.steals, s.blocks].filter((v) => v >= 10).length >= 2;
    penalty = tier(s.turnovers, balance.penalties.turnovers);
  } else {
    const score =
      s.tackles +
      2 * s.tacklesForLoss +
      3 * s.sacks +
      3 * (s.defensiveInterceptions + s.fumbleRecoveries) +
      s.passDeflections;
    production = tier(score, balance.profiles[position].production);
    description = `${score} activity score (TKL + 2×TFL + 3×SACK/INT/FR + PD)`;
    efficient =
      s.defensiveSnaps >= balance.defense.efficiencySnaps &&
      s.missedTackles <= balance.defense.maxMissedTackles;
    impact =
      s.sacks >= 1 ||
      s.defensiveInterceptions + s.forcedFumbles + s.fumbleRecoveries + s.defensiveTD >= 1;
    penalty = tier(s.missedTackles, balance.penalties.missedTackles);
  }
  add(`${production === 2 ? 'Standout' : 'Solid'} production · ${description}`, production);
  add('Efficient execution with enough recorded opportunities', Number(efficient));
  add(position === 'PG' ? 'Double-double impact' : 'Scoring / defensive impact', Number(impact));
  add('Recorded mistakes', -penalty);
  const raw = items.reduce((sum, i) => sum + i.points, 0);
  const total = Math.max(balance.minimum, Math.min(balance.maximum, raw));
  add(raw < total ? 'Participation floor' : 'Game reward cap', total - raw);
  return { version: balance.version, total, items };
}
export function rewardGuide(position: Position): string {
  const p = balance.profiles[position];
  const production =
    position === 'PG'
      ? 'PTS + 1.5×AST + REB + 2×(STL + BLK)'
      : position === 'QB'
        ? 'passing + rushing yards'
        : position === 'RB'
          ? 'rushing + receiving yards'
          : position === 'WR' || position === 'TE'
            ? 'receiving yards'
            : 'TKL + 2×TFL + 3×(SACK + INT + FR) + PD';
  const details: Record<Position, string> = {
    QB: 'Efficiency +1: at least 15 attempts, 65% completions, no interceptions or lost fumbles. Impact +1: three passing/rushing TDs. Two giveaways cost 1; four cost 2.',
    WR: 'Efficiency +1: at least five targets, 70% catches, no drops or lost fumbles. Impact +1: a receiving/rushing TD. Drops + twice lost fumbles: two costs 1; four costs 2.',
    TE: 'Efficiency +1: at least five targets, 70% catches, no drops or lost fumbles. Impact +1: a receiving/rushing TD. Drops + twice lost fumbles: two costs 1; four costs 2.',
    RB: 'Efficiency +1: no lost fumbles and either eight carries at 4.5 yards/carry, or four catches for 40 yards with no drops. Impact +1: a rushing/receiving TD. One lost fumble costs 1; two cost 2.',
    PG: 'Efficiency +1: at least eight FG attempts, 45% shooting and at most two turnovers. Impact +1: a double-double. Four turnovers cost 1; six cost 2.',
    S: 'Efficiency +1: at least 20 recorded snaps and at most one missed tackle. Impact +1: a sack, forced fumble, recovery, interception or defensive TD. Three missed tackles cost 1; five cost 2.',
    LB: 'Efficiency +1: at least 20 recorded snaps and at most one missed tackle. Impact +1: a sack, forced fumble, recovery, interception or defensive TD. Three missed tackles cost 1; five cost 2.',
    EDGE: 'Efficiency +1: at least 20 recorded snaps and at most one missed tackle. Impact +1: a sack, forced fumble, recovery, interception or defensive TD. Three missed tackles cost 1; five cost 2.',
  };
  return `One participation point. Production +1 at ${p.production[0]} or +2 at ${p.production[1]} (${production}); tiers do not stack. ${details[position]} Total stays between 1 and 5. Injury, inactivity and byes earn 1 preparation point. Milestones are separate. Only entered statistics can be evaluated; missing blocking or coverage grades are not inferred.`;
}
