# Prompt Migration Notes

This file explains what was intentionally preserved and what was intentionally removed from the earlier prompts while adapting them to the new factory model.

## General Rule

The previous prompts were not discarded because they were weak.
They were refined through many incidents and contain real factory learning.

But the new factory has a different execution model:
- system-driven state
- deterministic task packaging
- story-accuracy as the core metric
- QA split into horizontal validation, story validation, and consolidation

Because of that, some parts could not be imported unchanged.

## Researcher

Preserved:
- high rigor for stories
- importance of implantador -> mantenedor -> usuarios finais
- need for explicit data flows
- refusal of vague summaries

Removed or not carried over verbatim:
- sections tied to the older output formatting contract
- sections tied to older market-report packaging that are not yet part of the new machine contract
- wording that assumed direct text delivery instead of structured artifact mapping

Reason:
- the new system needs structured scope artifacts first
- text sections should only remain if they map clearly into machine state

## Dev

Preserved:
- production-grade bar
- requirement to read the native Mitra rules
- refusal of silent omissions
- explicit declaration of what was not implemented

Removed or not carried over verbatim:
- older environment/setup instructions that still need explicit replacement in the new control system
- older delivery artifacts that duplicate the approved scope state
- assumptions tied to the previous factory folder/runtime contract

Reason:
- the new prompt should preserve rigor without freezing old operational details that may no longer fit

## QA

Preserved:
- QA is the most critical trust gate
- Playwright-style real usage mindset
- "use the system, do not photograph it"
- insistence on real execution, DOM verification, and evidence
- strong rejection of fake coverage

Removed or not carried over verbatim:
- the old scoring model centered on Design / UX / Aderencia / FluxoDados as the final universal structure
- wording that assumes one QA prompt handles the entire evaluation model alone
- parts whose logic belongs now to the system-level split between:
  - horizontal QA
  - story QA
  - QA consolidation

Reason:
- the new factory changes the QA architecture
- story accuracy and explicit gap measurement become central
- the QA load must be partitioned deterministically by the system

## What This Means Practically

The older prompts are reference material with real lessons.
The new prompts must inherit their rigor, but not blindly inherit their exact structure.

If a rule from the older prompts is still valid in the new execution model, it should be preserved.
If it conflicts with the new machine design, it should be rewritten, not copied mechanically.
