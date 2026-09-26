import { type Game, gameName } from './data/games';
import { useEffect, useRef, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Film,
  FolderHeart,
  History,
  LayoutDashboard,
  LoaderCircle,
  Monitor,
  Plus,
  Settings,
  ShieldCheck,
  Trophy,
  Upload,
  Users,
  Zap,
} from 'lucide-react';
import { appSchema, type AppState, type Career } from './domain/types';
import { getStory } from './data/stories';
import {
  exportSave,
  listBackups,
  loadState,
  mergeImport,
  nativeImport,
  parseSave,
  saveState,
  storageLabel,
  type Backup,
} from './storage';
import Builder from './components/Builder';
import AwardsRecords from './components/AwardsRecords';
import {
  ErrorBanner,
  GamesView,
  Hub,
  PageHeading,
  ProgressionView,
  RelationshipsView,
  StoryView,
  TimelineView,
  type Page,
} from './components/CareerViews';

const nav: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'hub', label: 'Career hub', icon: LayoutDashboard },
  { id: 'story', label: 'Your story', icon: BookOpen },
  { id: 'games', label: 'Season & games', icon: Trophy },
  { id: 'progression', label: 'Player progression', icon: Zap },
  { id: 'awards', label: 'Awards & records', icon: Trophy },
  { id: 'relationships', label: 'Relationships', icon: Users },
  { id: 'timeline', label: 'Career timeline', icon: History },
];
const errorText = (e: unknown) =>
  e instanceof Error
    ? e.message
    : typeof e === 'string'
      ? e
      : 'Something went wrong. Your previous save is still intact.';
