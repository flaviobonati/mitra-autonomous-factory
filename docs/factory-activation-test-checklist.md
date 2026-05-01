# Factory Activation Test Checklist

Date: 2026-05-01

This checklist is the release gate for the Factory activation flow. It exists to prevent a vague "it works" result. Every gate needs primary evidence plus three independent rechecks.

## Role Boundary

- The Meta-Agent is a Meta-Agent persona and validator. It is activated by the Factory through a UI action, a VPS activator, a copied `meta-agent.md`, and a dedicated `tmux` session.
- The Factory Control project, Server Functions and VPS activator create product projects, Coordinator packages, bot runners, `tmux` sessions, git repositories and Central System records.
- A Coordinator is not created manually by the Meta-Agent. If a Coordinator only exists because an operator typed shell commands in a Meta-Agent session, the test failed.
- Saving `@username` and a token reference is not enough. The activation button must create the runtime folder, copy the correct prompt, start `tmux`, write heartbeat evidence and update the Factory records.
- There is no global/main Telegram bot shortcut for product cards. Meta-Agent bot and project bot are separate inputs and separate runtimes.

## Can These Tests Run Without A New VPS?

Mostly yes.

The same VPS can validate the important contract by using unique names, isolated folders, isolated `tmux` sessions, separate project ids and separate Telegram bot secret refs. This proves the activation and isolation logic.

A brand new VPS is still useful as a final portability proof because it catches hidden dependencies such as local-only prompts, missing packages, implicit env vars, stale cache and unreproducible install commands.

## Gate 0 - Public Canonical Repo

Primary evidence:

- `git ls-remote https://github.com/flaviobonati/mitra-autonomous-factory.git refs/heads/main` works without authentication.
- `prompt-manifest.json` exists in the public repo and includes Meta-Agent, Coordinator, Dev, QA, schemas and activator scripts.

Recheck 1:

- Secret scan over selected files and git history finds no GitHub PAT, Telegram bot token, OpenAI token, Anthropic token or private key.

Recheck 2:

- `factory-vps-activator.mjs` can clone/fetch the public repo snapshot without a token.

Recheck 3:

- Required files from `prompt-manifest.json` exist in the fetched snapshot and their hashes match.

Pass condition:

- The activator refuses to create runtime folders when the public repo is unreachable or required files are missing.

## Gate 1 - Create Project From UI/SF

Input:

- `project_name`
- `project_bot_username`
- `project_bot_token_secret_ref`

Forbidden input:

- raw bot token
- old `telegram_bot_ref`
- workspace/project/model/VPS overrides from the UI

Primary evidence:

- `createProjectRequest` returns `ok:true`, a Mitra product `project_id`, `request_code`, `execution_code` and `coordinator_code`.
- `FACTORY_PROJECT_REQUESTS` stores the bot username and secret ref, never the raw token.
- `EXECUTIONS` row exists with phase `Scope Discovery & Construction`.

Recheck 1:

- Product folder exists at `/opt/mitra-factory/workspaces/w-<workspace_id>/p-<project_id>` and is not the Factory Control project folder.

Recheck 2:

- Product folder contains Mitra files, frontend/backend files and a `.git` repository with an initial commit.

Recheck 3:

- `PROJECT_REGISTRY`, `COORDINATOR_REGISTRY` or equivalent runtime records agree on the same `project_id`, `execution_code`, `coordinator_code`, bot username and secret ref.

Pass condition:

- After public repo gate passes, the activator creates the product project and Coordinator package without manual shell intervention.

## Gate 2 - Coordinator Runtime

Primary evidence:

- Coordinator folder exists at `/opt/mitra-factory/coordinators/<coordinator_code>`.
- It contains `COORDINATOR.md`, all persona prompts, docs, schemas, `runtime_contract.json`, `coordinator_spawn_readiness.json` and `outbox/coordinator_package_readiness.json`.

Recheck 1:

- `COORDINATOR.md` hash and byte count match the public repo snapshot recorded in the manifest/package.

Recheck 2:

- Dedicated `tmux` session exists and is named from the Coordinator code, not reused from another run.

Recheck 3:

- `runtime_contract.json` contains the exact `project_id`, `execution_code`, `coordinator_code`, project workdir, gateway command and Telegram bot binding.

Pass condition:

- On first real user message, the Coordinator can answer from the copied package and Central System `NEXT_MISSION_JSON` without asking the operator for missing context.

## Gate 3 - Activate Meta-Agent

