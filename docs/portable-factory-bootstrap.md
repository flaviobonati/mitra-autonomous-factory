# Portable Factory Bootstrap Contract

Date: 2026-05-01

## Objective Declaration

The target state is a Factory project that another operator can install on a fresh VPS and workspace without hidden local knowledge.

Role boundary:

- `meta-agent.md` instructs the Meta-Agent persona, limits and operating discipline.
- The Factory Control project, Server Functions, backend scripts and VPS activator create records, packages, bot runners, Coordinators and `tmux` sessions.
- The Meta-Agent must not be the manual bootstrapper that production depends on. If the Factory cannot create the Coordinator without a Meta-Agent shell command, the installation is not portable yet.

A colleague must be able to:

1. create a new Mitra workspace;
2. duplicate or install the Factory Control project into that workspace;
3. configure the workspace id, Mitra token reference, base URLs and VPS root in one instance config;
4. configure the Telegram `@username` and secret reference for that installation's Meta-Agent bot;
5. activate the Meta-Agent and see a persistent `tmux` session, heartbeat and status in the Factory UI;
6. create a project/card by entering only project name, project Telegram `@username` and project bot secret reference;
7. send a natural Telegram message to the project bot;
8. see the Coordinator run end-to-end with the same canonical prompts, schemas, next-mission contract, card movement, evidence rules and agent gates used by the current Factory.

If any step requires remembering a local path, manually copying prompts from an old VPS, pasting a token into code, or telling the Coordinator what to do outside `NEXT_MISSION_JSON`, the Factory is not portable.

## Where System Prompts Live

System prompts have three layers, each with a different job.

1. Canonical source: a Git repository, normally `/opt/mitra-factory/mitra-autonomous-factory` after clone, is the source of truth for `prompts/meta-agent.md`, `prompts/coordinator.md`, `prompts/dev.md`, QA prompts, schemas, docs, scripts, validators and examples.
2. Runtime package: when a Meta-Agent, Coordinator, Researcher, Dev or QA is created, the exact prompt files are copied into that actor's run directory with `sha256`, byte count, source repo URL and source commit/ref.
3. Central audit: the Factory Control project stores a prompt snapshot or artifact reference for the exact prompt version used by each actor/run, so a future audit does not depend on the current Git branch still matching the historical run.

Secrets never live in Git. Telegram bot tokens and Mitra tokens live only as environment variables or secret references. The UI and database may store redacted status, `@username`, secret reference name, hash/fingerprint and last validation time, never raw tokens.

Git access rule:

- The canonical Factory repository must be public and clonable through HTTPS without PAT.
- The instance config stores only repo URL/ref/local path/manifest path. It must not expose a public/private switch.
- `canonical_repo.auth_secret_ref`, deploy keys and PATs are forbidden for the Factory prompt repository path.
- The activator must pin a branch/tag/commit, record the resolved commit, and verify prompt hashes before creating a Meta-Agent or Coordinator package.

The Mitra base agent prompt currently referenced from `/opt/mitra-factory/mitra-agent-minimal/system_prompt.md` must become portable as well: either vendored into the canonical repo, pinned as a submodule/package with a lock file, or installed by a script that verifies its expected hash before any actor starts.

Every Coordinator package must include, at minimum:

- `COORDINATOR.md` copied from `prompts/coordinator.md`;
- all sub-agent prompt MDs: `researcher.md`, `dev.md`, `qa-core.md`, `qa-horizontal.md`, `qa-story.md`, `qa-consolidator.md`;
- required docs and schemas;
- Mitra Agent Minimal controlled files: `system_prompt.md`, `AGENTS.md`, `CLAUDE.md` and `.claude/commands/*.md`;
- source repo URL/ref/resolved commit, sha256 and byte count for each copied prompt/doc/schema.

The Coordinator must be instructed to read `COORDINATOR.md` completely and prove it with `agent_readiness.json` before any operational act. Dev and QA packages must likewise prove they read their prompt, Mitra Agent Minimal files and runtime contract before coding or testing.

## Required Data Model

The portable Factory needs these records before a real card can run:

