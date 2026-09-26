import { useState } from 'react';
import type { Career, Recap } from '../domain/types';
import {
  correctionPreview,
  recentForm,
  remember,
  tendencies,
  trends,
  undoCheckIn,
} from '../domain/career-memory';
import { archetypeFor, pendingEvent, record, totals } from '../domain/engine';
import {
  leagueBook,
  recordGames,
  recordValue,
  recordLevel,
  statName,
} from '../domain/achievements';
import { relationshipTier } from '../domain/relationships';
import { getStory } from '../data/stories';
import { PageHeading, type ChangeCareer } from './CareerViews';

export function RememberButton({
  career: c,
  onChange,
  id,
  title,
  body,
}: {
  career: Career;
  onChange: ChangeCareer;
  id: string;
  title: string;
  body: string;
}) {
  const saved = c.moments.some((m) => m.id === id);
  return (
    <button
      type="button"
      className="text-button moment-button"
      aria-pressed={saved}
      aria-label={`${saved ? 'Forget' : 'Remember'} ${title}`}
      onClick={() => void onChange(remember(c, id, title, body))}
    >
      {saved ? '★ Remembered' : '☆ Remember this'}
    </button>
  );
}

export function UndoCheckIn({ career: c, onChange }: { career: Career; onChange: ChangeCareer }) {
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState('');
  if (!c.undo) return null;
  return (
    <section className="panel memory-section" aria-label="Undo last check-in">
      <strong>Last check-in: {c.undo.label}</strong>
      {!confirm ? (
        <button className="text-button" onClick={() => setConfirm(true)}>
          Undo last check-in
        </button>
      ) : (
        <>
          <p>
            This restores the career to just before this check-in, including points, ratings,
            promises, relationships, records, and any new side event. You can submit it again. It
            does not undo edits you made inside Madden or 2K.
          </p>
          <p className="muted">One undo only. Another career change closes this undo window.</p>
          <div className="button-row">
            <button className="button secondary" onClick={() => setConfirm(false)}>
              Keep check-in
            </button>
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await onChange(undoCheckIn(c));
                  setConfirm(false);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Unable to undo.');
                }
              }}
            >
              Confirm undo
            </button>
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function TrendsView({ career: c }: { career: Career }) {
  const [phase, setPhase] = useState<Recap['phase']>('regular');
  const form = recentForm(c);
  return (
    <section className="panel memory-section">
      <div className="section-title">
        <h2>Recent form</h2>
        <span className="tag">{form.tag}</span>
      </div>
      <p>{form.body || 'Play three games in a phase to establish your form.'}</p>
      <label>
        Trend phase
        <select value={phase} onChange={(e) => setPhase(e.target.value as Recap['phase'])}>
          <option value="regular">Regular season</option>
          <option value="playoff">Postseason</option>
          {c.game === 'madden' && <option value="preseason">Preseason</option>}
        </select>
      </label>
      <div className="memory-grid">
        {trends(c, phase).map((t) => {
          const delta = t.current !== null && t.previous !== null ? t.current - t.previous : null;
          return (
            <div key={t.label}>
              <span className="muted">{t.label}</span>
              <h3>
                Last {t.count}: {t.current?.toFixed(1) ?? '—'}{' '}
                {delta === null ? '' : delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→'}
              </h3>
              <small>
                {delta === null
                  ? 'No previous comparison yet'
                  : `Previous ${t.previousCount}: ${t.previous!.toFixed(1)} (${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`}
              </small>
            </div>
          );
        })}
      </div>
      <details>
        <summary>How form and trends work</summary>
        <p>{form.evidence}</p>
        <p>
          HOT: last three grades at least 4. COLD: last three at most 2. SURGING: three rising
          grades, improving by at least 2. INCONSISTENT: a spread of at least 3 across the last
          five. Otherwise STEADY. Evaluated in that order. Form uses the latest check-in’s phase.
        </p>
        <p>
          Trends compare up to five played games with the preceding five in the selected phase.
          Percentages use total makes / attempts; missed games do not count as zero performances.
        </p>
      </details>
    </section>
  );
}

export function CorrectionPreview({ career: c, recap: r }: { career: Career; recap: Recap }) {
  const changes = correctionPreview(c, r),
    old = c.recaps.find((x) => x.id === r.id)!;
  const next = { ...c, recaps: c.recaps.map((x) => (x.id === r.id ? { ...r, team: x.team } : x)) };
  const beforeRecord = record(c),
    afterRecord = record(next);
  const changedRecords = leagueBook(c)
    .map((b) => ({
      book: b,
      before: recordValue(recordGames(c), b),
      after: recordValue(recordGames(next), b),
    }))
    .filter((x) => x.before !== x.after);
  return (
    <section className="panel memory-section" aria-label="Correction preview">
      <h3>Correction preview</h3>
      <p>
        {r.phase} totals and personal bests update immediately. Development points:{' '}
        <b>unchanged ({c.points})</b>. Resolved dialogue, rewards, promises, highlights, and playoff
        advancement stay as recorded.
      </p>
      <p>
        Team record: {beforeRecord.w}–{beforeRecord.l}–{beforeRecord.t} → {afterRecord.w}–
        {afterRecord.l}–{afterRecord.t}
      </p>
      {(old.opponent !== r.opponent ||
        old.ownScore !== r.ownScore ||
        old.opponentScore !== r.opponentScore ||
        old.participation !== r.participation) && (
        <p>
          {old.opponent}: {old.ownScore}–{old.opponentScore} ({old.participation}) → {r.opponent}:{' '}
          {r.ownScore}–{r.opponentScore} ({r.participation})
        </p>
      )}
      {changes.map((x) => (
        <p key={x.label}>
          <b>{x.label}</b>: {x.before} → {x.after} · game best: {x.best} → {x.newBest}
        </p>
      ))}
      {!changes.length && <p>No player-stat totals change.</p>}
      {changedRecords.map((x) => (
        <p key={`${recordLevel(x.book)}-${x.book.metric}-${x.book.scope}`}>
          <b>
            {recordLevel(x.book)} {x.book.scope} {statName(x.book.metric)}
          </b>
          : {x.before} → {x.after} (baseline {x.book.value};{' '}
          {x.after > x.book.value ? 'broken' : x.after === x.book.value ? 'tied' : 'chasing'})
        </p>
      ))}
      {(old.note !== r.note || old.title !== r.title) && (
        <p>Your title or note will also be updated in the game log and timeline.</p>
      )}
    </section>
  );
}

export function Snapshot({ career: c }: { career: Career }) {
  const teamRecord = record(c),
    story = getStory(c.storyId),
    stats = totals(c, 'regular');
  const average = Math.round(
    Object.values(c.ratings).reduce((n, v) => n + v!, 0) / Object.keys(c.ratings).length,
  );
  const broken = leagueBook(c).filter((r) => recordValue(recordGames(c), r) > r.value);
  return (
    <div className="page-enter">
      <PageHeading
        eyebrow="THE PLAYER YOU’RE BECOMING"
        title="Career snapshot."
        description="Your résumé, one season at a time."
      />
      <section className="panel memory-section snapshot-card">
        <span className="eyebrow">SEASON 1 · ROOKIE · {c.status.toUpperCase()}</span>
        <h2>
          #{c.player.number} {c.player.name}
        </h2>
        <p>
          {c.draft?.team ?? 'Awaiting the draft'} · {c.player.position} ·{' '}
          {archetypeFor(c.player.archetype).name}
        </p>
        <div className="memory-grid">
          <div>
            <h3>{c.role}</h3>
            <small>
              {c.rotationMinutes
                ? `${c.rotationMinutes} rotation minutes / game`
                : 'Current career role'}
            </small>
          </div>
          <div>
            <h3>{average}</h3>
            <small>Managed attribute average · game OVR may differ</small>
          </div>
          <div>
            <h3>
              {teamRecord.w}–{teamRecord.l}
              {teamRecord.t ? `–${teamRecord.t}` : ''}
            </h3>
            <small>Regular-season team record</small>
          </div>
          <div>
            <h3>{c.player.development}</h3>
            <small>Development trait · {c.points} available points</small>
          </div>
        </div>
        <p>
          <b>{story.name}</b> ·{' '}
          {c.status === 'complete'
            ? 'Rookie chapter complete'
            : (pendingEvent(c)?.title ??
              `Next: ${story.events.find((e) => !c.choices.some((x) => x.eventId === e.id))?.title ?? 'Season finish'}`)}
        </p>
        <p>
          {c.game === 'nba2k'
            ? `${stats.points} points · ${stats.assists} assists`
            : `${stats.passingYards} passing · ${stats.rushingYards} rushing · ${stats.receivingYards} receiving yards · ${stats.tackles} tackles · ${stats.sacks} sacks`}
        </p>
      </section>
      <TrendsView career={c} />
      <section className="panel memory-section">
        <h2>The résumé</h2>
        <h3>Awards</h3>
        <p>{c.awards.map((a) => a.name).join(' · ') || 'The first award is still ahead.'}</p>
        <h3>Records held</h3>
        {broken.map((r, i) => (
          <p key={i}>
            {recordLevel(r)} · {r.scope} {statName(r.metric)}: {recordValue(recordGames(c), r)}
          </p>
        ))}
        {!broken.length && (
          <p>
            No configured team or league marks broken yet. Personal bests are in Awards & records.
          </p>
        )}
        <h3>Relationships</h3>
        {(['coach', 'teammate', 'reputation'] as const).map((k) => (
          <p key={k}>
            {k}: {relationshipTier(c.relationships[k])[k]} · {c.relationships[k]}
          </p>
        ))}
        <h3>Career tendencies</h3>
        <div className="memory-grid">
          {Object.entries(tendencies(c)).map(([label, n]) => (
            <div key={label}>
              <b>
                {label}: {n}
              </b>
            </div>
          ))}
        </div>
        <p className="muted">
          Counts of authored choice tags, including completed side conversations. No buffs or
          morality score. Repeated tendencies can be remembered in future dialogue.
        </p>
      </section>
    </div>
  );
}
