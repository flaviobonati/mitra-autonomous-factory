# Factory Architecture

## Objective

Deliver production-grade software without human intervention during execution.

The machine is not evaluated by "did it generate a UI?".
It is evaluated by:
- whether the product matches the expected business story
- whether data flows complete end-to-end
- whether evidence exists for interface, data, and artifacts
- how close execution is to the original expected story

## Main Metrics

- `story_accuracy_percent`
- `gap_percent`

Required decomposition:
- `story_gap_percent`
- `ui_gap_percent`
- `data_gap_percent`
- `artifact_gap_percent`

## Phase Contracts

### 1. Scope Discovery & Construction
Goal:
- transform raw intake into approved scope artifacts

Required outputs:
- `scope_state.json`
- `personas.json`
- `entities.json`
- `data_flows.json`
- `user_stories.json`
- `e2e_journeys.json`

Optional supporting outputs:
- `business_rules.json`
- `edge_cases.json`
- `non_functional_requirements.json`

### 2. Development
Goal:
- implement all approved scope artifacts in the Mitra product

Required outputs:
- deployed product
- `dev_handoff.json`
- `questionamentos_{system}_r{N}.md`

Optional but expected in rerounds:
- `buglist.md`

### 3. QA Horizontal
Goal:
- validate interface, UX consistency, navigation, visual quality, and cross-cutting defects

Required outputs:
- `qa_ui_ux_summary.json`
- `bug_list.json`

Return rule:
- if this layer finds a blocking failure, the product can return to Development immediately
- if this layer passes, the system continues to story validation

### 4. QA Story Validation
Goal:
- validate business stories in explicit system-assigned batches

Required outputs:
- `qa_story_results_batch_{NN}.json`

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
- if consolidation finds missing coverage, missing artifacts, or unresolved critical failures, the product returns to Development

## Anti-Fake-Coverage Rules

1. A story can never be marked complete without explicit executed step counts.
2. If QA stops early, it must record where and why.
3. A product cannot be approved if any critical data flow is incomplete.
4. Good UI never compensates for broken data.
5. Large test workloads must be partitioned into explicit, system-assigned batches.
