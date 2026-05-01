# Factory v2 Readiness Contract

Date: 2026-05-01

## Purpose

Factory v2 is ready only when project `w-19658/p-46955` can operate as a real Mitra factory control product, not merely as a smoke-tested mock or one-off bootstrap.

The factory must let a user create a new operational project from the Factory UI, talk to the Coordinator through Telegram, and see every event, card movement, next mission, evidence item, and blocker persisted in the Mitra control project.

## Current Baseline

- Factory control workspace: `19658`
- Factory control project: `46955`
- Factory control dir: `/opt/mitra-factory/workspaces/w-19658/p-46955`
- Canonical repo: `/opt/mitra-factory/mitra-autonomous-factory`
- Primary write surface: Mitra Server Function `af_exchange_event`
- Current known `af_exchange_event` id: `17`
- Hardcoded VPS smoke product created for tests: `w-19658/p-47610`
- The hardcoded smoke proved that events can persist, `NEXT_MISSION_JSON` can be stored, `EXECUTIONS.PHASE` can change, and the public Kanban can show the card in the expected phase.

The hardcoded smoke is evidence, not final readiness.

## User Story After Readiness

The user opens project `46955`, clicks `Adicionar vertical` or `Adicionar projeto`, enters only the project/custom-scope name and Telegram bot reference, and confirms.

The UI must not ask for domain, workspace id, Factory project id, Coordinator model, initial request type, initial intent message, or VPS configuration. Those values belong to the installed Factory configuration.

Behind the UI, the factory creates or anchors a new product project in the configured workspace, writes Project Registry records, prepares the Coordinator package, wires the Telegram wrapper, creates the initial card, and waits for the first real Telegram message.

The Coordinator classifies the request from the conversation. The form does not ask the user to choose the intake type.

When the user clicks a card, the detail view must use the interaction model validated in the mockup work: vertical timeline, occurrence-specific cards, Telegram messages rendered like messages, every round input/output visible, the `NEXT_MISSION_JSON` returned by the Central System, friendly JSON/file viewers, QA notes, buglists, Dev fix outputs, story execution results, and evidence links. A card without organized drill-down into inputs and outputs is not ready.

## Readiness Gates

### Gate 1 - Model v2

The following concepts are versioned, documented, schema-validated, and have passing examples:

- `FACTORY_OCCURRENCES`
- `FACTORY_CARDS`
- `FACTORY_EVENTS`
- `NEXT_MISSIONS`
- `STATE_TRANSITIONS`

### Gate 2 - Factory Instance Config

The install/runtime config is templatized. Workspace id, Mitra app key/token env, base URL, VPS root, Telegram wrapper, gateway, watchers, and safety settings are variables. No production script can silently read `/opt/mitra-factory/.env` and create resources in the wrong workspace.

### Gate 3 - Project Registry

Every factory control project, product project, Coordinator package, wrapper, and vertical/custom scope is registered in Mitra tables before it participates in a run.

### Gate 4 - Migration v2

The current state can be dry-run migrated into v2 without losing event history, card phase, next mission history, coordinator/runtime ownership, or artifact references.

### Gate 5 - Telegram Wrapper

Every inbound and outbound Telegram message is persisted with idempotency. Message persistence and factory event persistence are linked, but not falsely collapsed into one fake Telegram JSON.

### Gate 6 - State Machine and Card Movement

The state machine is the only place allowed to update card phase/status. Every accepted event persists the event, calculates or stores a next mission, updates the card, and exposes the result in the UI. Invalid transitions produce an explicit blocked event; they do not silently fall back to intake.

The UI must prove both the board-level movement and the detail-level audit. Board-level proof is card in the correct phase column. Detail-level proof is clickable card showing the full occurrence history in the same organized UX pattern as the approved mockup.

### Gate 7 - CLI Bootstrap

A CLI can install or anchor a factory on another VPS/workspace using workspace id, Mitra app key/token env, and VPS config. It can plan, apply, verify, and repair without requiring manual hidden edits.

### Gate 8 - New Coordinator Simulation

A fresh Coordinator is started from the new flow, proves it read `COORDINATOR.md`, receives a real Telegram message through the wrapper, uses the Central System for next mission, moves at least two card phases, and never depends on Meta-Agent operational intervention.

### Gate 9 - Evidence 3x

Each gate has three evidence classes:

- local: files, logs, schemas, commits, JSON reports;
- remote: Mitra records, Server Function responses, database counts;
- visual/user-facing: UI DOM/screenshot or Telegram message id.

### Gate 10 - Real Project Migration

Real projects are migrated only after Gates 1-9 pass. No real CMMS or other product run is resumed by the Meta-Agent as part of readiness work.

## Next Mission Quality 10/10

A `NEXT_MISSION_JSON` is 10/10 only when it tells the receiving actor exactly:

- phase;
- current event;
- allowed actor;
- target agent;
- required model;
- mission type;
- title;
- mission instruction;
- next goal;
- next event;
- idempotency key or deterministic idempotency rule;
- workdir requirements;
- required prompt paths;
- input artifacts;
- required outputs;
- schemas or validators;
- preflight checks;
- allowed actions;
- forbidden actions;
- success criteria;
- blocking conditions.

If the Coordinator must infer any of those from memory, the mission is not 10/10.

## Non-Goals For M0/M1

M0/M1 do not migrate production data, create new Mitra tables, deploy Server Functions, restart watchdogs, start a real Coordinator, or operate a client run.

M0/M1 only define the v2 contract, baseline, schemas, examples, and local validation evidence.
