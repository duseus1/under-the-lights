import { careerSchema, type Career, type Recap, type Stats } from './types';
import { personalMetrics, statName } from './achievements';
import { gameReward } from './rewards';
import formData from '../data/career-memory.json';

export function trends(c: Career, phase: Recap['phase'] = 'regular') {
  const games = c.recaps.filter((r) => r.phase === phase && r.participation === 'played');
  const recent = games.slice(-5),
    previous = games.slice(-10, -5);
  const sum = (sample: Recap[], key: keyof Stats) => sample.reduce((n, r) => n + r.stats[key], 0);
  const metrics = personalMetrics(c).map((key) => ({
    label: `${statName(key)} / game`,
    value: (sample: Recap[]): number | null =>
      sample.length ? sum(sample, key) / sample.length : null,
  }));
  const ratio = (
    label: string,
    numerator: keyof Stats,
    denominator: keyof Stats,
    scale: number,
  ) => {
    metrics.push({
      label,
      value: (sample) =>
        sum(sample, denominator)
          ? (scale * sum(sample, numerator)) / sum(sample, denominator)
          : null,
    });
  };
  if (c.player.position === 'QB') ratio('Completion %', 'completions', 'attempts', 100);
  if (c.player.position === 'RB') ratio('Yards / carry', 'rushingYards', 'carries', 1);
  if (c.game === 'nba2k') ratio('Field goal %', 'fieldGoalsMade', 'fieldGoalsAttempted', 100);
  return metrics.map((m) => ({
    label: m.label,
    current: m.value(recent),
    previous: m.value(previous),
    count: recent.length,
    previousCount: previous.length,
  }));
}

export function recentForm(c: Career) {
  const phase = c.recaps.at(-1)?.phase ?? 'regular';
  const games = c.recaps.filter((r) => r.phase === phase && r.participation === 'played').slice(-5);
  const scores = games.map((r) => gameReward(c.player.position, r).total);
  const last = scores.slice(-3);
  const tag =
    last.length < 3
      ? 'BUILDING'
      : last.every((n) => n >= 4)
        ? 'HOT'
        : last.every((n) => n <= 2)
          ? 'COLD'
          : last[0] < last[1] && last[1] < last[2] && last[2] - last[0] >= 2
            ? 'SURGING'
            : Math.max(...scores) - Math.min(...scores) >= 3
              ? 'INCONSISTENT'
              : 'STEADY';
  return {
    tag,
    body: formData.form[tag],
    evidence: `${games.length} played ${phase} games; performance grades (oldest first): ${scores.join(', ') || 'none'}. Grades use the existing 1–5 game-reward rules. Missed games and byes are excluded.`,
  };
}

export const tendencyNames = ['Team-first', 'Ambitious', 'Accountability', 'Defiant'] as const;
export function tendencies(c: Career) {
  const counts = Object.fromEntries(tendencyNames.map((t) => [t, 0])) as Record<
    (typeof tendencyNames)[number],
    number
  >;
  const add = (id: string, side = false, event = '') => {
    const map: Record<string, string[]> = side ? formData.sideChoices : formData.choices;
    for (const tag of map[`${c.storyId}/${event}/${id}`] ?? map[id] ?? [])
      counts[tag as keyof typeof counts]++;
  };
  c.choices.forEach((x) => add(x.choiceId, false, x.eventId));
  c.sideEvents.filter((x) => x.status === 'resolved').forEach((x) => add(x.choiceId!, true));
  return counts;
}
export function tendencyDialogue(c: Career) {
  const counts = tendencies(c);
  const tag = [...tendencyNames].sort((a, b) => counts[b] - counts[a]).find((t) => counts[t] >= 3);
  return tag ? formData.tendencies[tag] : '';
}
export function previously(c: Career): string[] {
  const last = c.choices.at(-1),
    game = c.recaps.filter((r) => r.participation === 'played').at(-1);
  return [
    last ? `${last.title}: ${last.choice}. ${last.outcome}` : '',
    c.promises.at(-1) ? `${c.promises.at(-1)!.label} — ${c.promises.at(-1)!.status}.` : '',
    game
      ? `${game.title || `${game.phase} ${game.week}`} vs ${game.opponent}: ${personalMetrics(c)
          .slice(0, 2)
          .map((k) => `${game.stats[k]} ${statName(k)}`)
          .join(', ')}${game.edited ? ' (corrected stats)' : ''}.`
      : '',
    `Current role: ${c.role}. Coach trust ${c.relationships.coach}; reputation ${c.relationships.reputation}.`,
  ].filter(Boolean);
}

// One complete checkpoint; any later career mutation closes the undo window.
export function prepareCareerChange(before: Career, next: Career): Career {
  const c = structuredClone(next);
  delete c.undo;
  const gameAdded = next.recaps.length === before.recaps.length + 1;
  const choiceAdded = next.choices.length === before.choices.length + 1;
  const sideResolved = next.sideEvents.find(
    (e) =>
      e.status !== 'pending' &&
      before.sideEvents.some((p) => p.id === e.id && p.status === 'pending'),
  );
  if (gameAdded || choiceAdded || sideResolved) {
    const snapshot = structuredClone(before);
    delete snapshot.undo;
    c.undo = {
      label: gameAdded
        ? `Game check-in: ${next.recaps.at(-1)!.opponent}`
        : choiceAdded
          ? next.choices.at(-1)!.title
          : sideResolved!.title,
      before: JSON.stringify(snapshot),
    };
  }
  return c;
}
export function undoCheckIn(c: Career): Career {
  if (!c.undo) throw new Error('No check-in can be undone.');
  const restored = careerSchema.parse(JSON.parse(c.undo.before));
  if (
    restored.id !== c.id ||
    restored.game !== c.game ||
    JSON.stringify(restored.player) !== JSON.stringify(c.player)
  )
    throw new Error('This checkpoint belongs to another career.');
  delete restored.undo;
  restored.updatedAt = new Date().toISOString();
  return restored;
}
export function remember(career: Career, id: string, title: string, body: string): Career {
  const c = structuredClone(career);
  if (c.moments.some((m) => m.id === id)) c.moments = c.moments.filter((m) => m.id !== id);
  else
    c.moments.push({
      id,
      title: title.slice(0, 160),
      body: body.slice(0, 20000),
      at: new Date().toISOString(),
    });
  c.updatedAt = new Date().toISOString();
  return careerSchema.parse(c);
}

export function correctionPreview(c: Career, r: Recap) {
  const old = c.recaps.find((x) => x.id === r.id);
  if (!old) return [];
  const games = c.recaps.filter((x) => x.phase === old.phase);
  return (Object.keys(r.stats) as (keyof Stats)[])
    .filter((k) => r.stats[k] !== old.stats[k])
    .map((k) => {
      const total = games.reduce((n, x) => n + x.stats[k], 0);
      const best = Math.max(0, ...games.map((x) => x.stats[k]));
      const newBest = Math.max(0, ...games.map((x) => (x.id === r.id ? r.stats[k] : x.stats[k])));
      return {
        label: statName(k),
        before: total,
        after: total - old.stats[k] + r.stats[k],
        best,
        newBest,
      };
    });
}
