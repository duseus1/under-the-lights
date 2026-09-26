import type { Position, Stats } from './types';
export const isDefense = (position: Position) => ['S', 'LB', 'EDGE'].includes(position);
export function featuredStats(position: Position, stats: Stats): [string, number][] {
  switch (position) {
    case 'PG':
      return [
        ['Points', stats.points],
        ['Assists', stats.assists],
      ];
    case 'QB':
      return [
        ['Passing yards', stats.passingYards],
        ['Total touchdowns', stats.passingTD + stats.rushingTD],
      ];
    case 'RB':
      return [
        ['Scrimmage yards', stats.rushingYards + stats.receivingYards],
        ['Total touchdowns', stats.rushingTD + stats.receivingTD],
      ];
    case 'TE':
    case 'WR':
      return [
        ['Receiving yards', stats.receivingYards],
        ['Receiving touchdowns', stats.receivingTD],
      ];
    case 'S':
      return [
        ['Interceptions', stats.defensiveInterceptions],
        ['Tackles', stats.tackles],
      ];
    case 'LB':
      return [
        ['Tackles', stats.tackles],
        ['Tackles for loss', stats.tacklesForLoss],
      ];
    case 'EDGE':
      return [
        ['Sacks', stats.sacks],
        ['Tackles for loss', stats.tacklesForLoss],
      ];
  }
}
export function performanceSummary(position: Position, s: Stats) {
  return isDefense(position)
    ? `${s.tackles} tackles, ${s.sacks} sacks, and ${s.defensiveInterceptions} interceptions`
    : featuredStats(position, s)
        .map(([label, value]) => `${value.toLocaleString()} ${label.toLowerCase()}`)
        .join(' and ');
}
