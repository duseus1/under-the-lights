import data from '../data/side-events.json';
import { recentForm, tendencyDialogue } from './career-memory';
import type { Career, Recap } from './types';
import { syncRelationshipBenefits } from './relationships';
import { performanceTier, tierDescriptions, tierNames } from './achievements';

export function offerSideEvent(c: Career, r: Recap) {
  r.highlight = performanceTier(c, r);
  const highlight = r.highlight;
  if (!highlight) return;
  const major = highlight.tier === 'historic' || highlight.tier === 'exceptional';
  if (
    r.participation !== 'played' ||
    c.sideEvents.some((e) => (!major && e.status === 'pending') || e.sourceRecapId === r.id)
  )
    return;
  const previous = c.sideEvents.at(-1);
  if (previous && !major) {
    const index = c.recaps.findIndex((x) => x.id === previous.sourceRecapId);
    if (
      c.recaps.slice(index + 1).filter((x) => x.participation === 'played').length <
      data.cooldownAppearances
    )
      return;
  }
  const evidence = `${tierNames[highlight.tier]} performance. ${highlight.evidence}`;
  const template = data.events[c.sideEvents.length % data.events.length];
  const body = `${evidence}\n\n${tierDescriptions[highlight.tier]}\n\n${r.ownScore > r.opponentScore ? template.win : r.ownScore < r.opponentScore ? template.loss : template.tie}`;
  const at = new Date().toISOString();
  c.sideEvents.push({
    id: `side-${r.id}`,
    version: data.version,
    sourceRecapId: r.id,
    tier: highlight.tier,
    kind: template.kind as 'press' | 'coach' | 'teammate',
    title: template.title,
    speaker: template.speaker,
    body: [body, recentForm(c).body, tendencyDialogue(c)].filter(Boolean).join('\n\n'),
    evidence,
    choices: structuredClone(template.choices),
    status: 'pending',
    offeredAt: at,
  });
  c.timeline.push({
    id: crypto.randomUUID(),
    title: `${tierNames[highlight.tier]} game opens a side event`,
    body: `${template.title}. ${evidence} Optional conversation available in Your story.`,
    at,
    kind: 'story',
  });
}
export function resolveSideEvent(career: Career, id: string, choiceId: string | null): Career {
  const c = structuredClone(career);
  const event = c.sideEvents.find((e) => e.id === id);
  if (!event || event.status !== 'pending')
    throw new Error('This side event is no longer awaiting a response.');
  let outcome = 'You passed on this optional conversation. No relationship changes.';
  if (choiceId !== null) {
    const choice = event.choices.find((x) => x.id === choiceId);
    if (!choice) throw new Error('Choose an available response.');
    for (const k of ['coach', 'teammate', 'reputation'] as const)
      c.relationships[k] = Math.min(100, Math.max(0, c.relationships[k] + choice.effects[k]));
    event.choiceId = choice.id;
    event.choice = choice.label;
    outcome = choice.outcome;
    event.status = 'resolved';
  } else event.status = 'skipped';
  event.outcome = outcome;
  event.resolvedAt = new Date().toISOString();
  syncRelationshipBenefits(c);
  c.updatedAt = event.resolvedAt;
  c.timeline.push({
    id: crypto.randomUUID(),
    title: event.title,
    body: outcome,
    at: event.resolvedAt,
    kind: 'story',
  });
  return c;
}
