# Under the Lights — Setup & Game Guide

[← Back to the README](../README.md)

Detailed setup, gameplay rules, save behavior, and development notes. File paths below are relative to the repository root.

A local-first Madden and NBA 2K career companion for Windows 11. React + TypeScript, Tauri 2, and SQLite. No account, remote backend, AI API, or paid service is used.

## Install

The built Windows x64 installer is in `releases/Under the Lights_0.8.0_x64-setup.exe`. It installs for the current user. The installer was built for Windows 11. A native NBA 2K point guard career was verified through creation, stats, upgrades, SQLite persistence, backup retention, and cinematic settings. No developer toolchain is needed to use the installed app.

## Run the playable preview

Install Node.js 22+ and pnpm, then run:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open <http://127.0.0.1:1420>. The browser preview uses IndexedDB. It has the same career engine and UI as the desktop app, but its saves are separate from desktop SQLite. Export/import in Settings transfers careers between them.

## Build the Windows app

The standard native build uses the [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/): Rust’s MSVC toolchain, Visual Studio C++ Build Tools with a Windows SDK, and WebView2. This workspace also has a local, ignored `.tools` toolchain using Rust, LLVM, and the Microsoft CRT/SDK extracted with xwin; `. .\.tools\build-env.ps1` activates it for a PowerShell session without changing system-wide paths.

```powershell
pnpm desktop:dev
pnpm desktop:build
```

The per-user NSIS installer is emitted into `src-tauri/target/release/bundle/nsis`. `.github/workflows/windows.yml` also builds and uploads the installer on manual dispatch or a version tag. It does not publish a release automatically. The installer is unsigned; no signing identity is configured.

Native SQLite tests run with `cargo test --release --locked --manifest-path src-tauri/Cargo.toml`. They verify backup retention and transaction rollback after a simulated write failure. The Windows workflow builds with a statically linked C runtime.

## NBA 2K point guard chapter

Welcome → Continue → Choose your game → Madden or NBA 2K → Create your career. Returning players resume their active save; New career opens game selection again. Football and basketball careers share a library while retaining independent progress.

The first basketball position is **Point Guard** with Floor general, Scoring guard, and Two-way guard builds. **The keys to the offense** follows a rookie competing with a veteran for control of the offense. Five pivotal conversations branch around shared preparation, assists promises, rotation decisions, trade requests, and different leadership endings.

