# Gradual Context Delivery

## Position

Gradual context delivery is correct.

But "gradual" must never mean "insufficient".
Each agent must always receive the minimum mandatory context required to make the current decision correctly.

## Context Layers

### 1. Fixed Layer
Always loaded.

Contains:
- global factory rules
- persona role contract
- phase model
- transition criteria
- output format rules

### 2. Product Layer
Loaded from system state.

Contains:
- product identity
- current phase
- current round
- approved artifacts relevant to the current phase
- critical past findings

### 3. Task Layer
Specific to the current mission.

Contains:
- exact task
- exact expected output
- constraints
- blocking risks
- required evidence

## Rule

If an agent lacks enough context to safely decide, the system failed context assembly.
The fix is not "let the agent improvise".
The fix is to improve context packaging.

