# Factory Architecture

This document defines the runtime architecture of the Mitra Autonomous Factory.

The factory is driven by a Central Control System. The Coordinator does not rely on conversation memory; it receives missions, context packets, artifact references and transition criteria from persisted state.

## Objective

Deliver production-grade vertical software with minimal human intervention during execution.

The machine is evaluated by:

- whether approved stories were implemented
- whether critical data flows complete end-to-end
- whether UI, data and artifacts have evidence
- whether QA coverage is explicit and auditable
- whether each execution advances through the lifecycle without fake progress

## Core Runtime Objects

Every execution must be represented by persisted state:

- `execution_id`
- `coordinator_bot_id`
- `system_name`
- `customer_instance_id`
- `factory_workspace_id`
- `factory_project_id`
- `dev_workspace_id`
- current phase
- current round
- timeline events
- artifact references
- current mission
- next mission

## Main Metrics

Primary story metrics:

- `story_accuracy_percent`
- `gap_percent`
- `story_gap_percent`
- `ui_gap_percent`
- `data_gap_percent`
- `artifact_gap_percent`

Operational QA scores:

- `design_score`
- `ux_score`
- `adherence_score`
- `data_flow_score`

## Story And Journey Definition

A story is not a feature name and not a loose screen description. A story is a testable business journey for one persona trying to complete one business outcome.

Every story must have:

- stable `story_id`
- persona and role
- business objective
- starting state and required preconditions
- explicit ordered steps
- UI expectation for each step
- data/state expectation for each step when applicable
- artifact/output expectation when applicable
- exception paths and failure states
- acceptance criteria

Mandatory story coverage:

- at least one implantation story for each meaningful implementation variation of the product
- at least one data-ingestion story for each primary data source or ingestion mode the product depends on

An implementation variation is any setup path that changes required entities, parameters, permissions, workflows, integrations, calculations or lifecycle states. Examples: B2B vs B2C, single-company vs multi-branch, product sales vs services, email-only help desk vs omnichannel support, manual CSV import vs API/webhook intake.

The data-ingestion story must prove how operational data enters the system, is validated, becomes persisted state, and appears downstream in the UI, flows or artifacts.

A journey is the executable click-by-click version of one or more stories. It must be written so QA can reproduce it without interpretation. Each step should describe:

- actor
- route/screen
- action by click, fill, select, upload, drag, submit or wait
- expected DOM/UI result
- expected database/state result when applicable
- expected database mutation or invariant after the action when applicable
- evidence to capture

If a step cannot be executed or verified, it is not a valid journey step.

## Lifecycle

### 1. Scope Discovery & Construction

Goal:

- transform raw intake into approved scope artifacts

Input modes:

- `market_replication`
- `interactive_discovery`
- `document_driven`

Required outputs:

- `scope_state.json`
- `personas.json`
- `entities.json`
- `data_flows.json`
- `user_stories.json`
- `acceptance_criteria.json`
- `e2e_journeys.json`

Optional supporting outputs:

- `business_rules.json`
- `edge_cases.json`
- `non_functional_requirements.json`

Transition rule:

- this phase ends only when scope artifacts are approved by the user
- there is no separate scope approval phase

### 2. Development

Goal:

- implement the approved scope artifacts in a Mitra product

Required input:

- approved scope artifacts
- development mission
- runtime contract
- native Mitra prompt or mandatory read reference
- Dev prompt
- project/workspace/workdir/credential context
- internal git repository for the project frontend/runtime source

Required outputs:

- deployed product
- `dev_handoff.json`
- `questionamentos_{system}_r{N}.md`
- testing guide or structured guide artifact
- smoke-test evidence

Expected in rerounds:

- `buglist.md`

Transition rule:

- Development cannot advance to QA until the Coordinator validates deploy, handoff, test accounts, known gaps, known risks and smoke evidence.

### 3. QA Horizontal

Goal:

- apply the horizontal 10/10/10/10 gate
- validate interface, UX consistency, navigation, visual quality, cross-cutting data-flow risks and transversal defects

Required outputs:

- `qa_ui_ux_summary.json`
- `bug_list.json`

Shared rigor:

- `qa-core.md`

Boundary:

- QA Horizontal owns the complete horizontal QA rigor: Design, UX, Aderencia/Aderência and FluxoDados as a horizontal gate
- QA Horizontal does not declare final business-story coverage; story batches do that separately

Return rule:

- if this layer finds a blocking failure, the product can return to Development immediately
- the product must loop through Fix / Retest Horizontal until the horizontal 10/10/10/10 gate passes
- only after this gate passes can the system continue to story validation

### 4. Fix / Retest Horizontal

Goal:

- close horizontal QA failures before story validation consumes tokens on a broken product shell

Required inputs:

- `qa_ui_ux_summary.json`
- `bug_list.json`
- prior Dev handoff

Required outputs:

- fix mission
- updated handoff
- evidence for each fixed horizontal item
- horizontal retest result

Return rule:

- if horizontal retest fails, repeat Development fix mission
- if horizontal retest passes 10/10/10/10, continue to QA Story Validation

### 5. QA Story Validation

Goal:

- validate business stories in explicit system-assigned batches

Required outputs:

- `qa_story_results_batch_{NN}.json`

Shared rigor:

- `qa-core.md`

Batch assignment is deterministic and comes from system state.

Example:

- stories `0-20`
- stories `21-40`
- stories `41-55`

Return rule:

- if a batch fails, the product can return to Development without waiting for unrelated future batches
- if all required batches pass, the system continues to QA consolidation

### 6. Fix / Retest Story

Goal:

- close failed story batches without losing per-story traceability

Required inputs:

- failed `qa_story_results_batch_{NN}.json`
- bugs and gaps tied to `story_id`
- prior Dev handoff

Required outputs:

- fix mission by failed story and bug
- updated handoff
- retest result for affected story batches

Return rule:

- if story retest fails, repeat Development fix mission
- if all affected stories pass, continue to QA Consolidation

### 7. QA Consolidation

Goal:

- merge horizontal QA and story batches into one final operational verdict

Required outputs:

- `qa_result.json`
- `qa_report.md`

Return rule:

- if consolidation finds missing coverage, missing artifacts or unresolved critical failures, the product returns to Development

### 8. Escalated Fix / Retest

Goal:

- close QA failures without losing traceability

Required inputs:

- consolidated bugs
- failed stories
- failed flows
- failed horizontal checks
- prior Dev handoff

Required outputs:

- fix mission
- updated handoff
- evidence for each fixed item
- retest result from the relevant QA layer

Return rule:

- repeated failure of the same item requires cause-root investigation before another Dev mission

### 9. Release Review

Goal:

- verify that the product can be handed to the user for final approval or production transition

Required checks:

- scope coverage complete
- QA consolidation approved
- deploy reachable
- test guide available
- credentials/accounts available
- known gaps explicitly accepted or closed

### 10. Production

Goal:

- mark the system as production-ready and preserve the final state

Required outputs:

- production decision
- final URL
- final guide
- final artifact snapshot
- timeline event

## Anti-Fake-Coverage Rules

1. A story can never be marked complete without explicit executed step counts.
2. If QA stops early, it must record where and why.
3. A product cannot be approved if any critical data flow is incomplete.
4. Good UI never compensates for broken data.
5. Large test workloads must be partitioned into explicit, system-assigned batches.
6. No phase transition is valid without the required artifact for that phase.
