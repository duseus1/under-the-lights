export const positions = [
  {
    id: 'QB',
    name: 'Quarterback',
    archetype: 'pocket',
    story: 'succession',
    madden: 'Create a QB in the draft class.',
  },
  {
    id: 'WR',
    name: 'Wide receiver',
    archetype: 'technician',
    story: 'dependable',
    madden: 'Create a WR in the draft class.',
  },
  {
    id: 'S',
    name: 'Safety',
    archetype: 'ball-hawk',
    story: 'last-line',
    madden:
      'Use FS or SS in Madden, matching your preferred safety role. The app groups both as Safety.',
  },
  {
    id: 'LB',
    name: 'Linebacker',
    archetype: 'field-general',
    story: 'green-dot',
    madden:
      'Use MLB, LOLB, or ROLB to match your scheme. Choose Edge Rusher instead for a primarily pass-rushing role.',
  },
  {
    id: 'EDGE',
    name: 'Edge Rusher',
    archetype: 'speed-edge',
    story: 'rush-hour',
    madden:
      'Use LE, RE, LOLB, or ROLB to match your scheme, and the appropriate rush-end slot where available.',
  },
  {
    id: 'RB',
    name: 'Running Back',
    archetype: 'elusive-back',
    story: 'carry-share',
    madden:
      'Create an HB in Madden. Match the third-down back and power-back slots to the role you actually play, where available.',
  },
  {
    id: 'TE',
    name: 'Tight End',
    archetype: 'vertical-te',
    story: 'two-jobs',
    madden:
      'Create a TE in Madden. Use the TE depth chart to match your receiving or blocking role.',
  },
  {
    id: 'PG',
    name: 'Point Guard',
    archetype: 'floor-general',
    story: 'keys-to-offense',
    madden:
      'Create a PG in an editable NBA 2K league. Apply the listed ratings manually; leave badges, animations, tendencies and other attributes under your control.',
  },
] as const;