Use an editable league mode (MyNBA/MyLEAGUE or your edition’s equivalent). The companion uses custom ratings and costs, not the paid MyCAREER builder. Its workflow is edition-neutral; available editing and control options depend on your game and mode. See [2K’s MyNBA overview](https://newsroom.2k.com/news/endless-possibilities-await-as-mynba-levels-up-in-nbar-2k26) for its league customization context.

Record an actual NBA draft result, select 8–82 regular-season games (82 by default), and enter basketball box scores. Story pacing scales with the schedule. NBA careers start at the regular-season opener; any play-in is handled in your game before reporting playoff qualification. Playoffs are four best-of-seven series. A loss does not eliminate your team until the fourth loss in a series.

Box scores include minutes, points, assists, rebounds, steals, blocks, turnovers, and made/attempted field goals, threes, and free throws. Shooting totals must agree with points. PG milestones award two points each for 500 points, 200 assists, and 50 steals. Injuries and DNPs pause promises. Rotation and trade changes require manual confirmation, and unavailable actions remain visible.

Old saves default to Madden and missing basketball statistics default to zero. Version-one backups and exports remain supported. Game identity is stored per career, not as a global setting. Badges, tendencies, animations, and unlisted attributes remain user-managed.

## What is playable

- Independent Quarterback, Wide Receiver, Safety, Linebacker, Edge Rusher, Running Back, and Tight End careers; twenty-one archetypes, custom size adjustments, twelve build points, separate starting ratings and attribute ceilings, and Normal/Star development traits.
- Fourteen authored rookie stories, two per position. QB: **The next man up** / **Beyond the playbook**. WR: **Earn every snap** / **More than a highlight**. Safety: **The last line** / **A place in the defense**. Linebacker: **The voice in the huddle** / **Stay on the field**. Edge: **Rush hour** / **Hold the edge**. RB: **Earn the carry** / **More than a checkdown**. TE: **Between two rooms** / **The quarterback’s answer**. Each has five pivotal events, alternate follow-up text, persistent choices, performance promises, and different endings.
- A Franchise setup checklist, reporting the real draft result, three preseason games, eighteen regular-season weeks including one selected bye, and an optional postseason. Wild Card, first-round bye, playoff elimination, and a championship are supported.
- Position-specific game stats, injured/inactive check-ins, a season log, recap corrections, progression, relationships, conflicts, and a permanent timeline.
- Defensive recaps include tackles, TFLs, sacks (including halves), interceptions made, pass deflections, forced fumbles, recoveries, defensive touchdowns, snaps, and missed tackles. Safety maps to FS/SS; linebackers and edge rushers map to the appropriate Madden position and sub-package for your scheme.
- A notebook for manually applying ratings, depth-chart changes, and trades in Madden. Trade requests do not change teams until a real result is reported. Depth-chart actions update the story role only on confirmation.
- Broadcast and cinematic presentation modes, reduced-motion support, keyboard-operable controls, bundled fonts and original SVG artwork.
- Atomic saves, the last ten recovery points, validated JSON export/import, and recovery of unreadable current saves from a valid backup.

## The career loop

1. Create a player and choose a storyline.
2. Follow the checklist to simulate the setup year and edit a generated draft prospect in Madden Franchise. Copy only the ratings listed in Progression; other attributes remain at the prospect’s values.
3. Report Madden’s actual drafting team, round, overall pick, and rookie-season bye week.
4. Resolve the available story conversation, then play the next game in Madden and enter the recap.
5. Spend development points and apply the target ratings manually in Madden, overwriting automatic Madden growth for app-managed attributes.
6. Confirm manual actions or mark them unavailable. Record an actual destination team only after Madden completes a trade.
7. Report the postseason result and review the rookie retrospective.

## Big-game side events

A standout newly recorded game can open an optional press conference, coach conversation, or teammate conversation. A banner appears in the career hub and Season & games; open it in Your story. These are fictional companion conversations, not actions inside the sports game. Responses affect coach trust, teammates, or reputation, with changes shown before selection. Skipping is penalty-free and a pending event never blocks the main story or next game.

Triggers are position-specific: PG 40 points, 15 assists, or a triple-double; QB 400 passing yards or five passing/rushing TDs; WR 180 receiving yards or three receiving TDs; TE 125 receiving yards or two receiving TDs; RB 200 scrimmage yards or three rushing/receiving TDs; Safety two takeaways or 14 tackles; LB two takeaways, 18 tackles, or three sacks; EDGE three sacks, five TFLs, or two takeaways. Takeaways mean interceptions plus fumble recoveries.

Breakout and standout events require an empty queue and three further played appearances after the last offer. Exceptional and historic events bypass these limits and queue in submission order. Event types rotate through press, coach, and teammate scenes; win/loss/tie dialogue reflects the actual result. No AI, random rerolls, or online services are used. Templates live in `src/data/side-events.json`; thresholds and award rewards live in versioned `src/data/achievements.json`.

## Awards, records, and four performance tiers

The sidebar's **Awards & records** screen works for all Madden positions and NBA 2K point guard. Breakout requires three prior played games in the same phase, then at least twice the prior average with a position-specific minimum and increase (e.g. averaging 5 points then scoring 15). Standout uses the position thresholds above; exceptional uses rare production (e.g. 75 points, 500 passing yards). Historic requires strictly exceeding a league game or season record, not tying it or setting a personal best. The highest qualifying tier is saved on every qualifying recap, even when conversation cooldown suppresses a side event. Injuries, inactive games and byes do not qualify or dilute averages.

Award entry unlocks at regular-season finish; championship MVP requires a completed run to the final round. Report honors from the actual game: MVP +12, ROY +8, player-of-year awards +10, selection awards +3–5, NBA Most Improved/Sixth Man +6, championship MVP +10. Exact rewards appear before confirmation. Each award pays once per rookie career and persists in the save and timeline. Award winners are never inferred from player stats.

Personal bests and season totals are separated by phase. The league book includes selected sourced starter records in `src/data/league-records.json`, not an exhaustive or live database. Each save can override these marks or add game/season records from its own league, including postseason. New games compare against the baseline and prior player records. A season threshold triggers once when crossed. Records do not grant extra points; game rewards and separately reported awards control progression.

Corrections update the live record book but preserve original highlight evidence, conversations and points. Changing a league baseline does not retroactively generate conversations. Old saves default to empty award and record-override ledgers; existing recaps populate the live record book. All new state is included in existing SQLite transactions, backups, exports and imports.

The offered text, choices, and source-game evidence are stored in the save. Corrections neither remove an existing event nor award one retroactively. Completed and skipped events remain in their own history and the timeline. Side conversations after the final game remain available but do not rewrite an already-completed main-story ending. Older saves begin with empty side-event history.

`scripts/native-side-events-smoke.mjs` verifies the trigger, response, and persisted SQLite event; results are recorded in `artifacts/native-side-event-result.json`.

`scripts/native-achievements-smoke.mjs` extends that check with season-award entry, exact point credit, league-record overrides, and SQLite reload. Run only against an isolated test data directory; it seeds a season finish. The v0.7 native result is in `artifacts/native-achievements-result.json`.

## Relationship tiers and playing time

All three relationships show five tiers at 0, 40, 65, 80 and 90, plus progress to the next tier. Coach trust grants permanent opportunities: 65 unlocks regular rotation (NBA 24 minutes/game), 80 unlocks a starting spot (30 minutes), and 90 unlocks a featured/core starter role (34 minutes). Madden equivalents use depth-chart placement and situational snaps. NBA minute targets assume 12-minute quarters; scale for shorter games. These are authored companion rules, not automatic edits to either game.

Story decisions, side conversations and kept promises can unlock benefits. A jump across several tiers creates only the highest applicable action; it replaces any older pending coach opportunity. Confirm the edit in Player progression to update the saved role and rotation target, or mark it unavailable if your game cannot apply it or you already have a larger role. Lower trust does not automatically demote you or duplicate a reward. Existing active saves can claim already-earned benefits from Relationships. Completed seasons do not generate new roster opportunities. Teammate/reputation tiers describe standing and existing relationship-based story outcomes; coach tiers grant the roster benefits.

Rules live in `src/data/relationship-tiers.json`. Unlock history, applied minutes and pending actions persist in the same save transaction and export format. `scripts/native-relationships-smoke.mjs` verifies a starter promotion and minute allocation through native SQLite; run only in an isolated test data directory.

## Performance-driven dialogue

Conversations now include authored reactions selected by recorded performance, with no AI, service calls, or randomness. All eight positions are supported. Point guards can hear about ball security, cold shooting, playmaking, efficient scoring, or limited minutes. Football reactions cover passing efficiency, giveaways, receiving production and drops, rushing workload and ball security, tackles, sacks, and takeaways.

Rules and dialogue live in versioned `src/data/performance-dialogue.json`. They evaluate the latest played game and up to three recent played appearances in the same phase. Ratios use aggregate attempts, not an average of game percentages. Opportunity minimums prevent small samples from being graded as slumps. Recorded mistakes take priority over otherwise impressive production. Injuries and inactivity use their own conversations; defensive zeroes without recorded snaps do not imply poor performance.

The existing story scenes, choice branches, promises, relationship effects, and endings remain intact. Open **Why this conversation?** to see the observed statistics behind the selected reaction. Correcting a recap updates an unresolved reaction. Once you choose a response, the full conversation and its performance evidence are saved with that decision; later corrections cannot rewrite them. Old decisions without transcripts remain valid and are not retroactively invented.

`scripts/native-performance-smoke.mjs` checks reaction selection and saved transcripts in the native SQLite app. `artifacts/native-performance-result.json` records the result.

## Performance progression points

Played games begin with one participation point, then add up to two production points, one efficiency point, and one impact point. Mistakes can subtract up to two points from this game’s award, but never reduce your existing bank; the game award is always 1–5. Injury, inactivity, and byes earn one preparation point. Team wins alone do not determine an individual performance award.

Each position has its own thresholds. QB uses combined passing/rushing production; RB uses scrimmage yards; receivers use receiving yards; PG uses scoring, playmaking, rebounding and defensive contributions; defenders use recorded activity and impact plays. Efficiency requires enough recorded opportunities. No blocking or coverage grades are invented from a quiet box score.

The recap form previews the award and explains each component. Expand **How game rewards work** for thresholds, or view the same guide in Progression. The season log preserves each game’s awarded points and breakdown. The timeline records milestone bonuses separately. Corrections preserve previously awarded points and their original breakdowns; old recaps retain their old rewards. Versioned balance lives in `src/data/game-rewards.json`.

`scripts/native-rewards-smoke.mjs` verifies the preview, saved award, breakdown, spending, and SQLite reload. Results are in `artifacts/native-rewards-result.json`.

## Rules and save behavior

Build points add +2 per allocation, maximum four allocations per attribute. Height and weight add bounded starting adjustments without changing potential. Unspent build points do not become career points.

Played games award 1–5 development points, calculated from position-specific production, efficiency, impact plays, and recorded mistakes. Injury/inactive games and byes award one preparation point. Regular-season milestones award two each: QB 1,000/3,000 passing yards and 20 combined passing/rushing TDs; WR 500/1,000 receiving yards and eight receiving TDs; Safety 50 tackles, three interceptions, and ten deflections; Linebacker 75/100 tackles and eight TFLs; Edge five/ten sacks and twelve TFLs; RB 500/1,000 combined rushing/receiving yards and eight combined rushing/receiving TDs; TE 400/800 receiving yards and six receiving TDs. Each +1 upgrade costs one point below 80, two below 90, and three at 90+. Story training can also add a bounded +1.

Promises advance only on played appearances. Injury, inactivity, and byes pause them. A clean appearance requires actual pass attempts, targets, RB carries, or defensive snaps as appropriate for the position. Unfinished promises close as unfulfilled at season end.

**Corrections are historical amendments.** They update displayed stats but preserve already-resolved story events, promise results, rewards, milestones, and endings. They do not award retroactive milestone points. A correction cannot reverse playoff advancement; restore a recovery point to replay that branch.

Events are deterministic: selected story and prior choices determine the branches. No runtime random selection is needed, so reloads cannot reroll outcomes. Draft round, archetype, recent performance, relationships, fulfilled promises, and real trade outcomes personalize later conversations. Story relationships are internal to this app.

Each mutation is validated and persisted before the UI confirms it. SQLite writes the previous snapshot to the backup table and replaces the current snapshot in one transaction, keeping ten backups. Browser preview does the equivalent in a single IndexedDB transaction. Failed writes retain the previous UI state. The native database lives at the Tauri app-data directory for `com.underthelights.career`, in `career.sqlite3`.

JSON imports are limited to version 1 and 8 MB. Imports add independent copies with fresh career IDs; existing careers and presentation settings remain unchanged. Recovery points replace the entire app snapshot and preserve the replaced state as the newest backup. Keep an exported file for long-term archives beyond ten changes.

Earlier QB/WR version-one saves remain compatible; newly added defensive stat fields default to zero. For isolated native tests or a custom portable save location, set `UNDER_THE_LIGHTS_DATA_DIR` to an absolute directory before launching the executable. Otherwise the normal per-user app-data location is used.

## Code map

- `src/domain`: shared validated contracts and pure career transformations.
- `src/data`: versioned progression/build rules, authored story arcs, and team names.
- `src/components` and `src/App.tsx`: player creation, career screens, and desktop navigation.
- `src/storage.ts`: validated persistence/export/import adapters.
- `src-tauri/src/lib.rs`: SQLite transactions, backup queries, and native file dialogs.
- `tests`: season simulations, branch and rule checks, and browser journeys.

Story content uses a typed interface separate from the resolver. Add content by extending the authored data, and version/migrate saves before making incompatible changes. An optional future AI dialogue renderer can consume resolved events without controlling rewards or outcomes.

## Verification

```powershell
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
```

Unit tests cover all authored choices, all twenty-four builds, full seasons, playoff outcomes, build budgets and ceilings, half-sack promises, trades, recap corrections, backward compatibility, and import/save isolation. Browser tests exercise complete seasons for all seven football positions and point guard, reloads, both themes, keyboard interaction, export/import, recovery points, malformed imports, and operation without external network access. Screenshots are saved under `artifacts`.

Verified results: 331 TypeScript unit tests, fifteen browser journeys, and the native SQLite transaction test pass. `scripts/native-basketball-smoke.mjs` verifies PG; `scripts/native-skill-smoke.mjs RB` (or `TE`) covers those positions; `scripts/native-smoke.mjs` covers EDGE. These scripts verify the native application through a test-only WebView2 debugging session; `artifacts/native-PG-result.json` records the new native check. Use an isolated `UNDER_THE_LIGHTS_DATA_DIR` when repeating that check.

This first release ends after the rookie season. It does not control either game, edit their files, model a full league roster, or continue into a second season. Game and league names identify the companion workflow; this is an independent project.