Input:

- Meta-Agent bot `@username`
- Meta-Agent bot token secret ref

Forbidden input:

- raw bot token
- product project bot fields reused as Meta-Agent runtime
- manual instruction that turns Meta-Agent into a Coordinator

Primary evidence:

- `activateMetaAgentRequest` returns `ok:true` and writes `META_AGENT_ACTIVATION_REQUESTS` plus `META_AGENTS`.

Recheck 1:

- Activator validates the Telegram bot through the secret ref and stores only redacted validation evidence.

Recheck 2:

- Meta-Agent folder exists at `/opt/mitra-factory/meta-agents/<meta_agent_code>` with `META_AGENT.md`, `prompt-manifest.json`, `runtime_contract.json`, `boot_prompt.md`, logs and heartbeat.

Recheck 3:

- Dedicated Meta-Agent `tmux` session exists and the UI shows status, session name, heartbeat and prompt version.

Pass condition:

- When the user sends `oi` to that bot, the response is from the Meta-Agent persona, not a Coordinator or product-card actor.

## Gate 4 - Concurrent Coordinators

Primary evidence:

- Create 2 to 4 project requests with unique project names and bot secret refs.

Recheck 1:

- Each project has a different product `project_id`, workdir and git repository.

Recheck 2:

- Each Coordinator has a different folder, runtime contract and `tmux` session.

Recheck 3:

- Inbound Telegram files and Central System events for one project never appear in another Coordinator folder or execution.

Pass condition:

- All Coordinators can be alive at the same time and each next mission points only to its own project/execution.

## Gate 5 - 100 Percent Central System Registration

Primary evidence:

- Every inbound Telegram message, outbound Telegram message, Coordinator exchange, round, artifact reference, phase and next mission is persisted append-only before any actor continues.

Recheck 1:

- `COORDINATOR_EXCHANGES` has `PAYLOAD_JSON` and `RESPONSE_JSON` for every gateway exchange.

Recheck 2:

- `EXECUTION_ROUNDS` has `INPUT_JSON`, `OUTPUT_JSON`, `NEXT_MISSION_JSON`, actor fields and timestamps for every turn.

Recheck 3:

- `EXECUTIONS.PHASE`, `EXECUTIONS.NEXT_MISSION`, `EXECUTIONS.NEXT_MISSION_JSON` and the Kanban card column agree after each accepted event.

Pass condition:

- The old failure mode, where the card did not move through stages, is impossible to miss because DB phase, next mission and UI column are checked together.

## Gate 6 - CMMS Next Mission Regression

Primary evidence:

- Run `node scripts/simulate-cmms-next-missions.mjs`.
- The script uses `coord_cmms_contract_regression` and `exec_cmms_contract_regression`; it does not restart the old CMMS runtime.

Recheck 1:

- The dedicated CMMS dry-run sequence covers intake, incumbent research, scope, dev, QA Horizontal, horizontal fix/retest, QA Story, story fix/retest, QA consolidation, release and production.

Recheck 2:

- The backend all-case next-mission suite also passes and reports all cases with `simplicity_objectivity_score=10`.

Recheck 3:

- The generated report has exact expected `mission_type`, `phase`, `target_agent` and `next_event` for each CMMS step.

Pass condition:

- Every point where the Coordinator receives a next mission scores 10/10 for simplicity and objectivity.

## Gate 7 - Definition Of 10/10 Next Mission

A next mission scores 10 only when all checks pass:

- `mission_type`, `phase`, `target_agent`, `required_model` and `next_event` are explicit.
- `mission_instruction` is actionable and specific to the current step.
- Required prompt paths are listed.
- Input artifacts and required outputs are listed.
- Schemas or validators are listed.
- Preflight checks, allowed actions, forbidden actions, success criteria and blocking conditions are listed.
- Workdir scope is explicit and forbids other Coordinator folders.
- The mission requires append-only registration before continuing.
- The mission forbids inferring the next phase outside the Central System contract.
- Spawn missions include runner/model/tmux/log/prompt/output/heartbeat requirements.

Anything below 10 must be rewritten before a real Coordinator receives it.

## Final Ready Signal

The activation round is ready only when the evidence bundle contains:

- public repo verification;
- secret scan proof;
- project activation proof;
- Meta-Agent activation proof;
- Coordinator package proof;
- concurrent isolation proof;
- Central System registration proof;
- CMMS regression proof;
- final score table where every next mission point is `10/10`.

