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

- QA Horizontal owns the former monolithic QA rigor: Design, UX, Aderencia and FluxoDados as a horizontal gate
- QA Horizontal does not declare final business-story coverage; story batches do that separately

Return rule:

- if this layer finds a blocking failure, the product can return to Development immediately
- if this layer passes, the system continues to story validation

### 4. QA Story Validation

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

### 5. QA Consolidation

Goal:

- merge horizontal QA and story batches into one final operational verdict

Required outputs:

- `qa_result.json`
- `qa_report.md`

Return rule:

- if consolidation finds missing coverage, missing artifacts or unresolved critical failures, the product returns to Development

### 6. Fix / Retest

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

### 7. Release Review

Goal:

- verify that the product can be handed to the user for final approval or production transition

Required checks:

- scope coverage complete
- QA consolidation approved
- deploy reachable
- test guide available
- credentials/accounts available
- known gaps explicitly accepted or closed

### 8. Production

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
