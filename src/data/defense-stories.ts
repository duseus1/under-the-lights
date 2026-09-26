import type { Attribute, Position, PromiseState, StoryArc, StoryId } from '../domain/types';

interface DefensiveArc {
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
function arc(s: DefensiveArc): StoryArc {
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
            role: 'Developing defender',
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
            description: 'Prioritize the defense’s plan over a personal headline.',
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
        speaker: 'Defensive coordinator',
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
            description: 'Pursue a team whose plan matches the defender you want to become.',
            outcome:
              'The request is real. The move is not, until Madden completes it. You still owe this defense your preparation.',
            effects: { coach: -12, teammate: -8, reputation: 3 },
            flag: 'trade-request',
            conflict: 'Your role on this defense is unsettled.',
            action: {
              type: 'trade',
              title: 'Request a new defensive opportunity',
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
            label: 'Be the player the defense can rely on',
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

export const defenseStories: StoryArc[] = [
  arc({
    id: 'last-line',
    position: 'S',
    name: 'The last line',
    subtitle: 'One wrong step. Nobody behind you.',
    description:
      'You have the range to erase mistakes. The veteran safety wants to know whether he can trust you not to create them.',
    coach: 'Defensive backs coach',
    mentor: 'Veteran safety',
    skill: 'zoneCoverage',
    role: 'Trusted safety rotation',
    depth:
      'Use the backup FS or SS slot that matches your selected role in Madden, if available. This is a rotation assignment, not an automatic starting promotion.',
    promise: {
      label: 'Make three pass deflections in your next three appearances',
      metric: 'deflections',
      target: 3,
      games: 3,
    },
    titles: [
      'The empty grass behind you',
      'The call before the snap',
      'A step too far',
      'Who owns the rotation?',
      'The defense looks back',
    ],
    scenes: [
      'The coach freezes the film with the ball still in the quarterback’s hand. You can see an interception. He can see a receiver running behind you. “Which picture matters first?”',
      'The veteran safety meets you at the whiteboard. He draws the same formation three ways and asks which coverage call you would make.',
      'A risky break on the ball becomes the week’s teaching clip. Your range is not in question. The staff wants a standard for when you use it.',
      'The coordinator needs the secondary’s rotation settled. There are snaps available, but only if the safeties agree who owns the deep responsibility.',
      'The veteran points to a play on which nothing happened. Your positioning took away the throw. “Will that ever feel like enough to you?”',
    ],
    arrival: [
      'Own the deep responsibility',
      'Make dependable positioning the starting point.',
      'Trust your range',
      'Ask the staff to let you attack the quarterback’s eyes.',
    ],
    connection: [
      'He invites you to make the next call out loud.',
      '“Range cannot fix a call nobody else heard,” he says.',
    ],
    endings: {
      earned:
        'The quiet plays became your signature. Receivers stopped finding empty grass behind the defense, and the other safety stopped checking whether you were there.',
      strained:
        'Your range saved plays and your decisions created others. The secondary still needs your talent, but the trust behind you has not caught up.',
      independent:
        'You want to be more than the last line of protection. The next chapter will test whether you can hunt the ball without leaving the defense exposed.',
    },
  }),
  arc({
    id: 'positionless',
    position: 'S',
    name: 'A place in the defense',
    subtitle: 'Versatility is a gift. Until nobody gives you a home.',
    description:
      'The staff sees a safety who can play everywhere. You need to decide whether that is an opportunity or a way to keep you out of a permanent role.',
    coach: 'Defensive backs coach',
    mentor: 'Veteran nickel defender',
    skill: 'manCoverage',
    role: 'Hybrid safety rotation',
    depth:
      'Use a backup FS/SS slot and the available nickel or sub-package role that matches your Franchise. Only confirm assignments you can actually set.',
    promise: {
      label: 'Record fifteen tackles in your next three appearances',
      metric: 'tackles',
      target: 15,
      games: 3,
    },
    titles: [
      'Three meetings, one locker',
      'A different set of keys',
      'Where do you belong?',
      'A package with your name',
      'A position of your own',
    ],
    scenes: [
      'Your practice schedule sends you to the safety room, the nickel walkthrough, and the run-fit meeting. The coach calls it opportunity. You wonder when you will learn one job well enough to keep it.',
      'The nickel veteran lays out the checks he uses against motion. The coverage looks familiar, but the leverage rules are different from deep safety.',
      'A reporter asks what position you actually play. The staff has the same question in a different form: what responsibility will you make dependable every week?',
      'The coordinator offers a hybrid package. It could become a real identity or another collection of temporary assignments. You finally get a say in the plan.',
      'The veteran asks whether you still want one position printed beside your name. A season of different responsibilities has changed what that answer means.',
    ],
    arrival: [
      'Learn the whole picture',
      'Treat each room as part of one defensive education.',
      'Ask for a defined home',
      'Push for one safety assignment before taking on everything else.',
    ],
    connection: [
      'He sees the connections you have started making between rooms.',
      'He understands why you want a home. He also knows this assignment can earn snaps.',
    ],
    endings: {
      earned:
        'You built a role by understanding how the pieces fit. Versatility became a responsibility the staff could explain, and the defense could count on.',
      strained:
        'The staff kept moving you and you kept asking where you belonged. The position changed faster than the trust required to play it.',
      independent:
        'You decided that versatility should expand your opportunity, not postpone it. The next team meeting will begin with a clearer demand.',
    },
  }),
  arc({
    id: 'green-dot',
    position: 'LB',
    name: 'The voice in the huddle',
    subtitle: 'Before you can lead eleven, make them hear one.',
    description:
      'The middle of the defense needs a communicator. The veteran captain is not convinced the rookie is ready to carry the calls.',
    coach: 'Linebackers coach',
    mentor: 'Veteran defensive captain',
    skill: 'playRecognition',
    role: 'Rotational linebacker',
    depth:
      'Place your player in the appropriate backup MLB/LOLB/ROLB slot for your scheme. The story’s communication responsibility does not modify Madden’s captain or headset systems.',
    promise: {
      label: 'Record twenty tackles in your next three appearances',
      metric: 'tackles',
      target: 20,
      games: 3,
    },
    titles: [
      'Say it so they can hear you',
      'A formation after practice',
      'The late adjustment',
      'The defense needs a voice',
      'Who do they look toward?',
    ],
    scenes: [
      'The coach gives you the call and asks you to repeat it to an empty room. “If you hesitate here, they hesitate out there.” The captain watches without offering help.',
      'The captain stays after walkthrough with a stack of formation cards. He wants the front, the coverage, and the adjustment in one clear sentence.',
      'The offense changes the formation late. Your adjustment becomes a meeting-room debate: did you give everyone an answer, or only the players nearest you?',
      'The coordinator is deciding who should organize the front. Calling it is only part of the job; the other ten players have to believe you understand it.',
      'The captain asks who you were talking to when you made the biggest adjustment of the year: the coaches on the sideline, or the teammates waiting for your voice?',
    ],
    arrival: [
      'Learn the captain’s language',
      'Build authority by making the existing calls clear.',
      'Bring your own command',
      'Ask for the responsibility now and learn it under pressure.',
    ],
    connection: [
      'He starts asking for your explanation instead of giving you his.',
      'He wants to know whether your confidence survives the second adjustment.',
    ],
    endings: {
      earned:
        'You learned that command is a service. The defense heard your voice, understood the assignment, and started looking your way before you spoke.',
      strained:
        'You found your voice before the defense learned to trust it. The next step is making every player hear the same answer.',
      independent:
        'You want the defense organized around your command. Earning that authority will require more than being the loudest player in the huddle.',
    },
  }),
  arc({
    id: 'three-down',
    position: 'LB',
    name: 'Stay on the field',
    subtitle: 'Two downs are a role. Three downs are a statement.',
    description:
      'The team likes your instincts against the run. On passing downs, your number keeps disappearing from the personnel sheet.',
    coach: 'Linebackers coach',
    mentor: 'Veteran coverage linebacker',
    skill: 'zoneCoverage',
    role: 'Passing-down linebacker rotation',
    depth:
      'Use the appropriate SUBLB or linebacker rotation slot where your Franchise supports it. Confirm only the personnel assignment you can actually apply.',
    promise: {
      label: 'Make three pass deflections in your next three appearances',
      metric: 'deflections',
      target: 3,
      games: 3,
    },
    titles: [
      'Your helmet comes off on third down',
      'The seam behind the hook',
      'An easy completion',
      'The substitution sheet',
      'Three downs, one player',
    ],
    scenes: [
      'The coach praises your run fits, then hands you a substitution schedule. Third down belongs to someone else. “Earn that part separately,” he says.',
      'The coverage veteran shows you why a tight end can look covered and still be open. Your eyes, your depth, and the safety’s leverage all matter.',
      'A completion over the middle puts your coverage development back in the spotlight. The staff wants to know what you are willing to change to stay on the field.',
      'The coordinator has room for another passing-down linebacker. You can take a defined package, ask for a full-time trial, or admit that this depth chart may never give you enough space.',
      'The veteran asks whether you still think coverage is the price of admission or part of the player you want to be.',
    ],
    arrival: [
      'Earn the passing-down work',
      'Accept that coverage needs its own foundation.',
      'Challenge the substitution',
      'Ask to prove you can handle every down immediately.',
    ],
    connection: [
      'He shows you the landmark before showing you the interception.',
      'He asks you to explain the coverage from the safety’s perspective.',
    ],
    endings: {
      earned:
        'You stopped treating third down as someone else’s job. The staff found a place for you in the passing defense because your teammates could trust the space you owned.',
      strained:
        'The run-game instincts were never the issue. You still have to make the passing-game answers as dependable as the tackles.',
      independent:
        'You want the entire job, not a situational title. Your next opportunity will be judged by the downs you used to leave to someone else.',
    },
  }),
  arc({
    id: 'rush-hour',
    position: 'EDGE',
    name: 'Rush hour',
    subtitle: 'The first move gets noticed. The counter gets you paid.',
    description:
      'Your best rush won in college. NFL tackles have already watched it. The veteran across from you knows why the second move matters.',
    coach: 'Defensive line coach',
    mentor: 'Veteran pass rusher',
    skill: 'finesseMoves',
    role: 'Pass-rush rotation',
    depth:
      'Use the available backup edge or RLE/RRE rotation slot matching your scheme. Report whether that sub-package assignment can be applied.',
    promise: {
      label: 'Record three sacks in your next three appearances',
      metric: 'sacks',
      target: 3,
      games: 3,
    },
    titles: [
      'They have seen your best move',
      'The second hand',
      'A chip on every release',
      'A rush plan of your own',
      'What happens after they adjust?',
    ],
    scenes: [
      'The coach shows you an offensive tackle sitting on your favorite move. “They bought the tape too.” He wants a counter before he wants another highlight.',
      'The veteran pass rusher offers a hand-fighting session. He asks what you do when the first move does not move the tackle at all.',
      'A tight end chips you before releasing. The protection is paying attention now. Your response can help the whole front, or turn into a week spent chasing your own sack total.',
      'The coordinator asks you to present a rush plan for the rest of the season. Getting more snaps means showing that the plan survives an offense changing its protection.',
      'The veteran puts the first blocked rush of the season beside the last one. He asks which part of your game kept working after the tackle made his adjustment.',
    ],
    arrival: [
      'Build the counter first',
      'Let technique make your athleticism harder to predict.',
      'Make them stop your best move',
      'Ask for the reps to prove your signature rush still wins.',
    ],
    connection: [
      'He changes the resistance on the second rep and waits for your answer.',
      '“Confidence is good,” he says. “What is the next move?”',
    ],
    endings: {
      earned:
        'The rush stopped ending when your first move failed. Your counters opened lanes for the whole front, and the veteran started asking what you saw.',
      strained:
        'The burst was real. The second answer was not always there. Tackles adjusted faster than your trust in the rest of the rush plan.',
      independent:
        'You want protections built around the fear of you. The next chapter will ask whether you can keep producing after they are.',
    },
  }),
  arc({
    id: 'complete-edge',
    position: 'EDGE',
    name: 'Hold the edge',
    subtitle: 'The sack is yours. The open lane belongs to everyone.',
    description:
      'You were drafted to pressure quarterbacks. The coordinator keeps rewinding the runs that went outside your shoulder.',
    coach: 'Defensive line coach',
    mentor: 'Veteran run defender',
    skill: 'blockShedding',
    role: 'Every-down edge rotation',
    depth:
      'Use the defensive end or outside-linebacker rotation slot that fits your base defense. This assignment prioritizes the base front, not only the rush-end sub-package.',
    promise: {
      label: 'Record eighteen tackles in your next three appearances',
      metric: 'tackles',
      target: 18,
      games: 3,
    },
    titles: [
      'The space outside your shoulder',
      'Hands inside, eyes outside',
      'The bootleg nobody owned',
      'More than a third-down player',
      'A different kind of highlight',
    ],
    scenes: [
      'The coach skips your pressure and rewinds the run on the previous snap. Your rush opened the outside lane. He wants to know whether you measure the job by your play or the defense’s result.',
      'The veteran run defender walks you through a block you thought you had beaten. He points to the runner’s path, not your position beside the tackle.',
      'Play action pulls the front one way and the quarterback rolls the other. The coordinator asks whether you are willing to own the contain job even when it costs a sack opportunity.',
      'The staff is deciding which edge players can stay on the field against any personnel. You can commit to a base role, push for the whole assignment, or look for a system with different priorities.',
      'The veteran brings you a clip where the runner cuts back into three teammates. You made the play possible without touching the ball carrier. “Does this belong on your reel?”',
    ],
    arrival: [
      'Own the outside shoulder',
      'Make the run fit as dependable as the pass rush.',
      'Ask for pass-rush freedom',
      'Argue that your best value is attacking the quarterback.',
    ],
    connection: [
      'He notices you looking at the runner before looking at your own hands.',
      'He makes you explain who covers the lane when you leave it.',
    ],
    endings: {
      earned:
        'You made the edge a place the defense could build around. The sacks mattered, but so did the runs that never reached open grass.',
      strained:
        'Your pressure created opportunities and your abandoned edge created others. The staff still has to decide which version it can keep on the field.',
      independent:
        'You want to be known for changing the game, not just holding your assignment. The next step is proving those ambitions can belong to the same defender.',
    },
  }),
];
