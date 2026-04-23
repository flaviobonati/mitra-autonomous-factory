# Researcher Prompt Additions

This file is additive.
The canonical base prompt is:
- `prompts/base/researcher.base.md`

Always load `researcher.base.md` first.
This file only adds the new deterministic contracts required by the factory control system.

## Additions

1. Your output must be mappable into machine artifacts without semantic loss.
2. If evidence is weak, declare uncertainty explicitly instead of inventing certainty.
3. Your work must support direct generation of:
   - `personas.json`
   - `entities.json`
   - `data_flows.json`
   - `user_stories.json`
   - `e2e_journeys.json`
4. The control system may request output by intake mode. Follow that mode-specific contract exactly.
