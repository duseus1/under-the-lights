import type { Game } from '../data/games';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Minus, Plus, Sparkles } from 'lucide-react';
import { buildRatings, createCareer, ratingLabel } from '../domain/engine';
import { rules, type Career, type Position, type StoryId, type Attribute } from '../domain/types';
import { stories } from '../data/stories';
import { positions } from '../data/positions';

export default function Builder({
  onCreate,
  onCancel,
  game,
}: {
  game: Game;
  onCreate: (c: Career) => Promise<void>;
  onCancel: () => void;
}) {
  const [step, setStep] = useState(0),
    [position, setPosition] = useState<Position>(game === 'nba2k' ? 'PG' : 'QB'),
    [archetype, setArchetype] = useState(game === 'nba2k' ? 'floor-general' : 'pocket');
  const [name, setName] = useState(''),
    [number, setNumber] = useState(7),
    [height, setHeight] = useState(game === 'nba2k' ? 75 : 76),
    [weight, setWeight] = useState(game === 'nba2k' ? 195 : 225);
  const [allocations, setAllocations] = useState<Record<string, number>>({}),
    [storyId, setStoryId] = useState<StoryId>(game === 'nba2k' ? 'keys-to-offense' : 'succession'),
    [development, setDevelopment] = useState<'Normal' | 'Star'>('Normal');
  const [error, setError] = useState('');
  const spent = Object.values(allocations).reduce((a, b) => a + b, 0);
  const safeHeight = Math.min(80, Math.max(66, height || 66)),
    safeWeight = Math.min(300, Math.max(165, weight || 165));
  const build = buildRatings(archetype, safeHeight, safeWeight, allocations);
  const changeArchetype = (id: string) => {
    const a = rules.archetypes.find((a) => a.id === id)!;
    setArchetype(id);
    setHeight(a.height);
    setWeight(a.weight);
    setAllocations({});
  };
  const changePosition = (p: Position) => {
    setPosition(p);
    const definition = positions.find((position) => position.id === p)!;
    changeArchetype(definition.archetype);
    setStoryId(definition.story);
  };
  return (
    <div className="builder page-enter">
      <button className="text-button" onClick={onCancel}>
        <ArrowLeft size={16} /> Choose another game
      </button>
      <div className="page-heading">
        <div>
          <div className="eyebrow">THE FIRST CHAPTER</div>
          <h1>Every career starts somewhere.</h1>
          <p>Build the player. Choose the story. Earn everything after that.</p>
        </div>
        <div className="step-count">
          0{step + 1}
          <span> / 03</span>
        </div>
      </div>
      <div className="stepper">
        {['Your identity', 'Your game', 'Your story'].map((s, i) => (
          <div className={i === step ? 'current' : i < step ? 'done' : ''} key={s}>
            <span>{i < step ? <Check size={13} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError('');
          if (step < 2) {
            setStep(step + 1);
            return;
          }
          try {
            await onCreate(
              createCareer(
                { name, number, position, archetype, height, weight, development, allocations },
                storyId,
              ),
            );
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create your career.');
          }
        }}
      >
        {step === 0 && (
          <div className="builder-grid">
            <section className="panel form-panel">
              <h2>Make it your name.</h2>
              <p className="muted">
                {game === 'nba2k'
                  ? 'Create this player in your editable NBA 2K league draft class.'
                  : 'This is the player you’ll create in Madden’s draft class.'}
              </p>
              <label>
                Player name
                <input
                  autoFocus
                  required
                  maxLength={40}
                  value={name}
                  placeholder="First and last name"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  Jersey number
                  <input
                    required
                    type="number"
                    min={0}
                    max={99}
                    value={number}
                    onChange={(e) => setNumber(Number(e.target.value))}
                  />
                </label>
                {game !== 'nba2k' && (
                  <label>
                    Development trait
                    <select
                      value={development}
                      onChange={(e) => setDevelopment(e.target.value as 'Normal' | 'Star')}
                    >
                      <option>Normal</option>
                      <option>Star</option>
                    </select>
                  </label>
                )}
              </div>
              <p className="small muted">
                {game === 'nba2k'
                  ? 'Custom league build rules. Apply the listed ratings in your league editor; badges, tendencies, animations and overall potential remain yours to configure. No VC is involved.'
                  : 'Your trait is copied into Madden. App development-point rewards stay the same; reconcile any automatic Madden growth.'}
              </p>
              <label>Your position</label>
              <div className="position-options">
                {positions
                  .filter((p) => (game === 'nba2k' ? p.id === 'PG' : p.id !== 'PG'))
                  .map(({ id: p, name }) => (
                    <button
                      type="button"
                      aria-pressed={position === p}
                      className={position === p ? 'position selected' : 'position'}
                      onClick={() => changePosition(p)}
                      key={p}
                    >
                      <strong>{p}</strong>
                      <span>{name}</span>
                      <Check size={16} />
                    </button>
                  ))}
              </div>
              <p className="small muted">{positions.find((p) => p.id === position)!.madden}</p>
            </section>
            <aside className="identity-card">
              <div className="eyebrow">
                ROOKIE PROSPECT / {game === 'nba2k' ? 'NBA 2K' : 'MADDEN'}
              </div>
              <div className="jersey-number">{String(number).padStart(2, '0')}</div>
              <div>
                <span className="tag">{position}</span>
                <h2>{name || 'Your name here'}</h2>
                <p>Undrafted. Unwritten. All yours.</p>
              </div>
            </aside>
          </div>
        )}
        {step === 1 && (
          <>
            <div className="archetype-grid">
              {rules.archetypes
                .filter((a) => a.position === position)
                .map((a) => (
                  <button
                    type="button"
                    aria-pressed={archetype === a.id}
                    className={`archetype-card ${archetype === a.id ? 'selected' : ''}`}
                    onClick={() => changeArchetype(a.id)}
                    key={a.id}
                  >
                    <div>
                      <Sparkles size={20} />
                      {archetype === a.id && <Check size={18} />}
                    </div>
                    <h3>{a.name}</h3>
                    <p>{a.tagline}</p>
                    <span>{a.description}</span>
                  </button>
                ))}
            </div>
            <div className="builder-grid">
              <section className="panel form-panel">
                <h2>Built for your game.</h2>
                <div className="form-row">
                  <label>
                    Height · {Math.floor(safeHeight / 12)}′ {safeHeight % 12}″
                    <input
                      required
                      type="number"
                      min={66}
                      max={80}
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Weight · lb
                    <input
                      required
                      type="number"
                      min={165}
                      max={300}
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                    />
                  </label>
                </div>
                <p className="muted">
                  A smaller frame favors speed and acceleration.{' '}
                  {game === 'nba2k'
                    ? 'Added weight favors strength.'
                    : 'Added weight favors ball security on offense and strength on defense.'}{' '}
                  Size adjustments are capped; your potential stays visible.
                </p>
                <div className="budget">
                  <span>BUILD POINTS LEFT</span>
                  <strong>
                    {rules.buildBudget - spent}
                    <small> / {rules.buildBudget}</small>
                  </strong>
                </div>
                <p className="small muted">
                  Each point adds +2 to a starting rating. Maximum four points per attribute. You
                  may leave points unused; build points do not carry into the season.
                </p>
              </section>
              <section className="panel ratings-panel">
                <div className="rating-header">
                  <span>ATTRIBUTE</span>
                  <span>START / CEILING</span>
                  <span>POINTS</span>
                </div>
                {Object.entries(build.ratings).map(([key, value]) => (
                  <div className="allocation-row" key={key}>
                    <span>{ratingLabel(key)}</span>
                    <strong>
                      {value}
                      <small> / {build.ceilings[key as Attribute]}</small>
                    </strong>
                    <div className="counter">
                      <button
                        type="button"
                        aria-label={`Decrease ${ratingLabel(key)}`}
                        disabled={!allocations[key]}
                        onClick={() =>
                          setAllocations({ ...allocations, [key]: (allocations[key] ?? 0) - 1 })
                        }
                      >
                        <Minus size={12} />
                      </button>
                      <span>{allocations[key] ?? 0}</span>
                      <button
                        type="button"
                        aria-label={`Increase ${ratingLabel(key)}`}
                        disabled={spent >= rules.buildBudget || (allocations[key] ?? 0) >= 4}
                        onClick={() =>
                          setAllocations({ ...allocations, [key]: (allocations[key] ?? 0) + 1 })
                        }
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="section-title">
              <h2>Same position. A different path.</h2>
              <span className="muted">Two authored rookie-season stories</span>
            </div>
            <div className="story-options">
              {stories
                .filter((s) => s.position === position)
                .map((s, i) => (
                  <button
                    type="button"
                    aria-pressed={storyId === s.id}
                    className={`story-option ${storyId === s.id ? 'selected' : ''}`}
                    key={s.id}
                    onClick={() => setStoryId(s.id)}
                  >
                    <div className="story-option-top">
                      <span>STORY 0{i + 1}</span>
                      {storyId === s.id && <Check size={20} />}
                    </div>
                    <div className="story-option-number">0{i + 1}</div>
                    <h2>{s.name}</h2>
                    <h3>{s.subtitle}</h3>
                    <p>{s.description}</p>
                    <span className="story-option-foot">
                      5 pivotal conversations · branching outcomes
                    </span>
                  </button>
                ))}
            </div>
            <div className="notice">
              <Sparkles size={20} />
              <div>
                <strong>Your decisions will follow you.</strong>
                <p>
                  Choices shape coach trust, teammate relationships, your role, and your ending.
                  Some outcomes ask you to make a manual change in{' '}
                  {game === 'nba2k' ? 'NBA 2K' : 'Madden'}.
                </p>
              </div>
            </div>
          </>
        )}
        {error && (
          <div role="alert" className="error">
            {error}
          </div>
        )}
        <div className="builder-footer">
          <button
            type="button"
            className="button secondary"
            onClick={() => (step ? setStep(step - 1) : onCancel())}
          >
            <ArrowLeft size={16} />
            {step ? 'Previous' : 'Cancel'}
          </button>
          <span>
            {position} · {name || 'New prospect'} · {development} development
          </span>
          <button className="button primary" type="submit">
            {step === 2 ? 'Create my career' : 'Continue'}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
