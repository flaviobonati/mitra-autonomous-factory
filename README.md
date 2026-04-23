# Mitra Autonomous Factory

Canonical repository for the autonomous software factory.

This repo is the source of truth for:
- factory phases and transition rules
- gradual context delivery strategy
- system prompts for the main personas
- JSON contracts for handoff between agents

Current scope:
- define the machine before building the control system in Mitra
- keep prompts and schemas clean, deterministic, and auditable

## Core Principles

1. The system stores memory; the coordinator does not.
2. The user talks only to the coordinator.
3. No phase is complete without evidence.
4. Stories are business journeys, not isolated clicks.
5. QA must measure execution against expected story behavior.
6. Large QA coverage must be partitioned into small batches.

## Current Phase Model

1. `Scope Discovery & Construction`
2. `Development`
3. `QA Horizontal`
4. `QA Story Validation`
5. `QA Consolidation`
6. `Fix / Retest Loops`
7. `Release Review`
8. `Production / Monitoring / Learning`

There is no separate "scope approval" phase.
`Scope Discovery & Construction` ends only when the scope artifacts are approved.

## Repository Structure

- `docs/`: architecture decisions and operating model
- `prompts/`: canonical persona prompts
- `schemas/`: JSON schemas for machine-to-machine handoff
