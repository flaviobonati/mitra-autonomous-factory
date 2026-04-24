# Gradual Context Delivery

Gradual context delivery is a runtime rule of the factory.

The Coordinator and sub-agents must receive enough context to make the current decision correctly, but they should not receive unrelated historical material that increases noise and encourages fake continuity.

## Principle

Gradual never means insufficient.

If an agent cannot safely execute the mission from the provided context packet, the packet is invalid and must be rebuilt from the Central Control System.

## Context Layers

### 1. Fixed Layer

Always loaded.

Contains:

- persona role contract
- global factory rules
- current lifecycle model
- transition criteria
- output format rules
- safety rules
- applicable prompt file

### 2. Product Layer

Loaded from persisted execution state.

Contains:

- `execution_id`
- `coordinator_bot_id`
- product identity
- customer instance identity
- current phase
- current round
- workspace/project identifiers
- runtime paths
- approved artifacts relevant to the phase
- critical timeline events
- user decisions
- known blockers

### 3. Task Layer

Specific to the current mission.

Contains:

- `mission_id`
- exact task
- exact assigned scope
- required model
- inputs
- required outputs
- required evidence
- constraints
- blocking risks
- done criteria
- next transition criteria

## Assembly Rule

The Central Control System assembles context packets. The Coordinator validates them before acting.

Model assignment is part of the packet:

- Coordinator: GPT-5.5
- Researcher: GPT-5.5
- QA Horizontal: GPT-5.5
- QA Story: GPT-5.5
- QA Consolidator: GPT-5.5
- Dev: Claude 4.7

If the required model is unavailable, the mission is blocked. The Coordinator must not silently substitute another model.

If required fields are missing:

1. mark the mission as blocked
2. record the missing fields
3. ask the Central Control System or user for the missing information when appropriate
4. do not delegate
5. do not improvise

## Anti-Pattern

Do not replace missing context with:

- conversation memory
- guesses
- summaries from prior turns
- assumptions about previous projects
- agent confidence

The fix for missing context is better context packaging, not more improvisation.