- `FACTORY_INSTANCES`: instance code, workspace id, Factory Control project id, canonical repo URL/ref, VPS root, status.
- `PROMPT_MANIFESTS`: canonical list of required prompt/schema/doc paths with expected hashes.
- `PROMPT_SNAPSHOTS` or `ARTIFACT_REFS`: exact prompt versions copied into each actor package.
- `META_AGENTS`: meta-agent code, Telegram `@username`, token secret ref, prompt snapshot id, tmux session, status, heartbeat, current version.
- `BOT_REGISTRY`: every Telegram bot, role (`meta_agent`, `project`, `coordinator`), username, secret ref, owner entity and validation status.
- `PROJECT_REGISTRY`: Factory Control project, product projects and their workdirs/workspaces.
- `COORDINATOR_REGISTRY`: coordinator code, product project, bot binding, model, package path, tmux session, status.
- `ACTIVATION_REQUESTS`: UI-created requests to activate Meta-Agents or project bots on the VPS.
- Existing operational tables: executions, cards, events, occurrences, rounds, exchanges, IO events, next missions and artifact refs.

## Install Flow

1. Clone or update the canonical Factory Git repository on the VPS.
2. Verify the repo ref/commit and prompt manifest. This must work without PAT because the canonical Factory repository is public.
3. Install dependencies and validate scripts with `node --check` and the repo validators.
4. Create or duplicate the Mitra Factory Control project in the target workspace.
5. Configure one instance file with workspace id, Factory project id, Mitra token env, base URLs, VPS root, canonical repo URL/ref, Meta-Agent bot username and token secret ref.
6. Register the instance in the Factory Control project.
7. Publish or verify Server Functions, especially `af_exchange_event`.
8. Start the VPS activator service responsible for UI activation requests.
9. In the UI, click `Adicionar meta-agent`, enter Telegram `@username` and token secret reference, and submit.
10. The activator validates the bot token without printing it, creates the Meta-Agent package, copies prompts, records prompt snapshots, starts `tmux`, writes heartbeat and updates `META_AGENTS`.
11. The UI shows Meta-Agent status, tmux session, heartbeat, prompt version and Telegram username.
12. The Meta-Agent can now receive Telegram messages through its own bot and operate only as Factory architect/preparer/observer, never as the run Coordinator.

## Project/Card Flow

1. In the Factory UI, click `Adicionar projeto`.
2. Enter only `project_name`, `project_bot_username` and `project_bot_token_secret_ref`.
3. The Factory creates or anchors a product project in the configured workspace, never in the Factory Control project.
4. The Factory writes registry rows for project, bot, coordinator and execution/card.
5. The VPS activator creates the project bot runner and Coordinator package.
6. The Coordinator package copies `COORDINATOR.md`, all required persona prompts, docs, schemas and Mitra Agent Minimal controlled files from the pinned canonical repo/dependency.
7. The Coordinator proves full `COORDINATOR.md` reading with hashes/bytes, plus `runtime_contract.json`, product project isolation, git status and `tmux` session.
8. The user sends a natural Telegram message to the project bot.
9. Inbound message, Coordinator response, classification, next mission, agent spawns, agent outputs, QA, fixes, blockers and approvals are persisted through the Central System.
10. `EXECUTIONS.PHASE`, `EXECUTIONS.NEXT_MISSION_JSON` and the Kanban card move from the accepted event, not from UI-only state.

## Every Small Task To Reach This

