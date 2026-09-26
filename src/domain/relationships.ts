import data from '../data/relationship-tiers.json';
import type { Career } from './types';
export const relationshipTiers = data.tiers;
export const coachBenefits = data.benefits;
export function relationshipTier(value: number) {
  return [...data.tiers].reverse().find((t) => value >= t.min) ?? data.tiers[0];
}
export function benefitLabel(c: Career, b: (typeof data.benefits)[number]) {
  return c.game === 'nba2k' ? `${b.basketballRole} · ${b.minutes} minutes/game` : b.footballRole;
}
// Earned role opportunities are permanent milestones, not an automatic demotion system.
export function syncRelationshipBenefits(c: Career) {
  if (!c.draft || ['setup', 'draft', 'complete'].includes(c.status)) return;
  const b = [...data.benefits].reverse().find((b) => c.relationships.coach >= b.min);
  if (!b || c.relationshipUnlocks.includes(b.min)) return;
  const at = new Date().toISOString();
  for (const benefit of data.benefits.filter((x) => x.min <= b.min))
    if (!c.relationshipUnlocks.includes(benefit.min)) c.relationshipUnlocks.push(benefit.min);
  for (const a of c.actions.filter((a) => a.relationshipBenefit && a.status === 'pending')) {
    a.status = 'unavailable';
    a.resolution = 'Replaced by a higher coach-trust opportunity.';
  }
  const basketball = c.game === 'nba2k';
  c.actions.push({
    id: crypto.randomUUID(),
    type: 'depth',
    status: 'pending',
    createdAt: at,
    relationshipBenefit: b.min,
    targetRole: basketball ? b.basketballRole : b.footballRole,
    ...(basketball ? { targetMinutes: b.minutes } : {}),
    title: `Coach trust unlocked: ${benefitLabel(c, b)}`,
    detail: basketball
      ? `In your NBA 2K league rotation, assign at least ${b.minutes} minutes per game${b.min >= 80 ? ' and a starting PG spot' : ''}. These targets assume 12-minute quarters; scale for shorter games. Balance the team rotation manually. This is a target, not a guarantee of actual minutes. If you already have a larger role or your mode cannot apply this change, mark unavailable with a note instead of reducing your role.`
      : `${b.football}${c.player.position === 'QB' ? ' For QB rotation, use situational opportunities where available rather than forcing a quarterback platoon.' : ''} If you already have a larger role or your Franchise cannot apply this opportunity, mark unavailable with a note instead of reducing your role.`,
  });
  c.timeline.push({
    id: crypto.randomUUID(),
    at,
    kind: 'story',
    title: relationshipTier(c.relationships.coach).coach,
    body: `Coach trust reached ${c.relationships.coach}. Earned ${benefitLabel(c, b)}. Confirm the roster change in Player progression before the app marks it applied.`,
  });
  c.updatedAt = at;
}
export function claimRelationshipBenefits(career: Career) {
  const c = structuredClone(career);
  syncRelationshipBenefits(c);
  return c;
}
