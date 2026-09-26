import { resolveSideEvent } from '../domain/side-events';
import {
  relationshipTier,
  relationshipTiers,
  coachBenefits,
  benefitLabel,
  claimRelationshipBenefits,
} from '../domain/relationships';
import { gameReward, rewardGuide } from '../domain/rewards';
import { performanceReaction } from '../domain/performance';
import { gameName, leagueTeams, isBasketball, type Game } from '../data/games';
import { useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flag,
  HeartHandshake,
  Shield,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import {
  choosePostseason,
  defaultRecap,
  editRecap,
  eventBody,
  finishSetup,
  nextGame,
  pendingEvent,
  ratingLabel,
  record,
  recordDraft,
  reconcile,
  resolveAction,
  resolveChoice,
  submitRecap,
  totals,
  updateChecklist,
  upgrade,
  upgradeCost,
  archetypeFor,
} from '../domain/engine';
import { emptyStats, type Attribute, type Career, type Recap, type Stats } from '../domain/types';
import { getStory } from '../data/stories';
import { positions } from '../data/positions';
import { featuredStats, isDefense } from '../domain/position';

export type Page =
  | 'hub'
  | 'story'
  | 'games'
  | 'progression'
  | 'relationships'
  | 'timeline'
  | 'careers'
  | 'settings'
  | 'awards';
export type ChangeCareer = (next: Career) => Promise<void>;
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function RelationshipBars({ career: c }: { career: Career }) {
  return (
    <div className="relationship-bars">
      {Object.entries(c.relationships).map(([key, value]) => (
        <div key={key}>
          <div>
            <span>
              {key === 'coach' ? 'Coach trust' : key === 'teammate' ? 'Locker room' : 'Reputation'}
            </span>
            <strong>
              {value}
              <small> / 100</small>
            </strong>
          </div>
          <div className="meter">
            <span style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
export function Hub({
  career: c,
  onChange,
  onPage,
}: {
  career: Career;
  onChange: ChangeCareer;
  onPage: (p: Page) => void;
}) {
  const event = pendingEvent(c),
    game = nextGame(c),
    story = getStory(c.storyId),
    stats = totals(c, 'regular'),
    wins = record(c),
    pending = c.actions.filter((a) => a.status === 'pending');
  const stage =
    c.status === 'setup'
      ? isBasketball(c)
        ? 'League setup'
        : 'Franchise setup'
      : c.status === 'draft'
        ? 'Draft day'
        : c.status === 'complete'
          ? 'Rookie year complete'
          : (game?.label ?? 'Postseason decision');
  return (
    <div className="page-enter">
      <div className="hub-welcome">
        <div>
          <div className="eyebrow">YOUR CAREER, ON YOUR TERMS</div>
          <h1>Welcome back, {c.player.name.split(' ')[0]}.</h1>
        </div>
        <span className="season-pill">
          <span /> ROOKIE SEASON <span className="divider">/</span> {stage}
        </span>
      </div>
      {c.sideEvents.some((e) => e.status === 'pending') && (
        <section className="notice">
          <div>
            <strong>A big game opened a side event.</strong>
            <p>
              {c.sideEvents.find((e) => e.status === 'pending')!.title} · Optional postgame
              conversation
            </p>
          </div>
          <button className="button primary" onClick={() => onPage('story')}>
            Open side event
          </button>
        </section>
      )}
      <section className="career-hero">
        <img
          src={isBasketball(c) ? '/court.svg' : '/stadium.svg'}
          alt={
            isBasketball(c)
              ? 'A rookie basketball player under arena lights'
              : 'A rookie player under stadium lights'
          }
        />
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> {c.draft?.team ?? 'THE JOURNEY STARTS HERE'}
          </div>
          <h2>
            Your name.
            <br />
            <em>Your legacy.</em>
          </h2>
          <p>
            {c.status === 'complete'
              ? 'The first chapter is written. Look back at the career you made.'
              : story.subtitle + ' Every decision leaves a mark.'}
          </p>
          <button
            className="button primary"
            onClick={() => onPage(c.status === 'complete' ? 'story' : event ? 'story' : 'games')}
          >
            {c.status === 'complete'
              ? 'View season retrospective'
              : event
                ? 'Continue your story'
                : c.status === 'setup' || c.status === 'draft'
                  ? 'Set up your career'
                  : 'Open next game'}
            <ArrowRight size={17} />
          </button>
        </div>
        <div className="hero-player">
          <span>
            #{String(c.player.number).padStart(2, '0')} / {c.player.position}
          </span>
          <strong>{c.player.name}</strong>
          <small>{archetypeFor(c.player.archetype).name}</small>
        </div>
        <div className="hero-bottom">
          <span>
            <span className="live-dot" /> CHAPTER 01 · {story.name.toUpperCase()}
          </span>
          <span>
            {gameName(c).toUpperCase()} COMPANION <ArrowUpRight size={12} />
          </span>
        </div>
      </section>
      <div className="stat-grid">
        <Stat
          label="SEASON RECORD"
          value={`${wins.w}–${wins.l}${wins.t ? `–${wins.t}` : ''}`}
          sub="Regular season"
          icon={<Trophy size={18} />}
        />
        <Stat
          label={featuredStats(c.player.position, stats)[0][0].toUpperCase()}
          value={featuredStats(c.player.position, stats)[0][1].toLocaleString()}
          sub="Regular season"
          icon={<TrendingUp size={18} />}
        />
        <Stat
          label="DEVELOPMENT POINTS"
          value={String(c.points).padStart(2, '0')}
          sub="Available to spend"
          icon={<Sparkles size={18} />}
          accent
        />
        <Stat
          label="CURRENT ROLE"
          value={c.role}
          sub={
            isBasketball(c) ? 'Custom league progression' : c.player.development + ' development'
          }
          icon={<Users size={18} />}
          compact
        />
      </div>
      <div className="hub-grid">
        <section className="panel next-chapter">
          <div className="panel-heading">
            <h3>Up next</h3>
            <span className="tag">
              {event
                ? 'STORY EVENT'
                : c.status === 'complete'
                  ? 'SEASON COMPLETE'
                  : 'CAREER CHECK-IN'}
            </span>
          </div>
          <div className="chapter-icon">
            <ClipboardList size={24} />
          </div>
          <div className="eyebrow">{event?.speaker ?? stage}</div>
          <h2>
            {event?.title ??
              (c.status === 'complete'
                ? 'Your rookie retrospective'
                : game?.bye
                  ? 'A week to reset'
                  : game
                    ? `${game.label}: write the next line`
                    : 'Bring your career to life')}
          </h2>
          <p>
            {event
              ? 'A conversation is waiting. What you say will shape what comes next.'
              : c.status === 'complete'
                ? 'See the choices, relationships, and moments that defined your first year.'
                : `Play in ${gameName(c)}, then come back to record what happened. Your story grows from here.`}
          </p>
          <button
            className="text-button accent"
            onClick={() => onPage(event || c.status === 'complete' ? 'story' : 'games')}
          >
            {event ? 'Enter conversation' : 'Open career check-in'}
            <ArrowRight size={16} />
          </button>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>The people around you</h3>
            <HeartHandshake size={18} />
          </div>
          <RelationshipBars career={c} />
          <button className="text-button" onClick={() => onPage('relationships')}>
            View relationships
            <ChevronRight size={16} />
          </button>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h3>In the notebook</h3>
            <span className="count">{pending.length}</span>
          </div>
          {pending.length ? (
            <>
              <p className="muted">Changes waiting for you in {gameName(c)}.</p>
              {pending.slice(0, 2).map((a) => (
                <button key={a.id} className="notebook-item" onClick={() => onPage('progression')}>
                  <span className="square-check" />
                  <span>
                    {a.title}
                    <small>
                      {a.type === 'trade'
                        ? 'Awaiting Franchise outcome'
                        : `Manual ${gameName(c)} action`}
                    </small>
                  </span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </>
          ) : (
            <div className="quiet-state">
              <CheckCircle2 size={27} />
              <p>All caught up.</p>
              <span>New actions will appear as your career develops.</span>
            </div>
          )}
          <button className="text-button" onClick={() => onPage('progression')}>
            Open progression
            <ChevronRight size={16} />
          </button>
        </section>
      </div>
      {c.status === 'setup' && <Setup career={c} onChange={onChange} />}
      <div className="section-title">
        <h2>Recently in your career</h2>
        <button className="text-button" onClick={() => onPage('timeline')}>
          Full timeline
          <ArrowRight size={15} />
        </button>
      </div>
      <div className="recent-events">
        {c.timeline
          .slice(-3)
          .reverse()
          .map((t) => (
            <div key={t.id}>
              <span className="timeline-dot" />
              <div>
                <strong>{t.title}</strong>
                <p>{t.body}</p>
              </div>
              <time>{dateLabel(t.at)}</time>
            </div>
          ))}
      </div>
    </div>
  );
}
function Stat({
  label,
  value,
  sub,
  icon,
  accent = false,
  compact = false,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`stat-card ${accent ? 'accent-stat' : ''}`}>
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong className={compact ? 'compact-value' : ''}>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
const setupSteps = [
  [
    'Start a Franchise and simulate the setup year',
    'Use the Franchise settings and control style you prefer. Keep the app open as your companion.',
  ],
  [
    'Generate a draft class and edit a prospect',
    'Choose an editable generated prospect at your position. Set name, number, height, weight, and development trait to match your player card.',
  ],
  [
    'Copy your starting attribute ratings',
    'Use the target-rating sheet in Progression. Other Madden attributes remain at the prospect’s values; this app manages only the listed attributes.',
  ],
  [
    'Save the draft class and your Franchise',
    'Keep your Madden save. Advance through its draft and report your actual team and pick here.',
  ],
];
const basketballSetup = [
  [
    'Start an editable league save',
    'Use MyNBA, MyLEAGUE, or an equivalent editable league mode in your edition. Keep roster editing enabled and choose your preferred player or position control where available.',
  ],
  [
    'Create your PG in a draft class',
    'Create or edit a point guard prospect. Copy your name, number, height and weight from the player card, then advance the setup year to the draft.',
  ],
  [
    'Copy your starting ratings',
    'Use Progression to copy only the listed attributes. Keep badges, animations, tendencies, and other ratings under your control. These custom league rules do not use VC or the MyCAREER builder.',
  ],
  [
    'Save your league and report the draft',
    'Keep your league save, let the draft happen, and record the actual NBA team, round and overall pick. Check the number of regular-season games in your league.',
  ],
];
export function Setup({ career: c, onChange }: { career: Career; onChange: ChangeCareer }) {
  return (
    <section className="panel setup-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">
            {isBasketball(c) ? 'BEFORE THE FIRST TIP' : 'BEFORE THE FIRST SNAP'}
          </div>
          <h2>{isBasketball(c) ? 'Your NBA 2K league setup' : 'Your Franchise setup'}</h2>
        </div>
        <span className="tag">{c.checklist.filter(Boolean).length} / 4 COMPLETE</span>
      </div>
      <div className="setup-list">
        {(isBasketball(c) ? basketballSetup : setupSteps).map(([title, body], i) => (
          <label className={c.checklist[i] ? 'checked' : ''} key={title}>
            <input
              type="checkbox"
              checked={c.checklist[i]}
              onChange={(e) => void onChange(updateChecklist(c, i, e.target.checked))}
            />
            <span>
              <strong>{title}</strong>
              <small>{body}</small>
            </span>
          </label>
        ))}
      </div>
      <button
        className="button primary"
        disabled={!c.checklist.every(Boolean)}
        onClick={() => void onChange(finishSetup(c))}
      >
        Ready for the draft
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
function Draft({ career: c, onChange }: { career: Career; onChange: ChangeCareer }) {
  const [team, setTeam] = useState(leagueTeams(c.game)[0]),
    [round, setRound] = useState(1),
    [pick, setPick] = useState(1),
    [byeWeek, setByeWeek] = useState(9),
    [seasonGames, setSeasonGames] = useState(c.seasonGames),
    [draftError, setDraftError] = useState('');
  return (
    <section className="panel form-panel narrow">
      <div className="eyebrow">THE CALL YOU’VE BEEN WAITING FOR</div>
      <h2>Where did {gameName(c)} send you?</h2>
      <p className="muted">
        Report the draft result from your league save. We’ll build the story around it.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            setDraftError('');
            await onChange(recordDraft({ ...c, seasonGames }, { team, round, pick, byeWeek }));
          } catch (e) {
            setDraftError(e instanceof Error ? e.message : 'Could not save draft result.');
          }
        }}
      >
        <label>
          Drafted by
          <TeamSelect game={c.game} value={team} onChange={setTeam} />
        </label>
        <div className="form-row">
          <label>
            Round
            <input
              type="number"
              min={1}
              max={isBasketball(c) ? 2 : 7}
              required
              value={round}
              onChange={(e) => setRound(Number(e.target.value))}
            />
          </label>
          <label>
            Overall pick
            <input
              type="number"
              min={1}
              max={isBasketball(c) ? 60 : 300}
              required
              value={pick}
              onChange={(e) => setPick(Number(e.target.value))}
            />
          </label>
        </div>
        {isBasketball(c) ? (
          <label>
            Regular-season games
            <input
              type="number"
              min={8}
              max={82}
              required
              value={seasonGames}
              onChange={(e) => setSeasonGames(Number(e.target.value))}
            />
          </label>
        ) : (
          <label>
            Your team’s regular-season bye week
            <input
              type="number"
              min={1}
              max={18}
              required
              value={byeWeek}
              onChange={(e) => setByeWeek(Number(e.target.value))}
            />
          </label>
        )}
        <p className="small muted">
          {isBasketball(c)
            ? 'Match your league schedule (8–82 games). The basketball chapter begins at the regular-season opener. Enter play-in qualification before starting four best-of-seven playoff rounds.'
            : 'Check the Franchise schedule before saving. The app follows three preseason games and eighteen regular-season weeks, including this bye.'}
        </p>
        {draftError && (
          <p role="alert" className="error">
            {draftError}
          </p>
        )}
        <button className="button primary">
          Begin my rookie season
          <ArrowRight size={16} />
        </button>
      </form>
    </section>
  );
}
export function TeamSelect({
  value,
  onChange,
  exclude,
  game = 'madden',
}: {
  value: string;
  onChange: (v: string) => void;
  exclude?: string;
  game?: Game;
}) {
  return (
    <select required value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option value="">Select team</option>}
      {leagueTeams(game)
        .filter((t) => t !== exclude)
        .map((t) => (
          <option key={t}>{t}</option>
        ))}
    </select>
  );
}
export function StoryView({
  career: c,
  onChange,
  onPage,
}: {
  career: Career;
  onChange: ChangeCareer;
  onPage: (p: Page) => void;
}) {
  const event = pendingEvent(c),
    story = getStory(c.storyId),
    reaction = performanceReaction(c, event);
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow={`CHAPTER 01 / ${story.name.toUpperCase()}`}
        title={c.status === 'complete' ? 'The season you made.' : 'There’s more to the game.'}
        description={story.subtitle}
      />
      <SideEvents career={c} onChange={onChange} />
      <div className="story-track">
        {story.events.map((e, i) => (
          <div
            className={
              c.choices.some((x) => x.eventId === e.id)
                ? 'done'
                : event?.id === e.id
                  ? 'current'
                  : ''
            }
            key={e.id}
          >
            <span>
              {c.choices.some((x) => x.eventId === e.id) ? (
                <Check size={12} />
              ) : (
                String(i + 1).padStart(2, '0')
              )}
            </span>
            <small>{['Arrival', 'Connection', 'Pressure', 'Turning point', 'Legacy'][i]}</small>
          </div>
        ))}
      </div>
      {c.status === 'complete' ? (
        <Retrospective career={c} />
      ) : event ? (
        <section className="conversation">
          <div className="conversation-scene">
            <div className="scene-location">
              <span className="live-dot" /> INSIDE THE BUILDING <span>{c.draft?.team}</span>
            </div>
            <div className="speaker-avatar">
              {event.speaker
                .split(' ')
                .map((w) => w[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="eyebrow">{event.speaker}</div>
            <h2>{event.title}</h2>
            <p className="dialogue">{eventBody(c)}</p>
            {reaction && (
              <details className="performance-evidence">
                <summary>Why this conversation?</summary>
                <strong>{reaction.label}</strong>
                <p>{reaction.evidence}</p>
                <p>
                  Written dialogue selected from your recorded results. No AI. Unresolved
                  conversations reflect recap corrections; completed conversations stay as recorded.
                </p>
              </details>
            )}
          </div>
          <div className="choices">
            <div className="eyebrow">HOW WILL YOU RESPOND?</div>
            {event.choices.map((choice, i) => (
              <button
                className="choice"
                key={choice.id}
                onClick={() => void onChange(resolveChoice(c, choice.id))}
              >
                <span className="choice-number">0{i + 1}</span>
                <div>
                  <strong>{choice.label}</strong>
                  <p>{choice.description}</p>
                  <div className="effect-list">
                    {Object.entries(choice.effects).map(([key, value]) => (
                      <span className={value < 0 ? 'negative' : ''} key={key}>
                        {key === 'coach'
                          ? 'Coach'
                          : key === 'teammate'
                            ? 'Locker room'
                            : 'Reputation'}{' '}
                        {value > 0 ? '+' : ''}
                        {value}
                      </span>
                    ))}
                    {choice.action && (
                      <span>
                        Manual {choice.action.type === 'depth' ? 'depth-chart' : 'trade'} action
                      </span>
                    )}
                    {choice.rating && <span>{ratingLabel(choice.rating)} +1</span>}
                    {choice.promise && <span>Performance promise</span>}
                  </div>
                </div>
                <ArrowUpRight size={20} />
              </button>
            ))}
            <p className="small muted">Your choice is saved immediately. It will be remembered.</p>
          </div>
        </section>
      ) : (
        <section className="panel empty-section">
          <CheckCircle2 size={36} />
          <h2>
            {c.status === 'setup' || c.status === 'draft'
              ? 'Your first conversation is ahead.'
              : 'Let the next chapter come to you.'}
          </h2>
          <p>
            Continue your career check-in. New conversations unlock as the rookie season unfolds.
          </p>
          <button className="button primary" onClick={() => onPage('games')}>
            Continue career
            <ArrowRight size={16} />
          </button>
        </section>
      )}
      {!!c.choices.length && (
        <>
          <div className="section-title">
            <h2>What you’ve put in motion</h2>
          </div>
          <div className="decision-history">
            {c.choices
              .slice()
              .reverse()
              .map((x) => (
                <section className="panel" key={x.eventId}>
                  <div className="eyebrow">{x.title}</div>
                  <h3>{x.choice}</h3>
                  <p>{x.outcome}</p>
                  {x.dialogue && (
                    <details className="performance-evidence">
                      <summary>Read the conversation</summary>
                      <p className="dialogue">{x.dialogue}</p>
                      {x.performance && (
                        <p className="small muted">
                          {x.performance.label} · {x.performance.evidence}
                        </p>
                      )}
                    </details>
                  )}
                </section>
              ))}
          </div>
        </>
      )}
    </div>
  );
}
function Retrospective({ career: c }: { career: Career }) {
  const s = totals(c, 'regular');
  return (
    <section className="retrospective">
      <Trophy size={36} />
      <div className="eyebrow">ROOKIE SEASON / COMPLETE</div>
      <h2>
        {c.flags.includes('champion') ? 'A champion’s first chapter.' : 'You wrote this one.'}
      </h2>
      <p>{c.ending}</p>
      <div className="retrospective-stats">
        {featuredStats(c.player.position, s).map(([label, value]) => (
          <div key={label}>
            <strong>{value}</strong>
            <span>{label.toUpperCase()}</span>
          </div>
        ))}
        <div>
          <strong>{c.promises.filter((p) => p.status === 'kept').length}</strong>
          <span>PROMISES KEPT</span>
        </div>
      </div>
      <RelationshipBars career={c} />
      <p className="small muted">
        Your first season is complete. You can review or correct recaps, finish pending{' '}
        {gameName(c)}
        actions, and export the career. Multi-season continuation is not included in this release.
      </p>
    </section>
  );
}
const pgFields: [keyof Stats, string][] = [
  ['minutes', 'Minutes played'],
  ['points', 'Points'],
  ['assists', 'Assists'],
  ['rebounds', 'Rebounds'],
  ['steals', 'Steals'],
  ['blocks', 'Blocks'],
  ['turnovers', 'Turnovers'],
  ['fieldGoalsMade', 'Field goals made'],
  ['fieldGoalsAttempted', 'Field goals attempted'],
  ['threePointersMade', 'Three-pointers made'],
  ['threePointersAttempted', 'Three-pointers attempted'],
  ['freeThrowsMade', 'Free throws made'],
  ['freeThrowsAttempted', 'Free throws attempted'],
];
const qbFields: [keyof Stats, string][] = [
  ['completions', 'Completions'],
  ['attempts', 'Pass attempts'],
  ['passingYards', 'Passing yards'],
  ['passingTD', 'Passing TDs'],
  ['interceptions', 'Interceptions'],
  ['rushingYards', 'Rushing yards'],
  ['rushingTD', 'Rushing TDs'],
  ['fumbles', 'Fumbles lost'],
];
const wrFields: [keyof Stats, string][] = [
  ['receptions', 'Receptions'],
  ['targets', 'Targets'],
  ['receivingYards', 'Receiving yards'],
  ['receivingTD', 'Receiving TDs'],
  ['drops', 'Drops'],
  ['rushingYards', 'Rushing yards'],
  ['rushingTD', 'Rushing TDs'],
  ['fumbles', 'Fumbles lost'],
];
const rbFields: [keyof Stats, string][] = [['carries', 'Carries'], ...wrFields];
const defenseFields: [keyof Stats, string][] = [
  ['tackles', 'Total tackles'],
  ['tacklesForLoss', 'Tackles for loss'],
  ['sacks', 'Sacks'],
  ['defensiveInterceptions', 'Interceptions made'],
  ['passDeflections', 'Pass deflections'],
  ['forcedFumbles', 'Forced fumbles'],
  ['fumbleRecoveries', 'Fumble recoveries'],
  ['defensiveTD', 'Defensive touchdowns'],
  ['defensiveSnaps', 'Defensive snaps'],
  ['missedTackles', 'Missed tackles'],
];
export function GamesView({
  career: c,
  onChange,
  onPage,
}: {
  career: Career;
  onChange: ChangeCareer;
  onPage: (p: Page) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    event = pendingEvent(c),
    slot = nextGame(c);
  const edit = c.recaps.find((r) => r.id === editing);
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow={
          isBasketball(c) ? 'THE SEASON, POSSESSION BY POSSESSION' : 'THE SEASON, SNAP BY SNAP'
        }
        title={isBasketball(c) ? 'Leave it on the court.' : 'Leave it on the field.'}
        description={`Play in ${gameName(c)}. Bring the results back here.`}
      />
      {c.sideEvents.some((e) => e.status === 'pending') && (
        <section className="notice">
          <div>
            <strong>There’s more to that big game.</strong>
            <p>An optional postgame conversation is waiting. Your next game is still available.</p>
          </div>
          <button className="button secondary" onClick={() => onPage('story')}>
            Open side event
          </button>
        </section>
      )}
      {c.status === 'setup' ? (
        <Setup career={c} onChange={onChange} />
      ) : c.status === 'draft' ? (
        <Draft career={c} onChange={onChange} />
      ) : edit ? (
        <RecapForm
          key={edit.id}
          career={c}
          initial={edit}
          editing
          onCancel={() => setEditing(null)}
          onSave={async (r) => {
            await onChange(editRecap(c, r));
            setEditing(null);
          }}
        />
      ) : event ? (
        <section className="notice">
          <ClipboardList size={26} />
          <div>
            <h3>A conversation comes first.</h3>
            <p>{event.title} — resolve this story event before recording your next game.</p>
          </div>
          <button className="button primary" onClick={() => onPage('story')}>
            Continue story
            <ArrowRight size={16} />
          </button>
        </section>
      ) : c.status === 'postseason' && c.playoffRound === 0 ? (
        <section className="panel empty-section">
          <Trophy size={36} />
          <h2>Did your team make the postseason?</h2>
          <p>
            {isBasketball(c)
              ? 'Report the result after any play-in games in your league. Qualifying starts the first of four best-of-seven rounds.'
              : 'Use your actual Franchise result, including any first-round bye.'}
          </p>
          <div className="button-row">
            <button
              className="button secondary"
              onClick={() => void onChange(choosePostseason(c, 'none'))}
            >
              Season ended
            </button>
            <button
              className="button primary"
              onClick={() => void onChange(choosePostseason(c, 'wildcard'))}
            >
              {isBasketball(c) ? 'Qualified for playoffs' : 'Wild Card berth'}
            </button>
            {!isBasketball(c) && (
              <button
                className="button secondary"
                onClick={() => void onChange(choosePostseason(c, 'divisional'))}
              >
                First-round bye
              </button>
            )}
          </div>
        </section>
      ) : slot ? (
        <RecapForm
          key={`${c.id}-${slot.phase}-${slot.week}`}
          career={c}
          initial={defaultRecap(c)}
          onSave={async (r) => {
            await onChange(submitRecap(c, r));
          }}
        />
      ) : (
        <section className="notice">
          <Trophy size={26} />
          <div>
            <h3>Your rookie season is in the books.</h3>
            <p>Review the games below or revisit your story’s ending.</p>
          </div>
          <button className="button primary" onClick={() => onPage('story')}>
            View retrospective
            <ArrowRight size={16} />
          </button>
        </section>
      )}
      {!!c.recaps.length && (
        <>
          <div className="section-title">
            <h2>Game log</h2>
            <span className="muted">Corrections preserve resolved story history and rewards.</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{isBasketball(c) ? 'Game' : 'Week'}</th>
                  <th>Opponent</th>
                  <th>Result</th>
                  <th>{featuredStats(c.player.position, emptyStats)[0][0]}</th>
                  <th>Status</th>
                  <th>Points earned</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {c.recaps
                  .slice()
                  .reverse()
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        {r.phase === 'preseason'
                          ? 'PRE '
                          : r.phase === 'playoff'
                            ? 'POST '
                            : isBasketball(c)
                              ? 'GAME '
                              : 'WK '}
                        {r.week}
                      </td>
                      <td>{r.opponent}</td>
                      <td>
                        {r.participation === 'bye'
                          ? '—'
                          : `${r.ownScore > r.opponentScore ? 'W' : r.ownScore < r.opponentScore ? 'L' : 'T'} ${r.ownScore}–${r.opponentScore}`}
                      </td>
                      <td>{featuredStats(c.player.position, r.stats)[0][1]}</td>
                      <td>
                        <span className="tag">
                          {r.participation}
                          {r.edited ? ' · corrected' : ''}
                        </span>
                      </td>
                      <td>
                        <details>
                          <summary>+{r.reward} points</summary>
                          {r.rewardBreakdown ? (
                            r.rewardBreakdown.items.map((item, i) => (
                              <p key={i}>
                                {item.label}: {item.points > 0 ? '+' : ''}
                                {item.points}
                              </p>
                            ))
                          ) : (
                            <p>Original award retained from an earlier version.</p>
                          )}
                          <p>Milestone bonuses are recorded separately in the timeline.</p>
                        </details>
                      </td>
                      <td>
                        <button
                          className="text-button"
                          aria-label={`Edit ${r.phase} ${r.week}`}
                          onClick={() => setEditing(r.id)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
function RecapForm({
  career: c,
  initial,
  editing = false,
  onSave,
  onCancel,
}: {
  career: Career;
  initial: Recap;
  editing?: boolean;
  onSave: (r: Recap) => Promise<void>;
  onCancel?: () => void;
}) {
  const [r, setR] = useState(initial),
    [error, setError] = useState('');
  const fields =
      c.player.position === 'PG'
        ? pgFields
        : c.player.position === 'QB'
          ? qbFields
          : c.player.position === 'WR' || c.player.position === 'TE'
            ? wrFields
            : c.player.position === 'RB'
              ? rbFields
              : defenseFields,
    bye = initial.participation === 'bye';
  return (
    <section className="panel recap-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{editing ? 'CORRECT A RECAP' : 'YOUR NEXT CHECK-IN'}</div>
          <h2>
            {initial.phase === 'preseason'
              ? 'Preseason'
              : initial.phase === 'playoff'
                ? isBasketball(c)
                  ? 'Playoff game'
                  : 'Postseason round'
                : isBasketball(c)
                  ? 'Game'
                  : 'Week'}{' '}
            {initial.week}
            {bye ? ' · Bye week' : ''}
          </h2>
        </div>
        <span className="tag">{c.draft?.team}</span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          try {
            await onSave(r);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to save recap.');
          }
        }}
      >
        {isBasketball(c) && !editing && initial.phase === 'playoff' && (
          <p className="notice">{nextGame(c)?.label} · First team to four wins advances.</p>
        )}
        {bye ? (
          <div className="notice">
            <HeartHandshake size={24} />
            <div>
              <strong>A little room to breathe.</strong>
              <p>
                No game stats this week. Record the bye to earn one development point. Active
                performance promises pause.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="recap-top">
              <label>
                Opponent
                <select
                  required
                  value={r.opponent}
                  onChange={(e) => setR({ ...r, opponent: e.target.value })}
                >
                  <option value="">Select opponent</option>
                  {leagueTeams(c.game)
                    .filter((t) => t !== c.draft?.team)
                    .map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                </select>
              </label>
              <label>
                Your score
                <input
                  type="number"
                  min={0}
                  max={isBasketball(c) ? 300 : 150}
                  required
                  value={r.ownScore}
                  onChange={(e) => setR({ ...r, ownScore: Number(e.target.value) })}
                />
              </label>
              <label>
                Opponent score
                <input
                  type="number"
                  min={0}
                  max={150}
                  required
                  value={r.opponentScore}
                  onChange={(e) => setR({ ...r, opponentScore: Number(e.target.value) })}
                />
              </label>
              <label>
                Your participation
                <select
                  value={r.participation}
                  onChange={(e) =>
                    setR({
                      ...r,
                      participation: e.target.value as Recap['participation'],
                      stats: { ...emptyStats },
                    })
                  }
                >
                  <option value="played">Played</option>
                  <option value="injured">Injured / missed game</option>
                  <option value="inactive">
                    {isBasketball(c) ? 'Inactive / DNP' : 'Inactive / no snaps'}
                  </option>
                </select>
              </label>
            </div>
            {r.participation === 'played' ? (
              <div className="stats-form">
                {fields.map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input
                      type="number"
                      step={key === 'sacks' ? 0.5 : 1}
                      required
                      min={key === 'rushingYards' || key === 'receivingYards' ? -100 : 0}
                      max={
                        key === 'points'
                          ? 200
                          : key === 'defensiveSnaps'
                            ? 150
                            : key.includes('Yards')
                              ? 1500
                              : key.includes('TD')
                                ? 30
                                : 100
                      }
                      value={r.stats[key]}
                      onChange={(e) =>
                        setR({ ...r, stats: { ...r.stats, [key]: Number(e.target.value) } })
                      }
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="notice">
                Your team’s result still counts. Player stats remain zero and performance promises
                pause. Recovery and preparation earn one development point.
              </p>
            )}
          </>
        )}
        {isBasketball(c) && (
          <p className="small muted">
            Copy the box score, including made and attempted shots. Points must equal 2 × field
            goals made + three-pointers made + free throws made. Enter minutes rounded to a whole
            minute. DNP and injury check-ins keep player stats at zero.
          </p>
        )}
        {isDefense(c.player.position) && (
          <p className="small muted">
            Record combined total tackles and sacks exactly as Madden reports them; half-sacks are
            supported. Interceptions made are defensive takeaways, not passes thrown. Missed tackles
            and snaps may be left at zero when unavailable.
          </p>
        )}
        <label>
          Your notes <span className="muted">(optional)</span>
          <textarea
            value={r.note}
            maxLength={1000}
            placeholder="The drive, the mistake, the moment you want to remember…"
            onChange={(e) => setR({ ...r, note: e.target.value })}
          />
        </label>
        {editing && (
          <p className="small muted">
            Corrections update statistics without replaying choices, rewards, or promises. A
            resolved playoff win cannot be changed to a loss; restore a backup for that.
          </p>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <section className="notice reward-breakdown">
          <div>
            <strong>
              {editing ? 'Recorded reward' : 'Estimated game reward'}: +
              {editing ? initial.reward : gameReward(c.player.position, r).total} points
            </strong>
            {(editing ? initial.rewardBreakdown : gameReward(c.player.position, r))?.items.map(
              (item, i) => (
                <p key={i}>
                  {item.label}: {item.points > 0 ? '+' : ''}
                  {item.points}
                </p>
              ),
            )}
            {editing && !initial.rewardBreakdown && (
              <p>This older recap retains its original award.</p>
            )}
            <details>
              <summary>How game rewards work</summary>
              <p>{rewardGuide(c.player.position)}</p>
              <p>
                Estimates become final after a valid recap is saved. Corrections preserve the
                original award and its breakdown.
              </p>
            </details>
          </div>
        </section>
        <div className="form-actions">
          <span className="muted">
            {editing
              ? 'Previously awarded points stay unchanged.'
              : `+${gameReward(c.player.position, r).total} development points estimated · milestone bonuses are separate`}
          </span>
          {onCancel && (
            <button className="button secondary" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="button primary">
            {editing ? 'Save correction' : bye ? 'Record bye week' : 'Save game recap'}
            <Check size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
export function ProgressionView({
  career: c,
  onChange,
}: {
  career: Career;
  onChange: ChangeCareer;
}) {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="EARNED, NEVER BOUGHT"
        title="Build the player you believe in."
        description={`Your app ratings are the source of truth. Copy these values into ${gameName(c)}.`}
      >
        <div className="points-badge">
          <Sparkles size={21} />
          <strong>{c.points}</strong>
          <span>
            POINTS
            <br />
            AVAILABLE
          </span>
        </div>
      </PageHeading>
      <div className="notice">
        <Shield size={22} />
        <div>
          <strong>
            {c.player.name} · #{c.player.number} · {c.player.position}
          </strong>
          <p>
            {Math.floor(c.player.height / 12)}′ {c.player.height % 12}″ · {c.player.weight} lb ·{' '}
            {isBasketball(c)
              ? 'Custom league progression.'
              : `${c.player.development} development.`}{' '}
            Only listed attributes are managed. Keep other attributes at your edited prospect’s
            values.
          </p>
          <p>{positions.find((p) => p.id === c.player.position)!.madden}</p>
        </div>
        <button className="button secondary" onClick={() => void onChange(reconcile(c))}>
          Request ratings check
        </button>
      </div>
      <section className="panel progression-table">
        <div className="rating-table-head">
          <span>ATTRIBUTE</span>
          <span>START</span>
          <span>TARGET</span>
          <span>POTENTIAL</span>
          <span>UPGRADE</span>
        </div>
        {Object.entries(c.ratings).map(([key, value]) => {
          const k = key as Attribute,
            cost = upgradeCost(value);
          return (
            <div className="rating-table-row" key={key}>
              <div>
                <strong>{ratingLabel(key)}</strong>
                <div className="meter">
                  <span style={{ width: `${value}%` }} />
                </div>
              </div>
              <span>{c.initialRatings[k]}</span>
              <strong className="rating-target">{value}</strong>
              <span>{c.ceilings[k]}</span>
              <button
                className="upgrade-button"
                aria-label={`Upgrade ${ratingLabel(key)}`}
                disabled={value >= c.ceilings[k]! || c.points < cost}
                onClick={() => void onChange(upgrade(c, k))}
              >
                {value >= c.ceilings[k]! ? (
                  'MAX'
                ) : (
                  <>
                    +1{' '}
                    <small>
                      {cost} PT{cost > 1 ? 'S' : ''}
                    </small>
                  </>
                )}
              </button>
            </div>
          );
        })}
        <p className="small muted">
          Each +1 costs 1 point below 80, 2 below 90, and 3 at 90+. Played games earn 1–5 points
          based on performance. Injury, inactive and bye check-ins earn 1; regular-season milestones
          add 2 separately. Apply the target values over automatic game growth.
        </p>
      </section>
      <details className="panel performance-evidence">
        <summary>Performance reward rules for {c.player.position}</summary>
        <p>{rewardGuide(c.player.position)}</p>
      </details>
      <div className="section-title">
        <h2>Your {gameName(c)} notebook</h2>
        <span className="muted">Confirm actual outcomes to keep both careers aligned.</span>
      </div>
      <div className="action-list">
        {c.actions.length ? (
          c.actions
            .slice()
            .reverse()
            .map((a) => <ActionCard key={a.id} career={c} actionId={a.id} onChange={onChange} />)
        ) : (
          <section className="panel empty-section">
            <CheckCircle2 size={32} />
            <h3>No changes waiting.</h3>
            <p>Earn upgrades or make story choices to add actions here.</p>
          </section>
        )}
      </div>
    </div>
  );
}
function ActionCard({
  career: c,
  actionId,
  onChange,
}: {
  career: Career;
  actionId: string;
  onChange: ChangeCareer;
}) {
  const a = c.actions.find((x) => x.id === actionId)!;
  const [team, setTeam] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState('');
  const finish = async (status: 'completed' | 'unavailable') => {
    try {
      await onChange(resolveAction(c, a.id, status, team, note));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record action.');
    }
  };
  return (
    <section className={`panel action-card ${a.status !== 'pending' ? 'resolved' : ''}`}>
      <div className="panel-heading">
        <h3>
          {a.type === 'trade' ? (
            <ArrowRight size={18} />
          ) : a.type === 'depth' ? (
            <Users size={18} />
          ) : (
            <TrendingUp size={18} />
          )}{' '}
          {a.title}
        </h3>
        <span className="tag">{a.status}</span>
      </div>
      <p>{a.detail}</p>
      {a.status === 'pending' ? (
        <>
          {a.type === 'trade' && (
            <label>
              Actual new team (only after {gameName(c)} completes the trade)
              <TeamSelect value={team} onChange={setTeam} exclude={c.draft?.team} />
            </label>
          )}
          <label>
            Outcome note <span className="muted">(optional)</span>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened in your league save?"
            />
          </label>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="button-row">
            <button className="button primary" onClick={() => void finish('completed')}>
              <Check size={15} />
              {a.type === 'trade' ? 'Confirm completed trade' : `Applied in ${gameName(c)}`}
            </button>
            <button className="button secondary" onClick={() => void finish('unavailable')}>
              Couldn’t apply
            </button>
          </div>
        </>
      ) : (
        <p className="small muted">{a.resolution}</p>
      )}
    </section>
  );
}
export function RelationshipsView({
  career: c,
  onChange,
  onPage,
}: {
  career: Career;
  onChange: ChangeCareer;
  onPage: (p: Page) => void;
}) {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="YOUR PEOPLE. YOUR OPPORTUNITIES."
        title="Trust is part of your game."
        description="Build trust to unlock playing-time opportunities. Apply earned rotation and depth-chart changes in your game, then confirm them in Player progression."
      />
      <div className="relationships-grid">
        {Object.entries(c.relationships).map(([key, value]) => (
          <section className="panel relationship-card" key={key}>
            {key === 'coach' ? <Shield /> : key === 'teammate' ? <Users /> : <Flag />}
            <div className="eyebrow">
              {key === 'coach'
                ? 'THE STAFF'
                : key === 'teammate'
                  ? 'THE LOCKER ROOM'
                  : 'THE OUTSIDE WORLD'}
            </div>
            <h2>
              {key === 'coach'
                ? 'Coach trust'
                : key === 'teammate'
                  ? 'Teammate relationships'
                  : 'Reputation'}
            </h2>
            <strong className="relationship-score">
              {value}
              <small>/ 100</small>
            </strong>
            <div className="meter">
              <span style={{ width: `${value}%` }} />
            </div>
            <h3>{relationshipTier(value)[key as keyof Career['relationships']]}</h3>
            <p className="muted">
              {relationshipTiers.find((t) => t.min > value)
                ? `${relationshipTiers.find((t) => t.min > value)!.min - value} points to the next tier.`
                : 'Highest relationship tier reached.'}
            </p>
            <ol className="relationship-tier-list">
              {relationshipTiers.map((t) => (
                <li
                  key={t.min}
                  className={relationshipTier(value).min === t.min ? 'current-tier' : ''}
                >
                  <span>{t.min}+</span> {t[key as keyof Career['relationships']]}
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <section className="panel achievement-section">
        <div className="eyebrow">COACH TRUST BENEFITS</div>
        <h2>Earn your place</h2>
        <p>
          Current role: <strong>{c.role}</strong>
          {c.game === 'nba2k' && c.rotationMinutes !== null
            ? ` · Confirmed rotation target: ${c.rotationMinutes} minutes/game`
            : ''}
        </p>
        <div className="award-grid">
          {coachBenefits.map((b) => (
            <article className="award-card" key={b.min}>
              <span className="tag">{b.min}+ coach trust</span>
              <h3>{benefitLabel(c, b)}</h3>
              <p>
                {c.relationshipUnlocks.includes(b.min)
                  ? 'Opportunity earned'
                  : c.status === 'complete'
                    ? 'Season complete — not earned'
                    : c.relationships.coach >= b.min
                      ? 'Ready to claim'
                      : `${b.min - c.relationships.coach} more trust needed`}
              </p>
            </article>
          ))}
        </div>
        <p className="muted">
          NBA targets assume 12-minute quarters; scale for shorter games. Madden uses depth-chart
          roles and situational snaps instead of minutes. Keep any larger existing role. Unlocks are
          permanent: a dip in trust changes your tier but does not automatically demote you. No
          roster or minute allocation changes until you apply and confirm them.
        </p>
        <button className="button primary" onClick={() => onPage('progression')}>
          Review playing-time actions
        </button>
        {!['setup', 'draft', 'complete'].includes(c.status) &&
          coachBenefits.some(
            (b) => c.relationships.coach >= b.min && !c.relationshipUnlocks.includes(b.min),
          ) && (
            <button
              className="button secondary"
              onClick={() => void onChange(claimRelationshipBenefits(c))}
            >
              Claim earned coach benefits
            </button>
          )}
        <p className="muted">
          Teammate and reputation tiers describe your standing in the story and its
          relationship-based outcomes. Coach tiers grant the playing-time benefits above. Choices
          and kept or broken promises change these scores.
        </p>
      </section>
      <div className="two-columns">
        <section className="panel">
          <div className="panel-heading">
            <h2>Promises you made</h2>
            <Target size={20} />
          </div>
          {c.promises.length ? (
            c.promises.map((p) => (
              <div className="promise" key={p.id}>
                <span className={`tag ${p.status === 'broken' ? 'warning' : ''}`}>{p.status}</span>
                <h3>{p.label}</h3>
                <p>
                  {p.progress} / {p.target} · {p.remaining} appearances remaining
                </p>
                <div className="meter">
                  <span style={{ width: `${Math.min(100, (p.progress / p.target) * 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <p className="muted">
              No promises on the table. Some choices will ask you to back up your words on the
              field.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Unfinished conversations</h2>
            <HeartHandshake size={20} />
          </div>
          {c.conflicts.length ? (
            c.conflicts.map((x) => (
              <div className="conflict" key={x}>
                <span className="timeline-dot" />
                <p>{x}</p>
              </div>
            ))
          ) : (
            <p className="muted">No active conflicts. Keep showing up for the people around you.</p>
          )}
          <div className="role-card">
            <span className="eyebrow">YOUR CURRENT ROLE</span>
            <h3>{c.role}</h3>
          </div>
        </section>
      </div>
    </div>
  );
}
export function TimelineView({ career: c }: { career: Career }) {
  const [filter, setFilter] = useState('all');
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="EVERY CHAPTER COUNTS"
        title="The story so far."
        description="A permanent record of the choices, games, and progress that made this career."
      />
      <div className="filter-tabs">
        {['all', 'story', 'game', 'progression', 'action', 'setup'].map((f) => (
          <button
            aria-pressed={filter === f}
            className={filter === f ? 'active' : ''}
            key={f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'Everything' : f}
          </button>
        ))}
      </div>
      <div className="timeline">
        {c.timeline
          .slice()
          .reverse()
          .filter((t) => filter === 'all' || t.kind === filter)
          .map((t) => (
            <article key={t.id}>
              <div className="timeline-icon">
                {t.kind === 'story' ? (
                  <ClipboardList size={17} />
                ) : t.kind === 'game' ? (
                  <Trophy size={17} />
                ) : (
                  <TrendingUp size={17} />
                )}
              </div>
              <section className="panel">
                <div className="panel-heading">
                  <span className="eyebrow">{t.kind}</span>
                  <time>{new Date(t.at).toLocaleString()}</time>
                </div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </section>
            </article>
          ))}
      </div>
    </div>
  );
}
export function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="error error-banner" role="alert">
      <span>{error}</span>
      <button aria-label="Dismiss error" onClick={onDismiss}>
        <X size={17} />
      </button>
    </div>
  );
}

function SideEvents({ career: c, onChange }: { career: Career; onChange: ChangeCareer }) {
  const active = c.sideEvents.find((e) => e.status === 'pending');
  return (
    <>
      {active && (
        <section className="panel side-event">
          <div className="eyebrow">
            {active.tier?.toUpperCase() ?? 'BIG GAME'} · OPTIONAL SIDE EVENT ·{' '}
            {active.kind.toUpperCase()}
          </div>
          {c.sideEvents.filter((e) => e.status === 'pending').length > 1 && (
            <p className="muted">
              {c.sideEvents.filter((e) => e.status === 'pending').length} conversations waiting.
              Resolve or skip this one to see the next.
            </p>
          )}
          <h2>{active.title}</h2>
          <p className="muted">{active.speaker}</p>
          <p className="dialogue">{active.body}</p>
          <div className="choices">
            {active.choices.map((choice) => (
              <button
                key={choice.id}
                className="side-choice choice"
                onClick={() => void onChange(resolveSideEvent(c, active.id, choice.id))}
              >
                <div>
                  <strong>{choice.label}</strong>
                  <p>{choice.description}</p>
                  <div className="effect-list">
                    {Object.entries(choice.effects)
                      .filter(([, v]) => v !== 0)
                      .map(([k, v]) => (
                        <span key={k} className={v < 0 ? 'negative' : ''}>
                          {k === 'teammate'
                            ? 'Locker room'
                            : k === 'coach'
                              ? 'Coach'
                              : 'Reputation'}{' '}
                          {v > 0 ? '+' : ''}
                          {v}
                        </span>
                      ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <button
            className="text-button"
            onClick={() => void onChange(resolveSideEvent(c, active.id, null))}
          >
            Skip this side event
          </button>
          <p className="small muted">
            Optional: continue playing and return later. Skipping has no penalty. This conversation
            stays tied to the originally recorded game, even after corrections.
          </p>
        </section>
      )}
      {c.sideEvents.some((e) => e.status !== 'pending') && (
        <details className="panel side-event-history">
          <summary>
            Postgame side-event history ({c.sideEvents.filter((e) => e.status !== 'pending').length}
            )
          </summary>
          {c.sideEvents
            .filter((e) => e.status !== 'pending')
            .slice()
            .reverse()
            .map((e) => (
              <section key={e.id}>
                <h3>{e.title}</h3>
                <p>{e.evidence}</p>
                <p>
                  {e.choice ?? 'Skipped'} · {e.outcome}
                </p>
                <details>
                  <summary>Read side conversation</summary>
                  <p className="dialogue">{e.body}</p>
                </details>
              </section>
            ))}
        </details>
      )}
    </>
  );
}