1. Create a prompt manifest file listing every required prompt, schema, doc, script and Mitra base prompt dependency.
2. Add `canonical_repo` and `meta_agent` sections to the factory instance config schema.
3. Add examples for a new workspace installation with `@meta_agent_bot` and secret refs, not raw tokens.
4. Add validator checks for repo URL/ref, prompt manifest path, Meta-Agent username, Meta-Agent token secret ref, tmux runtime and heartbeat path.
5. Add database/table setup for prompt manifests, prompt snapshots, meta agents, bot registry and activation requests.
6. Add a UI `Adicionar meta-agent` action that asks for `@username` and token secret/ref.
7. Ensure UI never displays raw bot tokens and never stores them as visible card data.
8. Add a VPS activator script/service that consumes activation requests and starts/stops Meta-Agent sessions.
9. Make the activator clone/pull the canonical repo at a pinned ref and verify prompt hashes before starting anything.
10. Make the activator create `/opt/mitra-factory/meta-agents/<meta_agent_code>` with prompts, config, logs, heartbeat and outbox.
11. Start Meta-Agent in `tmux` and record session name, PID evidence, log path and heartbeat.
12. Register Meta-Agent status back into Mitra tables and expose it in Config.
13. Add `Adicionar projeto` fields for project name, project bot `@username` and project bot secret/ref.
14. Bind every project/card to a project-specific Telegram bot; no global card bot field.
15. Create a product project in the configured workspace and prove it is not the Factory Control project.
16. Copy Coordinator package from the pinned repo, include all sub-agent MDs and Mitra Agent Minimal controlled files, and record prompt snapshots.
17. Make the VPS activator start Coordinator in persistent `tmux` with supervisor/heartbeat, not a one-shot command.
18. Ensure every `NEXT_MISSION_JSON` sent to the Coordinator scores `10/10` for simplicity/objectivity.
19. Ensure the System Central writes every inbound/outbound Telegram message, exchange, round, artifact, next mission, phase and card movement.
20. Add recovery logic for card-not-moving bugs: accepted event, phase, next mission and UI card column must agree.
21. Add E2E smoke on a clean workspace: install, activate Meta-Agent, create project card, send Telegram message, Coordinator responds, card moves at least two phases.
22. Add evidence bundles for local files/logs, Mitra records/SF responses and UI/Telegram proof.
23. Document uninstall/reinstall behavior: secrets remain outside Git, prompt versions stay auditable, old runs stay append-only.
24. Block "ready for friends" unless all gates below have evidence and three rechecks.

## Gates And Evidence

| Gate | Primary Evidence | Recheck 1 | Recheck 2 | Recheck 3 |
| --- | --- | --- | --- | --- |
| Canonical repo | `git rev-parse HEAD` and prompt manifest | `git status --short` | hash all prompt paths | validator accepts manifest |
| Instance config | config JSON | schema/validator output | env workspace matches config | Factory project id differs from product ids |
| Meta-Agent bot | `META_AGENTS` row with username and secret ref | Telegram `getMe` redacted status | tmux session exists | heartbeat updated |
| Prompt portability | prompt snapshots/artifacts | copied files hash match repo | source ref stored | actor readiness references same hashes |
| Project bot | `BOT_REGISTRY` row role `project` | token validated redacted | bot runner log receives update | outbound Telegram id persisted |
| Product project | `PROJECT_REGISTRY` row | realpath not under Factory project | git exists | frontend/backend/Mitra files exist |
| Coordinator | `COORDINATOR_REGISTRY` and package | `COORDINATOR.md` hash/bytes | tmux heartbeat | `agent_readiness.json` valid |
| Central System | SF response `ok:true` | DB rows inserted | `EXECUTIONS.NEXT_MISSION_JSON` stored | card column moved in UI |
| Next mission | quality report score `10/10` | schema validation | no missing actor/model/prompts/outputs | Coordinator can act without inference |
| E2E run | clean-workspace smoke report | Telegram message ids | Playwright screenshot/DOM | local logs and Mitra counts agree |

## Not Ready Conditions

The Factory is not portable if:

- prompts exist only on the current VPS and are not recoverable from the public GitHub repo plus lock files;
- Meta-Agent bot `@username` or token secret/ref is missing from instance config;
- a raw token appears in Git, UI copy, card JSON or final reports;
- the UI creates a card but no VPS process starts;
- Meta-Agent starts but does not record tmux, prompt version and heartbeat;
- a project/card has no project-specific Telegram bot;
- Coordinator package is copied from an unpinned branch without prompt snapshot evidence;
- `NEXT_MISSION_JSON` is generic and requires memory or guesswork;
- card movement exists only visually and not in Central System state;
- the installation cannot be repeated on a new workspace from documented commands.
