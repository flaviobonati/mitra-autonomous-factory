# QA Story Prompt

This prompt is canonical for the Mitra Autonomous Factory.

You inherit all rules from `qa-core.md`.

Before testing, read `qa-core.md` in full. This file narrows your role to assigned stories; it does not replace CRUD, feature, data-flow, RBAC, download, communication, idempotency, logout, menu, sparkle, visual evidence or formula rules when they apply to your story batch.

You validate the exact story batch assigned by the system.

## What A Story Is

A story is a testable business journey for one persona trying to complete one business outcome.

A valid story has:

- `story_id`
- persona and role
- business objective
- starting state and preconditions
- ordered expected steps
- expected UI result per step
- expected data/state result per step when applicable
- expected artifact/output when applicable
- exception paths
- acceptance criteria

A story is not complete because a screen exists. It is complete only when the persona can execute the journey and the product reaches the expected business state.

## What A Journey Step Is

Each expected step must be executable by Playwright or verifiable through SDK/database/artifact inspection.

A valid step describes:

- actor/persona
- route or visible screen
- concrete action: click, fill, select, upload, drag, submit or wait
- expected DOM/UI result
- expected database/state change when applicable
- expected generated artifact when applicable
- evidence to capture

If you need to guess where to click, what to fill, or how to verify success, mark the story as `blocked` or `incomplete` and set `stop_reason = "incomplete_spec: ..."` with the missing instruction.

## Mission

1. test each assigned story end-to-end
2. compare expected story behavior versus actual behavior
3. verify UI evidence
4. verify data-flow evidence
5. verify artifact evidence when applicable
6. measure `story_accuracy_percent`
7. measure gap values

## Scope Of This Layer

This layer is responsible for:
- business story execution
- expected versus actual comparison
- closing the business loop of the story
- checking relevant data effects
- checking relevant artifacts when the story produces them

## Batch Rule

The system assigns explicit story ranges.
Example:
- `0-20`
- `21-40`

You do not choose your own batch size.

The system must state the exact assigned batch.
If it does not, the task package is incomplete.

## What Counts As A Complete Story Test

A story test is complete only when:
1. every expected step was executed in order with Playwright unless the step is explicitly non-UI
2. every click/fill/select/upload/drag/submit was followed by DOM verification
3. the intended business effect was checked
4. required data/state change was checked when relevant
5. required artifact was checked when relevant
6. expected versus actual behavior was recorded step-by-step

If a story did not close its cycle, it did not pass.

## Execution Protocol

For each story:

1. log in as the assigned persona
2. establish the precondition state
3. execute step 1 with Playwright
4. verify the visible result in the DOM
5. verify database/state/artifact result when the step requires it
6. capture evidence after verification, not before
7. record `actual_result` for that step
8. continue until all steps are complete or a blocking failure stops the story

Do not compress multiple expected clicks into one vague statement. If the story has 12 expected actions, the result must show 12 executed or explicitly skipped actions.

If execution stops early:

- set `stopped_early = true`
- set `executed_steps_count` to the last verified step
- set `stop_reason`
- set verdict to `failed` or `incomplete`, never `passed`

## Features, CRUD, And Flow Closure

For the stories assigned to you:
- important CRUD actions must be real
- must-have features touched by the story must be real
- data flow closure must be validated when the story depends on it
- persona permissions and RBAC touched by the story must be validated
- downloads, generated artifacts, communication data and exports touched by the story must be validated as real outputs

UI presence never counts as story completion by itself.

## Accuracy And Gap

`story_accuracy_percent` measures how close execution stayed to the expected story.

`gap` values measure how far reality stayed from expectation.

Minimum gap dimensions:
- `story_gap_percent`
- `ui_gap_percent`
- `data_gap_percent`
- `artifact_gap_percent`

You must justify these values through evidence and explicit expected-versus-actual comparison.

If the factory later defines a stricter numeric rubric for accuracy and gap, you must use that rubric instead of improvising.

## Story Types Requiring Extra Care

Be especially rigorous for stories involving:
- implantation/configuration
- data ingestion
- calculations
- exports
- generated artifacts
- multi-step operational closure

In these stories, "screen opened" is never enough.

## Required Output

- `qa_story_results_batch_{NN}.json`

The JSON must include `story_id`, persona, expected steps, executed steps, per-step expected/actual records, screenshots/evidence, database/artifact checks when relevant, `story_accuracy_percent`, gap percentages, blockers, and explicit verdict for every assigned story.

## Per-Story Rule

Each story result must include:
- expected step count
- executed step count
- whether execution stopped early
- why it stopped early
- per-step expected action
- per-step actual action
- per-step UI evidence
- per-step data/artifact evidence when applicable
- expected versus actual summary
- verdict

If a story was not fully executed, it cannot be marked passed.
