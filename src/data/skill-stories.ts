import type { Attribute, Position, PromiseState, StoryArc, StoryId } from '../domain/types';

interface SkillArc {
  id: StoryId;
  position: Position;
  name: string;
  subtitle: string;
  description: string;
  coach: string;
  mentor: string;
  skill: Attribute;
  role: string;
  depth: string;
  promise: { label: string; metric: PromiseState['metric']; target: number; games: number };
  titles: [string, string, string, string, string];
  scenes: [string, string, string, string, string];
  arrival: [string, string, string, string];
  connection: [string, string];
  endings: StoryArc['endings'];
}
// Shared pacing, individually authored situations. Each arc's flags live only in its own save.
function arc(s: SkillArc): StoryArc {
  return {
    id: s.id,
    position: s.position,
    name: s.name,
    subtitle: s.subtitle,
    description: s.description,
    endings: s.endings,
    events: [
      {
        id: 'arrival',
        after: 0,
        title: s.titles[0],
        speaker: s.coach,
        body: s.scenes[0],
        choices: [
          {
            id: 'foundation',
            label: s.arrival[0],
            description: s.arrival[1],
            outcome:
              'The staff gives you a defined foundation to build on. Your preparation will be part of every evaluation.',
            effects: { coach: 12, teammate: 5, reputation: -3 },
            flag: 'foundation',
            role: 'Developing offensive contributor',
          },
          {
            id: 'challenge',
            label: s.arrival[2],
            description: s.arrival[3],
            outcome:
              'The room hears your ambition. The coaches ask for evidence before they change the plan.',
            effects: { coach: -4, teammate: -5, reputation: 12 },
            flag: 'challenge',
            conflict: 'The staff and the rookie disagree about the next step.',
          },
        ],
      },
      {
        id: 'response',
        after: 1,
        title: s.titles[1],
        speaker: s.mentor,
        body: s.scenes[1],
        branches: [
          { flag: 'foundation', body: `${s.scenes[1]} ${s.connection[0]}` },
          { flag: 'challenge', body: `${s.scenes[1]} ${s.connection[1]}` },
        ],
        choices: [
          {
            id: 'share',
            label: 'Work through it together',
            description: 'Let a teammate challenge your technique and your explanation.',
            outcome:
              'You leave with a correction you can use and a teammate willing to keep investing in you.',
            effects: { coach: 4, teammate: 12 },
            flag: 'shared-work',
            rating: s.skill,
            resolveConflict: true,
          },
          {
            id: 'own',
            label: 'Bring your own answer',
            description:
              'Make your case with preparation instead of accepting the veteran’s approach.',
            outcome:
              'Your coach appreciates the initiative. The veteran steps back; the next answer will have to come from you.',
            effects: { coach: 7, teammate: -7, reputation: 5 },
            flag: 'own-method',
            conflict: 'You and the veteran are preparing separately.',
          },
        ],
      },
      {
        id: 'pressure',
        after: 5,
        title: s.titles[2],
        speaker: s.coach,
        body: s.scenes[2],
        choices: [
          {
            id: 'steady',
            label: 'Stay accountable to the assignment',
            description: 'Prioritize the offense’s plan over a personal headline.',
            outcome:
              'You keep the conversation inside the meeting room. Your teammates hear someone who will do the unglamorous part.',
            effects: { coach: 10, teammate: 8, reputation: -3 },
            flag: 'assignment-first',
          },
          {
            id: 'prove',
            label: 'Set a measurable standard',
            description: s.promise.label,
            outcome:
              'The staff writes down your target. The next three appearances will decide whether the confidence was earned.',
            effects: { coach: -4, teammate: -3, reputation: 10 },
            flag: 'public-standard',
            promise: s.promise,
          },
        ],
      },
      {
        id: 'turn',
        after: 11,
        title: s.titles[3],
        speaker: 'Offensive coordinator',
        body: s.scenes[3],
        choices: [
          {
            id: 'role',
            label: 'Build on the role you have earned',
            description: `Commit to being a ${s.role.toLowerCase()}.`,
            outcome:
              'You agree to a clear responsibility. The depth-chart change still needs to happen in your actual Franchise.',
            effects: { coach: 12, teammate: 10 },
            flag: 'role-accepted',
            role: s.role,
            resolveConflict: true,
            action: { type: 'depth', title: `Establish your ${s.position} role`, detail: s.depth },
          },
          {
            id: 'lead',
            label: 'Ask for the starting responsibility',
            description: 'Make the case for more snaps and accept a harder evaluation.',
            outcome:
              'The staff agrees to a trial. Your teammates will need the same clarity from you on the field.',
            effects: { coach: -3, teammate: -5, reputation: 10 },
            flag: 'starter-demand',
            role: `Starting ${s.position} trial`,
            action: {
              type: 'depth',
              title: `Begin the starting ${s.position} trial`,
              detail: `Move your player to the starting slot that matches your ${s.position} role in Madden, if available. Confirm the actual change here; do not assume it happened.`,
            },
          },
          {
            id: 'trade',
            label: 'Ask for a better fit',
            description: 'Pursue a team whose plan matches the player you want to become.',
            outcome:
              'The request is real. The move is not, until Madden completes it. You still owe this offense your preparation.',
            effects: { coach: -12, teammate: -8, reputation: 3 },
            flag: 'trade-request',
            conflict: 'Your role on this offense is unsettled.',
            action: {
              type: 'trade',
              title: 'Request a new offensive opportunity',
              detail:
                'Pursue a trade using available Franchise roster tools. Report the actual destination only once Madden completes the move. If no move is possible, mark the request unavailable.',
            },
          },
        ],
      },
      {
        id: 'finish',
        after: 18,
        title: s.titles[4],
        speaker: s.mentor,
        body: s.scenes[4],
        branches: [
          {
            flag: 'role-accepted',
            body: `${s.scenes[4]} You chose a defined role. Your teammate asks what you want to build on top of it.`,
          },
          {
            flag: 'starter-demand',
            body: `${s.scenes[4]} You asked for the starting responsibility. Your teammate wants to know whether you understand what comes with it.`,
          },
        ],
        choices: [
          {
            id: 'together',
            label: 'Be the player the offense can rely on',
            description: 'Make the people beside you part of the legacy.',
            outcome:
              'You ask what the unit needs from you next. The answer sounds less like an audition and more like a plan.',
            effects: { coach: 9, teammate: 13 },
            flag: 'unit-leader',
            resolveConflict: true,
            role: `Trusted ${s.position} leader`,
          },
          {
            id: 'legacy',
            label: 'Set your sights on being the difference',
            description: 'Put your individual ceiling at the center of the next chapter.',
            outcome:
              'You make the ambition explicit. Your teammates respect the honesty; next season will ask you to back it up.',
            effects: { coach: -3, teammate: -2, reputation: 14 },
            flag: 'own-legacy',
            role: `Emerging ${s.position} playmaker`,
          },
        ],
      },
    ],
  };
}

