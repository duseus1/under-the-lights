import { basketballStories } from './basketball-stories';
import { skillStories } from './skill-stories';
import type { StoryArc, StoryChoice, StoryEvent } from '../domain/types';
import { defenseStories } from './defense-stories';
export const STORY_VERSION = 1;
const choice = (
  id: string,
  label: string,
  description: string,
  outcome: string,
  effects: StoryChoice['effects'],
  extras: Partial<StoryChoice> = {},
): StoryChoice => ({ id, label, description, outcome, effects, ...extras });
const trade: StoryChoice['action'] = {
  type: 'trade',
  title: 'Ask for a new start',
  detail:
    'Use Franchise’s available roster tools to pursue a trade. Do not change your team here until Madden confirms the move. If unavailable, report it and continue this career.',
};
function event(
  id: string,
  after: number,
  title: string,
  speaker: string,
  body: string,
  choices: StoryChoice[],
  branches?: StoryEvent['branches'],
): StoryEvent {
  return { id, after, title, speaker, body, choices, branches };
}
export const stories: StoryArc[] = [
  {
    id: 'succession',
    position: 'QB',
    name: 'The next man up',
    subtitle: 'A veteran’s locker. Your future.',
    description:
      'The team drafted its next quarterback. Nobody told the current one when to leave.',
    events: [
      event(
        'arrival',
        0,
        'There’s only one huddle',
        'Offensive coordinator',
        'The veteran has kept this offense together for years. Your locker is beside his. Before your first practice, the coordinator asks what you expect from this season.',
        [
          choice(
            'learn',
            'Earn his trust',
            'Learn behind the veteran before asking for the job.',
            'The veteran slides his annotated playbook across the table. You have an ally, but the first-team reps stay his.',
            { coach: 9, teammate: 12, reputation: -3 },
            { flag: 'apprentice', role: 'Developmental backup' },
          ),
          choice(
            'compete',
            'Make it a competition',
            'Tell the room you intend to start.',
            'The coordinator opens the competition. The veteran stops volunteering advice.',
            { coach: 2, teammate: -12, reputation: 9 },
            {
              flag: 'challenger',
              role: 'Competing for QB1',
              conflict: 'The veteran sees you as a threat.',
            },
          ),
        ],
      ),
      event(
        'response',
        1,
        'The film room stays open',
        'Veteran quarterback',
        'Practice is over. The veteran is still at his locker, watching the same third-down clip.',
        [
          choice(
            'together',
            'Watch the tape together',
            'Make the relationship bigger than the competition.',
            'He explains the protection check he missed as a rookie. The next conversation is easier.',
            { coach: 3, teammate: 10 },
            { flag: 'shared-film', resolveConflict: true },
          ),
          choice(
            'alone',
            'Build your own case',
            'Spend the evening with your position coach.',
            'Your preparation gets noticed. The veteran notices the empty chair beside him, too.',
            { coach: 8, teammate: -5, reputation: 3 },
            { flag: 'solo-work', rating: 'shortAccuracy' },
          ),
        ],
        [
          {
            flag: 'apprentice',
            body: 'He left a second chair beside the screen. Accepting the invitation means listening, even when you disagree.',
          },
          {
            flag: 'challenger',
            body: '“You wanted my job,” he says. “You still want to know why that protection broke?”',
          },
        ],
      ),
      event(
        'pressure',
        5,
        'A microphone and a loaded question',
        'Local beat reporter',
        'A reporter asks whether the team would be better with you taking the first snap. Your answer will be in tomorrow’s headline.',
        [
          choice(
            'team',
            'Keep it inside the building',
            'Back the coaches publicly.',
            'Your coaches hear loyalty. The reporter moves on, but your teammates remember the answer.',
            { coach: 10, teammate: 7, reputation: -3 },
            { flag: 'team-first' },
          ),
          choice(
            'ready',
            'Say you’re ready',
            'Put your ambition on the record.',
            'The debate now has your name attached. You have three appearances to back up the talk.',
            { coach: -7, teammate: -6, reputation: 12 },
            {
              flag: 'public-bid',
              conflict: 'A public quarterback controversy.',
              promise: {
                label: 'Back up your claim: 600 total yards in your next three appearances',
                metric: 'yards',
                target: 600,
                games: 3,
              },
            },
          ),
        ],
      ),
      event(
        'turn',
        11,
        'The closed-door meeting',
        'Head coach',
        'The staff asks what role you can commit to for the rest of the season. There is no microphone this time.',
        [
          choice(
            'role',
            'Accept a defined role',
            'Build the team’s confidence in you.',
            'You agree to a clear plan. The quarterback room finally knows where it stands.',
            { coach: 12, teammate: 10 },
            {
              flag: 'role-accepted',
              role: 'Trusted rotation QB',
              resolveConflict: true,
              action: {
                type: 'depth',
                title: 'Agree on the quarterback rotation',
                detail:
                  'Set your player to QB2 in the depth chart if your Franchise setup permits. Keep this role until the late-season meeting; report if it cannot be applied.',
              },
            },
          ),
          choice(
            'job',
            'Ask for the starting job',
            'Take responsibility for the offense.',
            'The coach agrees to evaluate you with the first unit. Every mistake will belong to you now.',
            { coach: -3, teammate: -4, reputation: 8 },
            {
              flag: 'starter-demand',
              role: 'QB1 trial',
              action: {
                type: 'depth',
                title: 'Begin the QB1 trial',
                detail:
                  'Move your player to QB1 in Madden if available. Record whether the change was possible.',
              },
            },
          ),
          choice(
            'leave',
            'Request a trade',
            'Ask for an opportunity somewhere else.',
            'The team will hear the request. An actual move depends on what happens in Franchise.',
            { coach: -12, teammate: -8, reputation: 3 },
            {
              flag: 'trade-request',
              action: trade,
              conflict: 'Your future with the team is uncertain.',
            },
          ),
        ],
      ),
      event(
        'finish',
        18,
        'Whose huddle is it?',
        'Veteran quarterback',
        'The rookie label is almost gone. The veteran wants to know what kind of leader you intend to become.',
        [
          choice(
            'share',
            'Make room for everyone',
            'Bring the room with you.',
            'You ask the veteran to help lead the final stretch. Respect no longer requires either of you to disappear.',
            { coach: 8, teammate: 12 },
            { flag: 'shared-leader', resolveConflict: true, role: 'Respected quarterback' },
          ),
          choice(
            'own',
            'Put your name on it',
            'Accept the pressure of being the face of the offense.',
            'You tell the room you will own the results. Next year’s expectations begin tonight.',
            { coach: 3, teammate: -4, reputation: 12 },
            { flag: 'own-legacy', role: 'Emerging franchise QB' },
          ),
        ],
        [
          {
            flag: 'role-accepted',
            body: 'You honored the role you agreed to. Now the veteran asks whether patience has changed what you want.',
          },
          {
            flag: 'starter-demand',
            body: 'You got the first-unit trial. The veteran asks whether having the huddle taught you how to keep it.',
          },
        ],
      ),
    ],
    endings: {
      earned:
        'You earned a place in the quarterback room before trying to own it. The succession is a conversation now, not a fight.',
      strained:
        'Your arm opened the door. The relationships you strained kept it from opening all the way. The next opportunity will require more than another good throw.',
      independent:
        'You made your ambition impossible to ignore. The organization now has to decide whether its future and yours belong together.',
    },
  },
  {
    id: 'playbook',
    position: 'QB',
    name: 'Beyond the playbook',
    subtitle: 'They drafted your talent. Not your instincts.',
    description:
      'Your game made you a prospect. Your new coaches want to know how much of it you can leave behind.',
    events: [
      event(
        'arrival',
        0,
        'Stay on schedule',
        'Quarterbacks coach',
        'The coach pauses your college tape on a broken play. “Great result. Terrible decision.” He wants to rebuild your process before trusting your instincts.',
        [
          choice(
            'structure',
            'Master the structure',
            'Learn the system before bending it.',
            'You accept the footwork plan. Your coach sees a player he can develop.',
            { coach: 12, teammate: 3, reputation: -3 },
            { flag: 'structured', role: 'System apprentice' },
          ),
          choice(
            'instinct',
            'Protect your instincts',
            'Ask the staff to build around your strengths.',
            'You make your case. The staff agrees to watch, but it wants proof, not a highlight reel.',
            { coach: -5, teammate: 5, reputation: 10 },
            { flag: 'instinctive', conflict: 'The staff questions your decision-making.' },
          ),
        ],
      ),
      event(
        'response',
        1,
        'One play, two explanations',
        'Quarterbacks coach',
        'Your most talked-about snap becomes a lesson in the meeting room. The coach asks you to explain the read.',
        [
          choice(
            'own',
            'Own the correction',
            'Take the lesson without surrendering your identity.',
            'The conversation shifts from obedience to understanding.',
            { coach: 10, teammate: 4 },
            { flag: 'accountable', resolveConflict: true, rating: 'awareness' },
          ),
          choice(
            'defend',
            'Defend what you saw',
            'Explain why the opening was worth the risk.',
            'The coach gives you room to prove it. Clean football is now the agreement.',
            { coach: -3, reputation: 6 },
            {
              flag: 'prove-instinct',
              promise: {
                label: 'Deliver two turnover-free appearances within three games played',
                metric: 'clean',
                target: 2,
                games: 3,
              },
            },
          ),
        ],
        [
          {
            flag: 'structured',
            body: 'You followed the new footwork, but the timing still felt wrong. The coach asks whether you understand the rule or are only following it.',
          },
          {
            flag: 'instinctive',
            body: 'You changed the play after the snap. The coach wants the read that justified it, not the result.',
          },
        ],
      ),
      event(
        'pressure',
        5,
        'A smaller call sheet',
        'Offensive coordinator',
        'The coordinator offers a narrower package. It might produce cleaner football. It might also feel like a vote of no confidence.',
        [
          choice(
            'precision',
            'Make the small package work',
            'Let consistent execution earn more freedom.',
            'You agree to master the available answers before asking for more.',
            { coach: 10, teammate: 6 },
            { flag: 'precision', rating: 'shortAccuracy' },
          ),
          choice(
            'freedom',
            'Ask for the whole offense',
            'Accept responsibility for more decisions.',
            'The full call sheet arrives with a clear expectation: create touchdowns.',
            { coach: -4, reputation: 10 },
            {
              flag: 'freedom',
              promise: {
                label: 'Account for four touchdowns in your next three appearances',
                metric: 'touchdowns',
                target: 4,
                games: 3,
              },
            },
          ),
        ],
      ),
      event(
        'turn',
        11,
        'Draw it up',
        'Offensive coordinator',
        'The staff invites you into the planning meeting. Bring one idea they can actually use.',
        [
          choice(
            'blend',
            'Build a shared system',
            'Combine your strengths with the staff’s structure.',
            'You leave with a package everyone can explain. Ownership feels different when it is shared.',
            { coach: 12, teammate: 8 },
            { flag: 'collaborator', resolveConflict: true, role: 'Offensive collaborator' },
          ),
          choice(
            'feature',
            'Ask to be the centerpiece',
            'Push for a first-team opportunity.',
            'The staff agrees to consider your package with the starters. The burden of proof grows.',
            { coach: -3, reputation: 12 },
            {
              flag: 'featured',
              role: 'QB1 trial',
              action: {
                type: 'depth',
                title: 'Try your package with the first unit',
                detail:
                  'Set your player to QB1 if your Franchise setup allows. Confirm the actual depth-chart outcome.',
              },
            },
          ),
          choice(
            'trade',
            'Find a better fit',
            'Ask for a team that wants your style.',
            'Your agent can ask. The answer will come from the actual Franchise transaction.',
            { coach: -10, teammate: -5 },
            {
              flag: 'trade-request',
              action: trade,
              conflict: 'You are looking for another offensive fit.',
            },
          ),
        ],
      ),
      event(
        'finish',
        18,
        'Your signature',
        'Quarterbacks coach',
        'The coach puts your early tape beside this month’s tape. “What do you want people to see next year?”',
        [
          choice(
            'complete',
            'A complete quarterback',
            'Keep building every part of your game.',
            'You ask for the hard corrections again. The coach starts talking about next year’s installation.',
            { coach: 10, teammate: 5 },
            { flag: 'complete-qb', resolveConflict: true, role: 'Trusted offensive leader' },
          ),
          choice(
            'unique',
            'A player nobody can copy',
            'Make your individuality the promise.',
            'You choose a higher ceiling and a louder conversation. The tape will have to keep answering for you.',
            { reputation: 14, coach: -3 },
            { flag: 'own-legacy', role: 'Unconventional playmaker' },
          ),
        ],
        [
          {
            flag: 'collaborator',
            body: 'The package you built together is on the screen. The coach asks what the collaboration taught you.',
          },
          {
            flag: 'featured',
            body: 'Your fingerprints are on the offense now. The coach asks whether that is enough.',
          },
        ],
      ),
    ],
    endings: {
      earned:
        'The system did not erase your instincts. You learned when to trust them, and your coaches learned when to trust you.',
      strained:
        'You kept your identity, but the staff still sees risk where you see possibility. Your next step is making your explanation as convincing as your highlights.',
      independent:
        'You asked football to make room for your style. It did, a little. Keeping that room will be the next challenge.',
    },
  },
  {
    id: 'dependable',
    position: 'WR',
    name: 'Earn every snap',
    subtitle: 'No promises. Just a place in line.',
    description:
      'A crowded receiver room has no obvious opening. Reliability might be your only way onto the field.',
    events: [
      event(
        'arrival',
        0,
        'The bottom of the board',
        'Receivers coach',
        'Your name sits below players with years of trust built up. The coach asks how you plan to get noticed.',
        [
          choice(
            'details',
            'Win the details',
            'Make blocking, timing, and preparation your calling card.',
            'The coach assigns you the unglamorous reps. He also starts watching them more closely.',
            { coach: 12, teammate: 7, reputation: -4 },
            { flag: 'craft', role: 'Developmental receiver' },
          ),
          choice(
            'explosive',
            'Make a big impression',
            'Tell the staff you can change a game.',
            'The room hears confidence. Now it wants something behind it.',
            { coach: -2, teammate: -4, reputation: 12 },
            {
              flag: 'spark',
              role: 'Rotational playmaker',
              conflict: 'The receiver room thinks you are skipping steps.',
            },
          ),
        ],
      ),
      event(
        'response',
        1,
        'An extra route session',
        'Starting quarterback',
        'The quarterback has fifteen minutes after practice. You can work his preferred timing or show him your favorite route.',
        [
          choice(
            'timing',
            'Learn his timing',
            'Build a shared language.',
            'The ball arrives before your break. For the first time, that feels intentional.',
            { teammate: 12, coach: 4 },
            { flag: 'timing-bond', rating: 'shortRoute', resolveConflict: true },
          ),
          choice(
            'weapon',
            'Show him your best route',
            'Give him a reason to look your way.',
            'He asks you to run it twice more. You promise to turn that connection into production.',
            { teammate: 5, reputation: 7 },
            {
              flag: 'weapon',
              promise: {
                label: 'Produce 180 receiving yards in your next three appearances',
                metric: 'yards',
                target: 180,
                games: 3,
              },
            },
          ),
        ],
        [
          {
            flag: 'craft',
            body: 'He noticed you hitting the landmark even when the ball went elsewhere. Now he wants to work the throw.',
          },
          {
            flag: 'spark',
            body: '“You said you could change a game,” he says. “Show me exactly where you want the ball.”',
          },
        ],
      ),
      event(
        'pressure',
        5,
        'Targets are a conversation',
        'Receivers coach',
        'You want more involvement. The staff wants to know whether that means more work or more noise.',
        [
          choice(
            'private',
            'Ask privately for a role',
            'Make a specific case to your coach.',
            'You ask for third-down work and accept the preparation that comes with it.',
            { coach: 10, teammate: 6 },
            { flag: 'private-case', role: 'Third-down option' },
          ),
          choice(
            'public',
            'Say you need the ball',
            'Make your frustration public.',
            'The clip travels faster than your explanation. Your quarterback wants to know why he heard it online.',
            { coach: -8, teammate: -12, reputation: 12 },
            { flag: 'target-demand', conflict: 'Your quarterback feels publicly criticized.' },
          ),
        ],
      ),
      event(
        'turn',
        11,
        'A place in the rotation',
        'Offensive coordinator',
        'The offense is finding its identity. You can ask to be part of the foundation or make a bigger demand.',
        [
          choice(
            'slot',
            'Own the supporting role',
            'Become a dependable weekly option.',
            'The staff writes your name into the rotation. Your role has a purpose now.',
            { coach: 12, teammate: 9 },
            {
              flag: 'reliable',
              role: 'Trusted WR3',
              resolveConflict: true,
              action: {
                type: 'depth',
                title: 'Establish the WR3 role',
                detail:
                  'Place your player at WR3 in the depth chart where available. Confirm or report that this change is unavailable.',
              },
            },
          ),
          choice(
            'start',
            'Push for a starting spot',
            'Put your development against the veterans.',
            'Your coach agrees to a trial. The veterans know what it costs them.',
            { coach: 1, teammate: -7, reputation: 9 },
            {
              flag: 'starter-demand',
              role: 'WR2 trial',
              action: {
                type: 'depth',
                title: 'Begin a WR2 trial',
                detail: 'Move your player to WR2 if available and report the actual outcome.',
              },
            },
          ),
          choice(
            'trade',
            'Ask for a different opportunity',
            'Pursue a receiver room with more space.',
            'The request is on the table. Until Madden completes a trade, this remains your locker room.',
            { coach: -10, teammate: -6 },
            {
              flag: 'trade-request',
              action: trade,
              conflict: 'Your role and your future are unsettled.',
            },
          ),
        ],
      ),
      event(
        'finish',
        18,
        'The throw before the break',
        'Starting quarterback',
        'He asks which route you want when the season is on the line. This time, he waits for the answer.',
        [
          choice(
            'trust',
            'Choose the route you built together',
            'Make trust your advantage.',
            'You name the route from that first extra session. He smiles before you finish.',
            { teammate: 14, coach: 6 },
            { flag: 'connection', resolveConflict: true, role: 'Trusted chain mover' },
          ),
          choice(
            'moment',
            'Ask for the biggest moment',
            'Make your name on the difficult throw.',
            'You ask for the shot everyone will remember. Your quarterback knows you are willing to own it.',
            { reputation: 12, teammate: 2 },
            { flag: 'own-legacy', role: 'Emerging featured receiver' },
          ),
        ],
        [
          {
            flag: 'target-demand',
            body: 'The public comments never quite disappeared. This is a chance to answer your quarterback directly.',
          },
          {
            flag: 'reliable',
            body: 'You became the dependable option the staff asked for. Now your quarterback offers you a bigger say.',
          },
        ],
      ),
    ],
    endings: {
      earned:
        'You stopped being the last name on the board. Your quarterback trusts the spot you will reach, and your coach trusts the work that gets you there.',
      strained:
        'You showed enough to stay in the conversation. The missed connections off the field made the ones on it harder to sustain.',
      independent:
        'You asked for more than a supporting role. Whether the next opportunity is here or elsewhere, nobody can mistake what you want.',
    },
  },
  {
    id: 'spotlight',
    position: 'WR',
    name: 'More than a highlight',
    subtitle: 'The talent is obvious. The trust isn’t.',
    description:
      'Scouts loved the catches and circled the lapses. Your rookie year decides which version becomes your reputation.',
    events: [
      event(
        'arrival',
        0,
        'The other tape',
        'Receivers coach',
        'The coach skips the spectacular catch and stops on the missed assignment before it. “This is the play that decides whether you stay on the field.”',
        [
          choice(
            'routine',
            'Commit to a routine',
            'Treat consistency as a skill you can train.',
            'You agree to an extra fundamentals session. It is a quiet beginning to changing a loud reputation.',
            { coach: 12, teammate: 5 },
            { flag: 'routine', role: 'Developmental playmaker' },
          ),
          choice(
            'upside',
            'Ask them to trust your upside',
            'Keep your confidence visible.',
            'The coach leaves the highlight on the screen. “Then make this normal.”',
            { coach: -4, reputation: 12 },
            { flag: 'upside', conflict: 'The staff doubts your consistency.' },
          ),
        ],
      ),
      event(
        'response',
        1,
        'Last one off the field',
        'Veteran receiver',
        'A veteran offers to run the tedious part of practice again. There are no cameras left.',
        [
          choice(
            'repeat',
            'Take the extra reps',
            'Make consistency a shared project.',
            'He stays until your footwork looks the same every time. You have someone who will tell you the truth.',
            { coach: 5, teammate: 12 },
            { flag: 'mentor', rating: 'catching', resolveConflict: true },
          ),
          choice(
            'solo',
            'Keep your own routine',
            'Trust the preparation that got you here.',
            'You stay alone and set a concrete standard for yourself.',
            { teammate: -5, reputation: 4 },
            {
              flag: 'self-directed',
              promise: {
                label: 'Deliver two drop-free, turnover-free appearances within three games played',
                metric: 'clean',
                target: 2,
                games: 3,
              },
            },
          ),
        ],
        [
          {
            flag: 'routine',
            body: 'He saw you arrive early. Now he wants to know if you can keep the routine when you are tired.',
          },
          {
            flag: 'upside',
            body: '“Talent gets the invitation,” he says. “What gets you invited back?”',
          },
        ],
      ),
      event(
        'pressure',
        5,
        'The label follows you',
        'Local beat reporter',
        'The question is about consistency again. You can talk about the work or challenge the label.',
        [
          choice(
            'work',
            'Talk about the work',
            'Let your preparation become the story.',
            'You describe the routine, not the criticism. The veteran backs up your account.',
            { coach: 8, teammate: 7, reputation: 3 },
            { flag: 'work-speaks' },
          ),
          choice(
            'answer',
            'Promise an answer on Sunday',
            'Raise the stakes yourself.',
            'You promise production. Three appearances will give the claim its meaning.',
            { coach: -5, reputation: 13 },
            {
              flag: 'loud-answer',
              promise: {
                label: 'Score two receiving touchdowns in your next three appearances',
                metric: 'touchdowns',
                target: 2,
                games: 3,
              },
            },
          ),
        ],
      ),
      event(
        'turn',
        11,
        'Who gets the crucial snap?',
        'Receivers coach',
        'The coach wants a receiver he can leave on the field when the call changes at the line.',
        [
          choice(
            'reliable',
            'Take responsibility for the details',
            'Trade some spotlight for a lasting role.',
            'You agree to lead the assignment review. Your teammates begin coming to you with questions.',
            { coach: 14, teammate: 8 },
            {
              flag: 'accountable',
              role: 'Trusted WR2',
              resolveConflict: true,
              action: {
                type: 'depth',
                title: 'Earn the WR2 assignment',
                detail:
                  'Set your player to WR2 where available. Confirm the change or record that it is unavailable.',
              },
            },
          ),
          choice(
            'feature',
            'Ask to be featured',
            'Make talent the center of your argument.',
            'You make the case for more snaps. The coach wants sustained production to match.',
            { coach: -5, reputation: 12 },
            {
              flag: 'featured',
              role: 'Featured receiver trial',
              action: {
                type: 'depth',
                title: 'Trial as the featured receiver',
                detail:
                  'Move your player to WR1 if your Franchise setup permits. Report the actual outcome.',
              },
            },
          ),
          choice(
            'trade',
            'Seek a fresh evaluation',
            'Request a team without the old label.',
            'A fresh start may help. The request still needs an actual Franchise outcome.',
            { coach: -10, teammate: -6 },
            {
              flag: 'trade-request',
              action: trade,
              conflict: 'You want a fresh start away from the label.',
            },
          ),
        ],
      ),
      event(
        'finish',
        18,
        'Which tape do you keep?',
        'Veteran receiver',
        'He puts two clips in front of you: the spectacular catch and the clean adjustment that kept a drive alive.',
        [
          choice(
            'both',
            'Keep both',
            'Make the ordinary play part of your identity.',
            'You save the adjustment first. He notices.',
            { coach: 9, teammate: 12 },
            { flag: 'whole-player', resolveConflict: true, role: 'Complete receiving threat' },
          ),
          choice(
            'highlight',
            'Keep the spectacular one',
            'Set your sights on becoming exceptional.',
            'You choose the catch nobody else could make. There is still work behind that promise.',
            { reputation: 14, coach: -3 },
            { flag: 'own-legacy', role: 'High-ceiling playmaker' },
          ),
        ],
        [
          {
            flag: 'accountable',
            body: 'Your assignment reviews have become routine. He wants to know whether you value that as much as the highlight.',
          },
          {
            flag: 'featured',
            body: 'You asked to be the featured receiver. Now he asks which part of the job you want to be known for.',
          },
        ],
      ),
    ],
    endings: {
      earned:
        'The highlight reel got longer. More importantly, the gaps between its plays got better. Talent and trust finally describe the same player.',
      strained:
        'The spectacular plays are real. So are the doubts that survived them. Your second chapter will depend on what you do when nobody is replaying the clip.',
      independent:
        'You refused to let a scouting label define your ceiling. The next step is proving that a high ceiling can rest on a dependable floor.',
    },
  },
];
stories.push(...defenseStories, ...skillStories, ...basketballStories);
export const getStory = (id: string) => stories.find((s) => s.id === id)!;
