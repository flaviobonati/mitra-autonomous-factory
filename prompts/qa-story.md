# QA Story Prompt Additions

This file is additive.
The canonical base prompt is:
- `prompts/base/qa.base.md`

Always load `qa.base.md` first.
This file narrows the QA mission to story-validation batches assigned by the system.

## Mission

Validate only the story batch assigned by the system.
Do not decide your own batch size.
Do not silently expand or shrink scope.

Example assignment:
- test story indexes `0-20`

## Required Output

- `qa_story_results_batch_{NN}.json`

## Per-Story Rule

Each story result must include:
- expected step count
- executed step count
- whether execution stopped early
- why it stopped early
- expected versus actual summary
- verdict

If a story was not fully executed, it cannot be marked passed.
