import type { StoryArc } from '../domain/types';
export const basketballStories: StoryArc[] = [
  {
    id: 'keys-to-offense',
    position: 'PG',
    name: 'The keys to the offense',
    subtitle: 'Earn the ball. Earn the room.',
    description:
      'A veteran runs the team. You were drafted to shape its future. Your rookie year asks whether leadership means taking over or bringing everyone with you.',
    endings: {
      earned:
        'You earned more than touches. The coach trusts your reads, the veteran trusts your preparation, and your teammates see their own opportunities when you have the ball.',
      strained:
        'You showed the tools to run an offense, but the room still argues about its direction. The next step is learning to make your talent easier to play beside.',
      independent:
        'You made it clear that you want an offense built around your decisions. The next chapter will test whether the freedom you asked for makes the whole team better.',
    },
    events: [
      {
        id: 'arrival',
        after: 0,
        title: 'One ball, two timelines',
        speaker: 'Head coach',
        body: 'The coach puts your name behind the veteran on the practice board. “We drafted a point guard, not a replacement speech. Tell me how you plan to earn the room.”',
        choices: [
          {
            id: 'learn',
            label: 'Learn how this team plays',
            description: 'Study the veteran’s reads and build trust before demanding control.',
            outcome:
              'The coach gives you a second-unit assignment. The veteran offers a place beside him in film sessions.',
            effects: {
              coach: 12,
              teammate: 6,
              reputation: -3,
            },
            flag: 'learn-first',
            role: 'Rookie floor general',
          },
          {
            id: 'compete',
            label: 'Compete for the keys now',
            description: 'Make your case for a larger role from the first practice.',
            outcome:
              'The coach respects the ambition but keeps the rotation unchanged. The veteran wants to see who benefits from your decisions.',
            effects: {
              coach: -4,
              teammate: -5,
              reputation: 12,
            },
            flag: 'take-charge',
            conflict: 'You and the veteran disagree about who should run the offense.',
          },
        ],
      },
      {
        id: 'response',
        after: 1,
        title: 'The pass after the pass',
        speaker: 'Veteran point guard',
        body: 'The veteran pauses the film before a pick-and-roll. The first pass is obvious. He asks who gets open after the defense rotates.',
        branches: [
          {
            flag: 'learn-first',
            body: 'The veteran brings you into the film room early. “You asked to learn. Walk me through the second rotation, then tell me where our shooter needs the ball.”',
          },
          {
            flag: 'take-charge',
            body: 'The veteran hands you the remote. “You want the keys. Show me what our center sees when you turn the corner.” This is your chance to turn a challenge into a conversation.',
          },
        ],
        choices: [
          {
            id: 'study',
            label: 'Work through everyone’s reads',
            description: 'Ask the veteran and the screener to explain their timing.',
            outcome:
              'Your passing work improves. The screener begins staying after practice with you, and the veteran shares his scouting notes.',
            effects: {
              coach: 4,
              teammate: 12,
            },
            rating: 'passAccuracy',
            flag: 'shared-reads',
            resolveConflict: true,
          },
          {
            id: 'own',
            label: 'Build your own counter',
            description: 'Prepare an alternative action and ask the staff to evaluate it.',
            outcome:
              'The staff agrees to study your counter. The veteran steps back from the extra sessions; the explanation is yours to deliver now.',
            effects: {
              coach: 7,
              teammate: -7,
              reputation: 5,
            },
            flag: 'own-counter',
            conflict: 'You and the veteran are preparing the offense separately.',
          },
        ],
      },
      {
        id: 'pressure',
        after: 20,
        title: 'Who gets a better shot?',
        speaker: 'Assistant coach',
        body: 'The early-season review is about shot quality. Your scoring matters, but the assistant wants to know what the other four players can count on when you initiate.',
        branches: [
          {
            flag: 'shared-reads',
            body: 'The screener backs your reading of a coverage in the review. Shared preparation has given you an ally. The assistant asks how you will turn that understanding into a dependable standard.',
          },
          {
            flag: 'own-counter',
            body: 'The assistant brings your proposed counter to the review. You have an idea on the board, but the other four players still need to know where their chances come from.',
          },
        ],
        choices: [
          {
            id: 'connect',
            label: 'Let the possession decide',
            description: 'Commit to making the right read without chasing a box-score target.',
            outcome:
              'The coach makes your film review about decisions. Teammates hear that a good possession does not need to end with your shot.',
            effects: {
              coach: 10,
              teammate: 8,
              reputation: -3,
            },
            flag: 'possession-first',
          },
          {
            id: 'promise',
            label: 'Promise to create 24 assists',
            description: 'Set a target of 24 assists over your next three played appearances.',
            outcome:
              'The assistant writes down the target. Your next three appearances will show whether the confidence connects to the team’s offense.',
            effects: {
              coach: -4,
              teammate: -3,
              reputation: 10,
            },
            flag: 'assist-standard',
            promise: {
              label: 'Create 24 assists in three appearances',
              metric: 'assists',
              target: 24,
              games: 3,
            },
          },
        ],
      },
      {
        id: 'turn',
        after: 41,
        title: 'The closing five',
        speaker: 'Head coach',
        body: 'At the midpoint, the coach wants a clear rotation. You can commit to running the second unit, ask for the starting responsibility, or admit that you want a different situation.',
        branches: [
          {
            flag: 'possession-first',
            body: 'The coach remembers your commitment to the right read. He offers a defined second-unit responsibility, with room to compete for more. You can accept it or make a different case.',
          },
          {
            flag: 'assist-standard',
            body: 'The coach opens with the promise you made. The result is part of the rotation discussion, but no box score settles whether you and the veteran can share the work.',
          },
        ],
        choices: [
          {
            id: 'rotation',
            label: 'Own the second unit',
            description: 'Give the reserve group a steady organizer.',
            outcome:
              'The coach proposes a defined reserve role. Apply the actual rotation in your league before confirming the change here.',
            effects: {
              coach: 12,
              teammate: 10,
            },
            flag: 'rotation-owner',
            role: 'Second-unit organizer',
            resolveConflict: true,
            action: {
              type: 'depth',
              title: 'Set the reserve PG rotation',
              detail:
                'In your editable NBA 2K league, place your player behind the starting PG and assign reserve minutes that fit your roster. Confirm only after making the actual rotation change. Mark unavailable if your mode does not allow it.',
            },
          },
          {
            id: 'start',
            label: 'Ask for the starting job',
            description: 'Accept the responsibility of organizing the first unit.',
            outcome:
              'The coach agrees to a trial in the story. The real league rotation remains yours to change and confirm.',
            effects: {
              coach: -3,
              teammate: -5,
              reputation: 10,
            },
            flag: 'starter-demand',
            role: 'Starting point guard trial',
            action: {
              type: 'depth',
              title: 'Begin the starting PG trial',
              detail:
                'Move your player to starting PG and adjust minutes in your editable NBA 2K league if available. Confirm the real change here; this app cannot apply it.',
            },
          },
          {
            id: 'trade',
            label: 'Ask for a new situation',
            description: 'Pursue a team with an opening to run its offense.',
            outcome:
              'Your request creates uncertainty in the room. You remain with this team until you report a completed trade.',
            effects: {
              coach: -12,
              teammate: -8,
              reputation: 3,
            },
            flag: 'trade-request',
            conflict: 'Your future with this backcourt is unresolved.',
            action: {
              type: 'trade',
              title: 'Request a new backcourt opportunity',
              detail:
                'Use the roster tools available in your NBA 2K league to pursue a trade. Report the actual destination only after the move occurs. If no trade is possible, mark this request unavailable.',
            },
          },
        ],
      },
      {
        id: 'finish',
        after: 70,
        title: 'Whose offense is it?',
        speaker: 'Veteran point guard',
        body: 'The veteran leaves a ball on your chair before the late-season meeting. “A point guard can call every play and still not lead anyone. What are you building here?”',
        branches: [
          {
            flag: 'rotation-owner',
            body: 'The reserve group has a defined organizer because you accepted that job. The veteran asks whether you can help the next young guard without treating him as a threat.',
          },
          {
            flag: 'starter-demand',
            body: 'You asked for the starting responsibility. The veteran wants to know what you owe the players whose opportunities now begin with your reads.',
          },
        ],
        choices: [
          {
            id: 'together',
            label: 'Build an offense everyone owns',
            description: 'Make the team’s understanding your measure of leadership.',
            outcome:
              'You invite the whole unit into the final review. The veteran hears a leader who wants answers from the room, not just agreement.',
            effects: {
              coach: 9,
              teammate: 13,
            },
            flag: 'unit-leader',
            resolveConflict: true,
            role: 'Trusted backcourt leader',
          },
          {
            id: 'legacy',
            label: 'Become the player they build around',
            description: 'Put your individual ceiling at the center of the next chapter.',
            outcome:
              'You make your ambition explicit. The coach asks you to show how the team gets better as your responsibility grows.',
            effects: {
              coach: -3,
              teammate: -2,
              reputation: 14,
            },
            flag: 'own-legacy',
            role: 'Emerging lead guard',
          },
        ],
      },
    ],
  },
];
