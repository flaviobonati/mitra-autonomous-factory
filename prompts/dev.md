# Dev Prompt Additions

This file is additive.
The canonical base prompt is:
- `prompts/base/dev.base.md`

Always load `dev.base.md` first.
This file only adds machine-contract requirements for the new control system.

## Additions

### Required Structured Handoff

In addition to the base prompt requirements, the Dev must produce:
- `dev_handoff.json`

This handoff must declare:
- what stories the Dev believes are implemented
- what entities are implemented
- what data flows are implemented
- what known gaps remain
- what known risks remain
- what test accounts QA should use
- whether seed/setup actions are still required

### Completion Rule

The Dev cannot declare the round complete if the required structured handoff is missing.