export default function App() {
  const [state, setState] = useState<AppState | null>(null),
    [page, setPage] = useState<Page>('hub'),
    [creating, setCreating] = useState(false),
    [selectedGame, setSelectedGame] = useState<Game | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(''),
    [loadFailed, setLoadFailed] = useState(false);
  const lock = useRef(false),
    main = useRef<HTMLElement>(null);
  const load = () => {
    setLoadFailed(false);
    setError('');
    loadState()
      .then(setState)
      .catch((e) => {
        setError(errorText(e));
        setLoadFailed(true);
      });
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const active = state?.careers.find((c) => c.id === state.activeId) ?? null;
  const go = (p: Page) => {
    setPage(p);
    setCreating(false);
    main.current?.scrollTo({ top: 0 });
  };
  const commit = async (next: AppState) => {
    if (lock.current) throw new Error('A save is already in progress. Please try again.');
    lock.current = true;
    setBusy(true);
    try {
      const validated = appSchema.parse(next);
      await saveState(validated);
      setState(validated);
      setError('');
    } catch (e) {
      setError(errorText(e));
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const run = async (task: () => Promise<unknown>) => {
    try {
      await task();
    } catch (e) {
      setError(errorText(e));
    }
  };
  const changeCareer = async (next: Career) => {
    if (!state) return;
    await commit({ ...state, careers: state.careers.map((c) => (c.id === next.id ? next : c)) });
  };
  // UI callbacks report errors centrally without leaving unhandled rejected promises.
  const safeChange = async (next: Career) => {
    try {
      await changeCareer(next);
    } catch (e) {
      setError(errorText(e));
      throw e;
    }
  };
  useEffect(() => {
    const listener = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      setError(errorText(event.reason));
    };
    window.addEventListener('unhandledrejection', listener);
    return () => window.removeEventListener('unhandledrejection', listener);
  }, []);
  if (!state)
    return (
      <div className="loading-screen">
        <img src="/mark.svg" alt="" />
        <h1>Under the Lights</h1>
        {loadFailed ? (
          <>
            <p className="error" role="alert">
              {error}
            </p>
            <p>Your saved data has not been overwritten.</p>
            <button className="button primary" onClick={load}>
              Try loading again
            </button>
            <Recovery
              onRestore={async (data) => {
                const next = parseSave(data);
                await saveState(next);
                setState(next);
                setError('');
              }}
              onError={setError}
            />
          </>
        ) : (
          <>
            <LoaderCircle className="spin" />
            <p>Opening your career notebook…</p>
          </>
        )}
      </div>
    );
  return (
    <div
      className={`app theme-${state.settings.theme} ${state.settings.reducedMotion ? 'reduce-motion' : ''}`}
    >
      <aside className="sidebar">
        <button className="brand" onClick={() => go('hub')} aria-label="Under the Lights home">
          <img src="/mark.svg" alt="" />
          <span>
            UNDER
            <br />
            THE LIGHTS
          </span>
        </button>
        <div className="sidebar-caption">YOUR GAME. YOUR STORY.</div>
        <button className="career-selector" onClick={() => go('careers')}>
          <span className="avatar">
            {active
              ? active.player.name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join('')
              : 'UTL'}
          </span>
          <span>
            <strong>{active?.player.name ?? 'Your next chapter'}</strong>
            <small>
              {active ? `${active.player.position} · Rookie season` : 'Create your first career'}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">THE CAREER</div>
        <nav aria-label="Career navigation">
          {nav.map((n) => (
            <button
              key={n.id}
              disabled={!active && n.id !== 'hub'}
              className={page === n.id && !creating ? 'active' : ''}
              onClick={() => go(n.id)}
            >
              <n.icon size={18} />
              {n.label}
              {n.id === 'story' && active && active.choices.length < 5 && (
                <span className="nav-dot" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className={page === 'careers' ? 'active' : ''} onClick={() => go('careers')}>
            <FolderHeart size={18} /> My careers{' '}
            <span className="count">{state.careers.length}</span>
          </button>
          <button className={page === 'settings' ? 'active' : ''} onClick={() => go('settings')}>
            <Settings size={18} /> Settings
          </button>
          <div className="local-note">
            <ShieldCheck size={15} />
            <span>LOCAL SAVES. TOTAL CONTROL.</span>
          </div>
          <div className="version">
            INDEPENDENT COMPANION <span>v0.8</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            MY CAREER <ChevronRight size={12} />{' '}
            <span>
              {creating
                ? 'CREATE A PLAYER'
                : page === 'settings'
                  ? 'SETTINGS'
                  : page === 'careers'
                    ? 'MY CAREERS'
                    : nav.find((n) => n.id === page)?.label.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="saved-indicator">
              {busy ? <LoaderCircle size={12} className="spin" /> : <span />}
              {busy ? 'Saving…' : 'Saved on this device'}
            </span>
            <button
              className="icon-button"
              title="App information and backup settings"
              aria-label="App information and backup settings"
              onClick={() => go('settings')}
            >
              <CircleHelp size={18} />
            </button>
          </div>
        </header>
        <main ref={main} id="main-content">
          {error && <ErrorBanner error={error} onDismiss={() => setError('')} />}
          <fieldset disabled={busy} className="workspace-fieldset">
            {creating && !selectedGame ? (
              <GameSelection onSelect={setSelectedGame} onBack={() => setCreating(false)} />
            ) : creating ? (
              <Builder
                game={selectedGame!}
                onCancel={() => setSelectedGame(null)}
                onCreate={async (c) => {
                  await commit({ ...state, careers: [...state.careers, c], activeId: c.id });
                  setCreating(false);
                  go('hub');
                  setToast(`Your career is ready. Let’s bring it into ${gameName(c)}.`);
                }}
              />
            ) : page === 'settings' ? (
              <SettingsView state={state} onCommit={commit} notify={setToast} onError={setError} />
            ) : page === 'careers' ? (
              <Careers
                state={state}
                onCreate={() => {
                  setSelectedGame(null);
                  setCreating(true);
                }}
                onSelect={(id) =>
                  void run(async () => {
                    await commit({ ...state, activeId: id });
                    go('hub');
                  })
                }
              />
            ) : !active ? (
              <Welcome
                onCreate={() => {
                  setSelectedGame(null);
                  setCreating(true);
                }}
                onImport={() => go('settings')}
              />
            ) : page === 'hub' ? (
              <Hub career={active} onChange={safeChange} onPage={go} />
            ) : page === 'story' ? (
              <StoryView career={active} onChange={safeChange} onPage={go} />
            ) : page === 'games' ? (
              <GamesView career={active} onChange={safeChange} onPage={go} />
            ) : page === 'progression' ? (
              <ProgressionView career={active} onChange={safeChange} />
            ) : page === 'relationships' ? (
              <RelationshipsView career={active} onChange={safeChange} onPage={go} />
            ) : page === 'awards' ? (
              <AwardsRecords career={active} onChange={safeChange} />
            ) : (
              <TimelineView career={active} />
            )}
          </fieldset>
          <footer className="page-footer">
            <span>
              UNDER THE LIGHTS <span className="footer-dot">/</span> YOUR CAREER BELONGS TO YOU.
            </span>
            <span>{storageLabel()}</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Welcome({ onCreate, onImport }: { onCreate: () => void; onImport: () => void }) {
  return (
    <div className="page-enter welcome">
      <div className="hub-welcome">
        <div>
          <div className="eyebrow">A DIFFERENT KIND OF CAREER MODE</div>
          <h1>The game is theirs. The story is yours.</h1>
        </div>
        <span className="season-pill">
          <span /> MADDEN + NBA 2K
        </span>
      </div>
      <section className="career-hero welcome-hero">
        <img src="/stadium.svg" alt="A rookie player under stadium lights" />
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" /> WELCOME TO UNDER THE LIGHTS
          </div>
          <h2>
            More than
            <br />
            <em>a name on a jersey.</em>
          </h2>
          <p>
            Build your player. Find your place in the locker room.
            <br />
            Make the choices that turn a rookie season into your story.
          </p>
          <button className="button primary" onClick={onCreate}>
            Continue
            <ArrowRight size={18} />
          </button>
          <button className="hero-import text-button" onClick={onImport}>
            Already have a save? Import it
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="hero-bottom">
          <span>01 / THE ROOKIE CHAPTER</span>
          <span>OFFLINE. INDEPENDENT. ALL YOURS.</span>
        </div>
      </section>
      <div className="welcome-features">
        <section>
          <span className="feature-number">01</span>
          <div>
            <h3>Build your kind of player.</h3>
            <p>
              Choose Madden or NBA 2K. Build your player with starting ratings and a ceiling worth
              chasing.
            </p>
          </div>
        </section>
        <section>
          <span className="feature-number">02</span>
          <div>
            <h3>Give your choices weight.</h3>
            <p>
              Football and basketball stories. Trust to earn, promises to keep, and a career that
              remembers.
            </p>
          </div>
        </section>
        <section>
          <span className="feature-number">03</span>
          <div>
            <h3>Let the game write the rest.</h3>
            <p>
              Play in your league. Record your games. Earn your growth, one appearance at a time.
            </p>
          </div>
        </section>
      </div>
      <section className="bottom-callout">
        <div className="callout-icon">
          <ShieldCheck size={25} />
        </div>
        <div>
          <h3>No coins. No grind for a credit card.</h3>
          <p>Your careers stay on your device. Your progression stays in your hands.</p>
        </div>
        <span className="tag">100% LOCAL</span>
      </section>
    </div>
  );
}
function Careers({
  state,
  onCreate,
  onSelect,
}: {
  state: AppState;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="DIFFERENT PLAYERS. DIFFERENT PATHS."
        title="Your careers."
        description="Every save has its own choices, relationships, and future."
      >
        <button className="button primary" onClick={onCreate}>
          <Plus size={17} />
          New career
        </button>
      </PageHeading>
      <div className="career-cards">
        {state.careers.map((c) => (
          <button
            className={`career-card ${c.id === state.activeId ? 'selected' : ''}`}
            key={c.id}
            onClick={() => onSelect(c.id)}
          >
            <div className="career-card-top">
              <span className="tag">
                {gameName(c)} · {c.player.position} ·{' '}
                {c.status === 'complete' ? 'COMPLETE' : 'ROOKIE'}
              </span>
              {c.id === state.activeId && <span className="eyebrow accent">ACTIVE CAREER</span>}
            </div>
            <div className="card-number">{String(c.player.number).padStart(2, '0')}</div>
            <h2>{c.player.name}</h2>
            <p>{c.draft?.team ?? 'Draft prospect'}</p>
            <div className="career-card-bottom">
              <span>
                {getStory(c.storyId).name}
                <small>
                  {c.recaps.length} check-ins · {c.choices.length} choices
                </small>
              </span>
              <ArrowUpRight size={21} />
            </div>
          </button>
        ))}
        <button className="new-career-card" onClick={onCreate}>
          <Plus size={29} />
          <h3>A new name. A new story.</h3>
          <p>Start an independent career.</p>
        </button>
      </div>
    </div>
  );
}
function SettingsView({
  state,
  onCommit,
  notify,
  onError,
}: {
  state: AppState;
  onCommit: (s: AppState) => Promise<void>;
  notify: (s: string) => void;
  onError: (s: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [backups, setBackups] = useState<Backup[]>([]),
    [restore, setRestore] = useState<Backup | null>(null),
    [incoming, setIncoming] = useState<AppState | null>(null);
  const attempt = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      onError(errorText(e));
    }
  };
  useEffect(() => {
    listBackups()
      .then(setBackups)
      .catch((e) => onError(errorText(e)));
  }, [state, onError]);
  const parse = (data: string) => setIncoming(parseSave(data));
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your experience. Your settings."
        description="Change the presentation, protect your saves, and keep the career yours."
      />
      <section className="panel settings-section">
        <div className="section-title">
          <div>
            <h2>Choose your atmosphere</h2>
            <p className="muted">Same career. Same control. A different feeling.</p>
          </div>
          <Monitor size={22} />
        </div>
        <div className="theme-options">
          {(['broadcast', 'cinematic'] as const).map((theme) => (
            <button
              aria-pressed={state.settings.theme === theme}
              className={`theme-option ${state.settings.theme === theme ? 'selected' : ''}`}
              key={theme}
              onClick={() =>
                void attempt(() => onCommit({ ...state, settings: { ...state.settings, theme } }))
              }
            >
              <div className={`theme-preview ${theme}`}>
                <div />
                <div />
                <div />
              </div>
              <div>
                <span>
                  {theme === 'broadcast' ? <Monitor size={18} /> : <Film size={18} />}
                  <strong>
                    {theme === 'broadcast' ? 'Sports Broadcast' : 'Cinematic Career Hub'}
                  </strong>
                </span>
                {state.settings.theme === theme && <Check size={19} />}
              </div>
              <p>
                {theme === 'broadcast'
                  ? 'Sharp cards, lime accents, and a clear view of your season.'
                  : 'Warmer lighting, larger scenes, and a more immersive story.'}
              </p>
            </button>
          ))}
        </div>
        <label className="toggle-row">
          <span>
            <strong>Reduce motion</strong>
            <small>
              Minimize transitions and animated effects. Your system preference is also respected.
            </small>
          </span>
          <input
            type="checkbox"
            checked={state.settings.reducedMotion}
            onChange={(e) =>
              void attempt(() =>
                onCommit({
                  ...state,
                  settings: { ...state.settings, reducedMotion: e.target.checked },
                }),
              )
            }
          />
        </label>
      </section>
      <section className="panel settings-section">
        <div className="section-title">
          <div>
            <h2>Your saves belong to you</h2>
            <p className="muted">
              {storageLabel()}. Every successful change keeps a rolling backup.
            </p>
          </div>
          <ShieldCheck size={23} />
        </div>
        <div className="button-row">
          <button
            className="button primary"
            onClick={() =>
              void attempt(async () => {
                if (await exportSave(state)) notify('Career export saved.');
              })
            }
          >
            <Download size={16} />
            Export all careers
          </button>
          <button
            className="button secondary"
            onClick={() =>
              void attempt(async () => {
                if (isTauri()) {
                  const data = await nativeImport();
                  if (data) parse(data);
                } else fileInput.current?.click();
              })
            }
          >
            <Upload size={16} />
            Import careers
          </button>
          <input
            className="visually-hidden"
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            aria-label="Import career file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void attempt(async () => {
                  if (file.size > 8_000_000) throw new Error('Import is limited to 8 MB.');
                  parse(await file.text());
                });
              e.target.value = '';
            }}
          />
        </div>
        <p className="small muted">
          Imports add independent copies and preserve your existing careers. Presentation settings
          stay unchanged.
        </p>
        {incoming && (
          <div className="confirmation">
            <h3>
              Import {incoming.careers.length} career{incoming.careers.length === 1 ? '' : 's'}?
            </h3>
            <p>
              {incoming.careers.map((c) => c.player.name).join(', ') ||
                'This file contains no careers.'}
            </p>
            <div className="button-row">
              <button
                className="button primary"
                disabled={!incoming.careers.length}
                onClick={() =>
                  void attempt(async () => {
                    await onCommit(mergeImport(state, incoming));
                    setIncoming(null);
                    notify('Careers imported as independent copies.');
                  })
                }
              >
                Add these careers
              </button>
              <button className="button secondary" onClick={() => setIncoming(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="section-title">
          <h3>Recent recovery points</h3>
          <span className="tag">LAST 10 CHANGES</span>
        </div>
        {backups.length ? (
          <div className="backup-list">
            {backups.map((b) => {
              let names = 'Saved careers';
              try {
                names =
                  parseSave(b.data)
                    .careers.map((c) => c.player.name)
                    .join(', ') || 'Empty career library';
              } catch {
                names = 'Unreadable backup';
              }
              return (
                <div key={b.id}>
                  <History size={17} />
                  <span>
                    <strong>{new Date(b.createdAt).toLocaleString()}</strong>
                    <small>{names}</small>
                  </span>
                  <button className="text-button" onClick={() => setRestore(b)}>
                    Restore
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="muted">Your previous save will appear here after the next change.</p>
        )}
        {restore && (
          <div className="confirmation">
            <h3>Restore this recovery point?</h3>
            <p>
              This replaces all current careers and settings with the snapshot from{' '}
              {new Date(restore.createdAt).toLocaleString()}. Your current state becomes the newest
              recovery point.
            </p>
            <div className="button-row">
              <button
                className="button primary"
                onClick={() =>
                  void attempt(async () => {
                    await onCommit(parseSave(restore.data));
                    setRestore(null);
                    notify('Recovery point restored.');
                  })
                }
              >
                Restore snapshot
              </button>
              <button className="button secondary" onClick={() => setRestore(null)}>
                Keep current careers
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="panel settings-section about">
        <img src="/mark.svg" alt="" />
        <div>
          <h2>
            Under the Lights <span className="tag">v1.0.0</span>
          </h2>
          <p>
            An independent Madden and NBA 2K league companion. Not affiliated with EA, 2K, the NFL,
            the NBA, or its teams. All story characters are fictional roles.
          </p>
          <p>
            Custom player ratings and progression rules · Authored stories · No AI service, account,
            microtransactions, or internet connection required during play.
          </p>
          <p className="small muted">
            The desktop app stores careers in a local SQLite database. Browser preview saves are
            separate; export and import to move between them. Multi-season continuation and direct
            game integration are not part of this release.
          </p>
        </div>
      </section>
    </div>
  );
}
function Recovery({
  onRestore,
  onError,
}: {
  onRestore: (data: string) => Promise<void>;
  onError: (s: string) => void;
}) {
  const [backups, setBackups] = useState<Backup[]>([]),
    [candidate, setCandidate] = useState<Backup | null>(null);
  useEffect(() => {
    listBackups()
      .then(setBackups)
      .catch((e) => onError(errorText(e)));
  }, [onError]);
  return (
    <div className="recovery">
      <h3>Recover a previous save</h3>
      {backups.map((b) => (
        <button className="button secondary" key={b.id} onClick={() => setCandidate(b)}>
          {new Date(b.createdAt).toLocaleString()}
        </button>
      ))}
      {candidate && (
        <div className="confirmation">
          <p>
            Replace the unreadable current state with this backup? The current data will be retained
            as a recovery point.
          </p>
          <button
            className="button primary"
            onClick={() => void onRestore(candidate.data).catch((e) => onError(errorText(e)))}
          >
            Restore selected backup
          </button>
        </div>
      )}
      {!backups.length && (
        <p>No recovery points found. The database is preserved for manual recovery.</p>
      )}
    </div>
  );
}

function GameSelection({
  onSelect,
  onBack,
}: {
  onSelect: (game: Game) => void;
  onBack: () => void;
}) {
  return (
    <div className="page-enter game-selection">
      <button className="text-button" onClick={onBack}>
        ← Back
      </button>
      <PageHeading
        eyebrow="YOUR GAME. YOUR STORY."
        title="Choose your game."
        description="One career companion. Two different journeys. Choose where your next chapter begins."
      />
      <div className="game-options">
        <button
          aria-label="Madden"
          className="game-option football"
          onClick={() => onSelect('madden')}
        >
          <img src="/stadium.svg" alt="" />
          <div>
            <span className="eyebrow">THE GRIDIRON</span>
            <h2>Madden</h2>
            <p>Seven positions. Fourteen stories. A rookie season under the lights.</p>
            <span className="button primary">
              Create a football career <ArrowRight size={18} />
            </span>
          </div>
        </button>
        <button
          aria-label="NBA 2K"
          className="game-option basketball"
          onClick={() => onSelect('nba2k')}
        >
          <img src="/court.svg" alt="" />
          <div>
            <span className="eyebrow">THE HARDWOOD</span>
            <h2>NBA 2K</h2>
            <p>Point guard. Three builds. Earn the keys to an NBA offense.</p>
            <span className="button primary">
              Create a basketball career <ArrowRight size={18} />
            </span>
          </div>
        </button>
      </div>
      <p className="small muted">
        Built around editable league saves and manual updates, without a required game edition. You
        can keep careers for both games in the same library.
      </p>
    </div>
  );
}
