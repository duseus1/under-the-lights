import { useState } from 'react';
import { Trophy, Medal, Sparkles } from 'lucide-react';
import type { Career } from '../domain/types';
import { leagueTeams } from '../data/games';
import { RememberButton } from './CareerMemory';
import { PageHeading, type ChangeCareer } from './CareerViews';
import {
  availableAwards,
  awardEligible,
  awardsUnlocked,
  leagueBook,
  personalMetrics,
  recordAward,
  recordKey,
  recordValue,
  recordGames,
  recordLevel,
  setLeagueRecord,
  statName,
  tierNames,
  type LeagueRecord,
} from '../domain/achievements';

export default function AwardsRecords({
  career: c,
  onChange,
}: {
  career: Career;
  onChange: ChangeCareer;
}) {
  const [phase, setPhase] = useState<'regular' | 'playoff' | 'preseason'>('regular');
  const [editing, setEditing] = useState<LeagueRecord | null>(null);
  const [editingKey, setEditingKey] = useState<string | undefined>();
  const openRecord = (r: LeagueRecord, existing = false) => {
    setEditing(r);
    setEditingKey(existing ? recordKey(r) : undefined);
  };
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedAward, setSelectedAward] = useState('');
  const games = c.recaps.filter((r) => r.phase === phase && r.participation === 'played');
  const highlights = c.recaps
    .filter((r) => r.highlight)
    .slice()
    .reverse();
  const awards = availableAwards(c);
  const selected = awards.find((a) => a.id === selectedAward);
  async function save(make: () => Career, message: string) {
    try {
      setError('');
      await onChange(make());
      setMessage(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save.');
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="THE TROPHY ROOM"
        title="Awards & records"
        description="The honors you earn. The standards you set. Your rookie season, remembered."
      />
      {error && (
        <p role="alert" className="negative">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <div className="achievement-summary">
        <section className="panel">
          <Trophy />
          <strong>{c.awards.length}</strong>
          <span>Season honors</span>
        </section>
        <section className="panel">
          <Medal />
          <strong>+{c.awards.reduce((n, a) => n + a.points, 0)}</strong>
          <span>Points from awards</span>
        </section>
        <section className="panel">
          <Sparkles />
          <strong>{highlights.length}</strong>
          <span>Memorable performances</span>
        </section>
      </div>
      <section className="panel achievement-section">
        <div className="eyebrow">SEASON HONORS</div>
        <h2>Make it official</h2>
        <p className="muted">
          Report awards your player actually won in your game. Each honor pays once per career.
          These are companion progression rewards, separate from game and milestone points.
        </p>
        {!awardsUnlocked(c) && (
          <p className="hint">
            Award entry unlocks after your last regular-season recap. Championship MVP unlocks after
            a completed run to the finals.
          </p>
        )}
        <div className="award-grid">
          {awards.map((a) => {
            const earned = c.awards.find((x) => x.id === a.id);
            return (
              <article key={a.id} className={earned ? 'award-card earned' : 'award-card'}>
                <Medal size={22} />
                <h3>{a.name}</h3>
                <strong>+{earned?.points ?? a.points} points</strong>
                {earned ? (
                  <span className="muted">
                    Recorded · {new Date(earned.at).toLocaleDateString()}
                  </span>
                ) : (
                  <button
                    className="button secondary"
                    disabled={!awardEligible(c, a)}
                    onClick={() => setSelectedAward(a.id)}
                  >
                    Record {a.name}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        {selected && !c.awards.some((a) => a.id === selected.id) && (
          <div className="award-confirm" role="group" aria-label="Confirm award">
            <p>
              Did your player win <strong>{selected.name}</strong>? Confirming adds{' '}
              <strong>{selected.points} progression points</strong> to this career.
            </p>
            <button
              className="button primary"
              onClick={() =>
                void save(
                  () => recordAward(c, selected.id),
                  `${selected.name} recorded. +${selected.points} progression points.`,
                )
              }
            >
              Yes, I won this award
            </button>
            <button className="text-button" onClick={() => setSelectedAward('')}>
              Cancel
            </button>
          </div>
        )}
      </section>
      <section className="panel achievement-section">
        <div className="eyebrow">PERSONAL RECORD BOOK</div>
        <h2>Your best, so far</h2>
        <label>
          Record phase{' '}
          <select value={phase} onChange={(e) => setPhase(e.target.value as typeof phase)}>
            <option value="regular">Regular season</option>
            <option value="playoff">Postseason</option>
            {c.game === 'madden' && <option value="preseason">Preseason</option>}
          </select>
        </label>
        <p className="muted">
          {games.length} played games. Injuries, inactive games and byes are excluded. Personal
          bests and totals follow recap corrections.
        </p>
        <div className="table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Stat</th>
                <th>Game best</th>
                <th>Opponent / game</th>
                <th>Season total</th>
              </tr>
            </thead>
            <tbody>
              {personalMetrics(c).map((metric) => {
                const best = games.reduce<(typeof games)[number] | undefined>(
                  (best, r) => (!best || r.stats[metric] > best.stats[metric] ? r : best),
                  undefined,
                );
                return (
                  <tr key={metric}>
                    <th>{statName(metric)}</th>
                    <td>{best?.stats[metric] ?? '—'}</td>
                    <td>
                      {best ? `${best.opponent} · ${best.phase} ${best.week}` : 'No games yet'}
                    </td>
                    <td>{games.reduce((n, r) => n + r.stats[metric], 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel achievement-section">
        <div className="eyebrow">FRANCHISE & LEAGUE RECORDS</div>
        <h2>A place in history</h2>
        <p className="muted">
          Starter records use selected real-world regular-season marks. Update them to match your
          Madden or 2K league, or add a game or season record. Only strictly beating a mark counts
          as historic; tying it does not. Postseason records are separate. Add a franchise baseline
          for your team or its rookie records. Use your league’s actual marks; no team records are
          assumed. Team records only count games played for that team. Older games with unknown team
          history after a trade are excluded from franchise marks.
        </p>
        <div className="table-wrap">
          <table className="records-table">
            <thead>
              <tr>
                <th>Record</th>
                <th>Record baseline</th>
                <th>Your mark</th>
                <th>Status</th>
                <th>Book</th>
              </tr>
            </thead>
            <tbody>
              {leagueBook(c).map((r) => {
                const value = recordValue(recordGames(c), r);
                return (
                  <tr key={recordKey(r)}>
                    <th>
                      {statName(r.metric)}
                      <small>
                        {r.phase} · {r.scope} · {recordLevel(r)}
                      </small>
                    </th>
                    <td>
                      {r.value}
                      <small>
                        {r.holder}
                        {r.source && (
                          <>
                            {' '}
                            ·{' '}
                            <a href={r.source} target="_blank" rel="noreferrer">
                              Source
                            </a>
                          </>
                        )}
                      </small>
                    </td>
                    <td>{value}</td>
                    <td>
                      {value > r.value ? 'Record broken' : value === r.value ? 'Tied' : 'Chasing'}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        aria-label={`Edit ${r.phase} ${r.scope} ${statName(r.metric)} record`}
                        onClick={() => openRecord({ ...r }, true)}
                      >
                        Edit
                      </button>
                      <RememberButton
                        career={c}
                        onChange={onChange}
                        id={`record-${recordKey(r)}`}
                        title={`${recordLevel(r)} ${statName(r.metric)}`}
                        body={`${r.phase} ${r.scope}: your mark ${value}; baseline ${r.value} (${r.holder}). ${value > r.value ? 'Record broken.' : value === r.value ? 'Tied.' : 'Chasing.'}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            openRecord({
              metric: personalMetrics(c)[0],
              phase: 'regular',
              scope: 'game',
              value: 0,
              holder: '',
            })
          }
        >
          Add league record
        </button>
        <button
          className="button secondary"
          onClick={() =>
            openRecord({
              metric: personalMetrics(c)[0],
              phase: 'regular',
              scope: 'game',
              value: 0,
              holder: '',
              level: 'franchise',
              team: c.draft?.team ?? leagueTeams(c.game)[0],
              rookieOnly: false,
            })
          }
        >
          Add franchise record
        </button>
        {editing && (
          <form
            className="record-editor"
            onSubmit={(e) => {
              e.preventDefault();
              void save(
                () => setLeagueRecord(c, editing, editingKey),
                'Record saved. Future games use this mark.',
              );
            }}
          >
            <h3>{editing.level === 'franchise' ? 'Franchise' : 'League'} record baseline</h3>
            {editing.level === 'franchise' && (
              <label>
                Record team
                <select
                  value={editing.team}
                  onChange={(e) => setEditing({ ...editing, team: e.target.value })}
                >
                  {leagueTeams(c.game).map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Record category
              <select
                value={editing.rookieOnly ? 'rookie' : 'all'}
                onChange={(e) =>
                  setEditing({ ...editing, rookieOnly: e.target.value === 'rookie' })
                }
              >
                <option value="all">All players</option>
                <option value="rookie">Rookie record</option>
              </select>
            </label>
            <label>
              Record statistic
              <select
                value={editing.metric}
                onChange={(e) => setEditing({ ...editing, metric: e.target.value })}
              >
                {personalMetrics(c).map((k) => (
                  <option key={k} value={k}>
                    {statName(k)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              League record phase
              <select
                value={editing.phase}
                onChange={(e) =>
                  setEditing({ ...editing, phase: e.target.value as 'regular' | 'playoff' })
                }
              >
                <option value="regular">Regular season</option>
                <option value="playoff">Postseason</option>
              </select>
            </label>
            <label>
              Record scope
              <select
                value={editing.scope}
                onChange={(e) =>
                  setEditing({ ...editing, scope: e.target.value as 'game' | 'season' })
                }
              >
                <option value="game">Single game</option>
                <option value="season">Season total</option>
              </select>
            </label>
            <label>
              Existing league mark
              <input
                type="number"
                min="0"
                max="100000"
                step={editing.metric === 'sacks' ? '0.5' : '1'}
                required
                value={editing.value}
                onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })}
              />
            </label>
            <label>
              Existing holder / context
              <input
                required
                maxLength={100}
                value={editing.holder}
                onChange={(e) => setEditing({ ...editing, holder: e.target.value })}
              />
            </label>
            <p className="muted">
              Use the record before this rookie season. Changes update the live record book;
              existing highlights and conversations stay as originally recorded.
            </p>
            <button className="button primary" type="submit">
              {editing.level === 'franchise' ? 'Save franchise record' : 'Save league record'}
            </button>
            <button className="text-button" type="button" onClick={() => setEditing(null)}>
              Close editor
            </button>
          </form>
        )}
      </section>
      <section className="panel achievement-section">
        <div className="eyebrow">FOUR LEVELS OF GREATNESS</div>
        <h2>Games people remember</h2>
        <div className="tier-guide">
          <p>
            <b>Breakout</b> · At least 3 prior played games in the same phase, then double your
            average with a meaningful minimum and increase.
          </p>
          <p>
            <b>Standout</b> · An elite game for your position, such as 40 points or 15 assists.
          </p>
          <p>
            <b>Exceptional</b> · Rare production, such as 75 points or 500 passing yards.
          </p>
          <p>
            <b>Historic</b> · A franchise or league game or season record broken against this save’s
            record book, including rookie records.
          </p>
        </div>
        <p className="muted">
          The highest qualifying tier wins. Breakout and standout conversations have a
          three-appearance cooldown and wait for an empty queue. Exceptional and historic games
          always queue a conversation. All highlights are saved here. Game rewards remain 1–5
          points; season awards add the bonuses above.
        </p>
        {!highlights.length && <p>Your first memorable performance is still ahead.</p>}
        {highlights.map((r) => (
          <article className="performance-highlight" key={r.id}>
            <span className={`tier-badge tier-${r.highlight!.tier}`}>
              {tierNames[r.highlight!.tier]}
            </span>
            <p>{r.highlight!.evidence}</p>
            {r.edited && (
              <small>
                Recap corrected. This highlight reflects the original submission; personal and
                league records above use current stats.
              </small>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