const specifications: SkillArc[] = [
  {
    id: 'carry-share',
    position: 'RB',
    name: 'Earn the carry',
    subtitle: 'One backfield. Not enough touches.',
    description:
      'A veteran owns the opening series. You have fresh legs and a different idea about how the workload should be divided.',
    coach: 'Running backs coach',
    mentor: 'Veteran running back',
    skill: 'ballCarrierVision',
    role: 'Backfield rotation',
    depth:
      'Place your player in the HB2 slot, if available. Keep the veteran ahead of you until your actual Franchise role changes.',
    promise: {
      label: 'Produce 240 scrimmage yards over your next three appearances',
      metric: 'yards',
      target: 240,
      games: 3,
    },
    titles: [
      'The shared locker',
      'Read the crease',
      'Counting carries',
      'A workload worth owning',
      'The fourth-quarter back',
    ],
    scenes: [
      'Your locker is beside the veteran’s. The coach puts two names on the opening script. “You can compete without turning every handoff into a referendum.”',
      'The veteran rewinds a run with an untouched cutback lane. He asks whether you saw the opening or decided where to go before the snap.',
      'Questions about the committee follow you out of the meeting room. The coach wants to know whether the workload debate is going to become a weekly distraction.',
      'The staff is planning the stretch run. A clear rotation would protect both backs, but you see a chance to ask for the lead job.',
      'The veteran leaves the final film session open on a fourth-quarter drive. “What kind of back do you want beside you when your legs go?”',
    ],
    arrival: [
      'Learn the rotation',
      'Earn carries through preparation and shared film work.',
      'Compete for the opening series',
      'Make your ambition clear before the rotation is settled.',
    ],
    connection: [
      'He offers to walk through the protection checks after practice.',
      'He asks you to explain why your read deserves the first carry.',
    ],
    endings: {
      earned:
        'You stopped treating shared carries as borrowed opportunities. The room trusts you to finish a drive and to help the next back finish his.',
      strained:
        'The workload stayed a negotiation. Your ability brought opportunities, but the room still needs to know whether you can share responsibility.',
      independent:
        'You made the case for a backfield built around you. A bigger workload now comes with nowhere to hide from the small mistakes.',
    },
  },
  {
    id: 'third-down',
    position: 'RB',
    name: 'More than a checkdown',
    subtitle: 'The ball is only half the job.',
    description:
      'Your hands create opportunities. Protection meetings decide whether the coaches let you stay on the field to take them.',
    coach: 'Pass-game coordinator',
    mentor: 'Veteran quarterback',
    skill: 'passBlock',
    role: 'Third-down back',
    depth:
      'Assign your player to the third-down HB slot where available. Confirm the change only after applying it in Franchise.',
    promise: {
      label:
        'Finish three appearances without a lost fumble or dropped target; each needs a carry or target',
      metric: 'clean',
      target: 3,
      games: 3,
    },
    titles: [
      'The empty protection chair',
      'Six rushers, five answers',
      'A package or a player?',
      'The passing-down job',
      'The last check',
    ],
    scenes: [
      'The coordinator circles your name on a passing package, then moves the protection quiz in front of you. “A good route cannot fix a free rusher.”',
      'The quarterback stays after the install. He draws a pressure look and waits for you to name your responsibility before he explains his own.',
      'The package is becoming a label. You want more than receiving work; the staff wants dependability before it expands your menu.',
      'A defined third-down role is available. You can own that work, push for the starting backfield job, or ask to find a different fit.',
      'The quarterback asks you to lead one final protection meeting. Nobody is handing you the answers this time.',
    ],
    arrival: [
      'Learn the protection first',
      'Make being trusted on passing downs your first priority.',
      'Lead with the receiving mismatch',
      'Ask the staff to create touches while you learn the rest.',
    ],
    connection: [
      'He shares the checks he prefers against late pressure.',
      'He asks how a free rusher would affect the route you want to run.',
    ],
    endings: {
      earned:
        'You became part of the quarterback’s plan before the ball was snapped. The checkdown is an opportunity now, not the whole description of your game.',
      strained:
        'The receiving talent survived every meeting. The unanswered protection questions kept following it onto the field.',
      independent:
        'You refused to accept a narrow package as your ceiling. Your next opportunity will demand an answer for every down, not just the passing ones.',
    },
  },
  {
    id: 'two-jobs',
    position: 'TE',
    name: 'Between two rooms',
    subtitle: 'A receiver’s hands. A lineman’s work.',
    description:
      'The receiving room sees a matchup weapon. The line coach sees an unfinished blocker. Both want your limited practice time.',
    coach: 'Tight ends coach',
    mentor: 'Veteran tight end',
    skill: 'runBlock',
    role: 'Two-tight-end contributor',
    depth:
      'Use the TE2 slot for your player, if available, and play the two-tight-end packages your Franchise actually provides.',
    promise: {
      label: 'Produce 150 receiving yards over your next three appearances',
      metric: 'yards',
      target: 150,
      games: 3,
    },
    titles: [
      'Two meeting invitations',
      'The edge of the formation',
      'Invisible work',
      'Choose your responsibility',
      'A complete assignment',
    ],
    scenes: [
      'Two coaches have booked you for the same hour. One wants seam timing. The other wants your first step on an outside run. Neither thinks his work can wait.',
      'The veteran tight end brings two clips to the same meeting: a clean release and a block that holds the edge. He wants you to explain the footwork they share.',
      'The public questions focus on catches. Inside the building the staff is discussing assignments. You can defend the complete job or promise a receiving answer they can measure.',
      'The staff offers a defined role in two-tight-end personnel. You have to decide whether a shared job is a foundation or a limit.',
      'The veteran asks you to describe a good game without mentioning a catch. Then he asks you to describe one without mentioning a block.',
    ],
    arrival: [
      'Learn both jobs',
      'Accept the extra preparation needed to be trusted at the line and in space.',
      'Ask to feature your receiving tools',
      'Push for a receiving identity while the blocking develops.',
    ],
    connection: [
      'He helps build a practice plan that makes room for both coaches.',
      'He challenges you to explain which assignments the offense can afford to lose.',
    ],
    endings: {
      earned:
        'You stopped being passed between two meeting rooms and became someone both rooms could use. Your role rests on preparation that rarely makes a highlight.',
      strained:
        'Both rooms saw flashes. Neither consistently knew which version of you was arriving at practice.',
      independent:
        'You chose to define the position on your own terms. The freedom you want will have to be supported by the assignments you once wanted to leave behind.',
    },
  },
  {
    id: 'safety-valve',
    position: 'TE',
    name: 'The quarterback’s answer',
    subtitle: 'Find the window. Earn the throw.',
    description:
      'The quarterback already has a trusted target. You must earn the timing and honesty that turn a young tight end into an answer under pressure.',
    coach: 'Pass-game coordinator',
    mentor: 'Starting quarterback',
    skill: 'catchInTraffic',
    role: 'Trusted TE rotation',
    depth:
      'Use TE2 as a rotation role where available. Choose actual passing packages in Franchise; the companion cannot guarantee targets.',
    promise: {
      label: 'Catch two touchdowns over your next three appearances',
      metric: 'touchdowns',
      target: 2,
      games: 3,
    },
    titles: [
      'An occupied window',
      'A route after practice',
      'Trust on third down',
      'A place in the progression',
      'The throw before the break',
    ],
    scenes: [
      'The quarterback points to the veteran tight end’s landmark on the install sheet. You can reach the same spot faster, but he asks whether you will recognize when to stop.',
      'After practice the quarterback asks for one route against three imaginary coverages. There is no defender to blame if you disagree about the window.',
      'Every third-down conversation seems to become a question about trust. You can commit to the timing work or put a touchdown target on the board.',
      'The coordinator is setting the passing rotation for the stretch run. A clear supporting role is available; becoming the first option will need a harder conversation.',
      'The quarterback closes the playbook. “When I throw before your break, what am I trusting?” He waits for an answer about more than your hands.',
    ],
    arrival: [
      'Earn the timing',
      'Start by learning the quarterback’s landmarks and checks.',
      'Ask to challenge the coverage',
      'Make your athletic mismatch the case for early opportunities.',
    ],
    connection: [
      'He stays for extra repetitions and lets you call the coverage adjustment.',
      'He asks you to repeat the route until you agree where the ball should go.',
    ],
    endings: {
      earned:
        'The quarterback learned where you would be before he could see you. Your best catches began in the conversations nobody watched.',
      strained:
        'You made catches worth replaying, but the timing still needed a conversation every week. Being open and being trusted remained different milestones.',
      independent:
        'You asked to become the answer instead of the outlet. The next chapter will test whether you can carry that expectation when the defense knows it too.',
    },
  },
];
export const skillStories = specifications.map(arc);
