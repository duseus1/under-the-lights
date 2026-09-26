import { it, expect } from 'vitest';
import {
  createCareer,
  resolveAction,
  resolveChoice,
  pendingEvent,
  submitRecap,
  defaultRecap,
} from '../src/domain/engine';
import { claimRelationshipBenefits, relationshipTier } from '../src/domain/relationships';
import { careerSchema, rules, type Position } from '../src/domain/types';
import { positions } from '../src/data/positions';
import { resolveSideEvent } from '../src/domain/side-events';

function career(position: Position = 'PG', trust = 65) {
  const p = positions.find((p) => p.id === position)!;
  const a = rules.archetypes.find((a) => a.id === p.archetype)!;
  const c = createCareer(
    {
      name: 'Taylor James',
      number: 4,
      position,
      archetype: a.id,
      height: a.height,
      weight: a.weight,
      development: 'Normal',
      allocations: {},
    },
    p.story,
  );
  c.status = 'season';
  c.draft = {
    team: position === 'PG' ? 'Chicago Bulls' : 'Chicago Bears',
    round: 1,
    pick: 10,
    byeWeek: 9,
  };
  c.relationships.coach = trust;
  return c;
}
it.each([
  [39, 0],
  [40, 40],
  [64, 40],
  [65, 65],
  [79, 65],
  [80, 80],
  [89, 80],
  [90, 90],
  [100, 90],
])('score %s maps to tier %s', (score, min) => expect(relationshipTier(score).min).toBe(min));
it('earns a rotation opportunity once without changing role or minutes before confirmation', () => {
  const original = career();
  const c = claimRelationshipBenefits(original);
  expect(c.actions).toHaveLength(1);
  expect(c.role).toBe(original.role);
  expect(c.rotationMinutes).toBeNull();
  expect(c.actions[0].targetMinutes).toBe(24);
  expect(claimRelationshipBenefits(c)).toEqual(c);
  const applied = resolveAction(c, c.actions[0].id, 'completed');
  expect(applied.rotationMinutes).toBe(24);
  expect(applied.role).toBe('Rotation contributor');
  expect(() => resolveAction(applied, c.actions[0].id, 'completed')).toThrow();
  const unavailable = resolveAction(c, c.actions[0].id, 'unavailable');
  expect(unavailable.role).toBe(original.role);
  expect(unavailable.rotationMinutes).toBeNull();
});
it('higher tiers replace pending coach opportunities, preserve unrelated actions, and never regrant on score dips', () => {
  let c = claimRelationshipBenefits(career());
  c.actions.push({
    id: 'story-action',
    type: 'depth',
    status: 'pending',
    title: 'Story role',
    detail: 'A separate request',
    createdAt: 'today',
  });
  c.relationships.coach = 90;
  c = claimRelationshipBenefits(c);
  expect(c.actions[0].status).toBe('unavailable');
  expect(c.actions[1].status).toBe('pending');
  expect(c.actions[2].targetMinutes).toBe(34);
  expect(c.relationshipUnlocks).toEqual([65, 80, 90]);
  c = resolveAction(c, c.actions[2].id, 'completed');
  c.relationships.coach = 30;
  expect(claimRelationshipBenefits(c).role).toBe('Core starter');
  c.relationships.coach = 90;
  expect(claimRelationshipBenefits(c).actions).toHaveLength(3);
});
it.each(['QB', 'WR', 'RB', 'TE', 'S', 'LB', 'EDGE'] as Position[])(
  '%s earns a starting depth-chart action rather than basketball minutes',
  (position) => {
    const c = claimRelationshipBenefits(career(position, 80));
    expect(c.actions[0].targetRole).toBe('Starter');
    expect(c.actions[0].targetMinutes).toBeUndefined();
    expect(resolveAction(c, c.actions[0].id, 'completed').role).toBe('Starter');
  },
);
it('grants benefits from a main-story trust change and a postgame choice', () => {
  let c = career('PG', 79);
  c = resolveChoice(c, pendingEvent(c)!.choices[0].id);
  expect(c.relationshipUnlocks).toContain(80);
  let side = career('PG', 60);
  side = resolveChoice(side, pendingEvent(side)!.choices[0].id);
  side = submitRecap(side, {
    ...defaultRecap(side),
    opponent: 'Boston Celtics',
    ownScore: 100,
    opponentScore: 90,
    stats: { ...defaultRecap(side).stats, assists: 15 },
  });
  side.relationships.coach = 79;
  side = resolveSideEvent(side, side.sideEvents[0].id, 'credit');
  expect(side.relationshipUnlocks).toContain(80);
});
it('migrates old saves, isolates careers and does not grant new opportunities after retirement', () => {
  const original = career('PG', 90);
  const raw = JSON.parse(JSON.stringify(original));
  delete raw.relationshipUnlocks;
  delete raw.rotationMinutes;
  const c = claimRelationshipBenefits(careerSchema.parse(raw));
  expect(c.relationshipUnlocks).toEqual([65, 80, 90]);
  expect(original.relationshipUnlocks).toEqual([]);
  expect(careerSchema.parse(JSON.parse(JSON.stringify(c))).actions).toEqual(c.actions);
  original.status = 'complete';
  expect(claimRelationshipBenefits(original).actions).toHaveLength(0);
});
it('a kept promise can cross a coach tier and unlock a role without awarding extra development points',()=>{
  let c=career('PG',50);
  c=resolveChoice(c,pendingEvent(c)!.choices[0].id);
  c.relationships.coach=74;
  c.promises=[{id:'assist-promise',label:'Create a basket',metric:'assists',target:1,progress:0,remaining:1,status:'active'}];
  c=submitRecap(c,{...defaultRecap(c),opponent:'Boston Celtics',ownScore:100,opponentScore:90,stats:{...defaultRecap(c).stats,assists:1}});
  expect(c.relationships.coach).toBe(80);
  expect(c.relationshipUnlocks).toContain(80);
  expect(c.actions.find(a=>a.relationshipBenefit===80)?.targetMinutes).toBe(30);
});
