#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const phases = new Set([
  'Scope Discovery & Construction',
  'Development',
  'QA Horizontal',
  'Fix / Retest Horizontal',
  'QA Story Validation',
  'Fix / Retest Story',
  'QA Consolidation',
  'Release Review',
  'Production',
]);

const files = {
  occurrence: 'examples/factory-v2/valid/occurrence.json',
  card: 'examples/factory-v2/valid/card.json',
  event: 'examples/factory-v2/valid/event.json',
  nextMission: 'examples/factory-v2/valid/next_mission.json',
  transition: 'examples/factory-v2/valid/state_transition.json',
  badNextMission: 'examples/factory-v2/invalid/next_mission_missing_workdir.json',
  badTransition: 'examples/factory-v2/invalid/state_transition_fallback.json',
};

const schemas = [
  'schemas/v2/factory_occurrence.schema.json',
  'schemas/v2/factory_card.schema.json',
  'schemas/v2/factory_event.schema.json',
  'schemas/v2/next_mission_v2.schema.json',
  'schemas/v2/state_transition.schema.json',
];

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'));
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

function validCode(prefix, value) {
  return typeof value === 'string' && new RegExp(`^${prefix}_[a-z0-9][a-z0-9_-]{4,120}$`).test(value);
}

function validateOccurrence(item) {
  const errors = [];
  assert(item.schema_version === 'factory.v2', 'schema_version must be factory.v2', errors);
  assert(validCode('occ', item.occurrence_code), 'occurrence_code must be occ_*', errors);
  assert(validCode('card', item.card_code), 'card_code must be card_*', errors);
  assert(/^[0-9]+$/.test(String(item.workspace_id ?? '')), 'workspace_id must be numeric string', errors);
  assert(phases.has(item.current_phase), 'current_phase must be valid phase', errors);
  assert(['open', 'running', 'blocked', 'done', 'archived'].includes(item.status), 'status invalid', errors);
  assert(isNonEmptyString(item.source?.idempotency_key), 'source.idempotency_key required', errors);
  return errors;
}

function validateCard(item) {
  const errors = [];
  assert(item.schema_version === 'factory.v2', 'schema_version must be factory.v2', errors);
  assert(validCode('card', item.card_code), 'card_code must be card_*', errors);
  assert(validCode('occ', item.occurrence_code), 'occurrence_code must be occ_*', errors);
  assert(validCode('coord', item.coordinator_code), 'coordinator_code must be coord_*', errors);
  assert(validCode('nm', item.next_mission_id), 'next_mission_id must be nm_*', errors);
  assert(validCode('evt', item.last_event_id), 'last_event_id must be evt_*', errors);
  assert(phases.has(item.phase), 'phase must be valid phase', errors);
  assert(['ready', 'running', 'blocked', 'waiting_user', 'done', 'archived'].includes(item.status), 'status invalid', errors);
  return errors;
}

function validateEvent(item) {
  const errors = [];
  assert(item.schema_version === 'factory.v2', 'schema_version must be factory.v2', errors);
  assert(validCode('evt', item.event_id), 'event_id must be evt_*', errors);
  assert(validCode('occ', item.occurrence_code), 'occurrence_code must be occ_*', errors);
  assert(validCode('card', item.card_code), 'card_code must be card_*', errors);
  assert(validCode('exec', item.execution_code), 'execution_code must be exec_*', errors);
  assert(isNonEmptyString(item.event_type), 'event_type required', errors);
  assert(phases.has(item.phase), 'phase must be valid phase', errors);
  assert(['inbound', 'outbound', 'internal'].includes(item.direction), 'direction invalid', errors);
  assert(isNonEmptyString(item.idempotency_key), 'idempotency_key required', errors);
  assert(item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload), 'payload object required', errors);
  return errors;
}

const nextMissionChecks = [
  ['phase', (m) => phases.has(m.phase)],
  ['current_event', (m) => isNonEmptyString(m.current_event)],
  ['allowed_actor', (m) => isNonEmptyString(m.allowed_actor)],
  ['target_agent', (m) => isNonEmptyString(m.target_agent)],
  ['required_model', (m) => isNonEmptyString(m.required_model)],
  ['mission_type', (m) => isNonEmptyString(m.mission_type)],
  ['title', (m) => isNonEmptyString(m.title)],
  ['mission_instruction', (m) => isNonEmptyString(m.mission_instruction) && m.mission_instruction.length >= 40],
  ['next_goal', (m) => isNonEmptyString(m.next_goal)],
  ['next_event', (m) => isNonEmptyString(m.next_event)],
  ['idempotency', (m) => m.idempotency?.required === true && isNonEmptyString(m.idempotency?.key_rule)],
  ['workdir_requirements', (m) => m.workdir_requirements?.required === true && isNonEmptyString(m.workdir_requirements?.scope) && isNonEmptyArray(m.workdir_requirements?.must_have)],
  ['required_prompt_paths', (m) => isNonEmptyArray(m.required_prompt_paths)],
  ['input_artifacts', (m) => Array.isArray(m.input_artifacts)],
  ['required_outputs', (m) => isNonEmptyArray(m.required_outputs)],
  ['schemas_or_validators', (m) => isNonEmptyArray(m.schemas_or_validators)],
  ['preflight_checks', (m) => isNonEmptyArray(m.preflight_checks)],
  ['allowed_actions', (m) => isNonEmptyArray(m.allowed_actions)],
  ['forbidden_actions', (m) => isNonEmptyArray(m.forbidden_actions)],
  ['success_criteria', (m) => isNonEmptyArray(m.success_criteria)],
  ['blocking_conditions', (m) => isNonEmptyArray(m.blocking_conditions)],
  ['quality_score', (m) => m.quality_score?.simplicity_objectivity === 10 && m.quality_score?.max_score === 10 && Array.isArray(m.quality_score?.failed_checks) && m.quality_score.failed_checks.length === 0],
];

function validateNextMission(item) {
  const errors = [];
  assert(item.schema_version === 'factory.v2', 'schema_version must be factory.v2', errors);
  assert(validCode('nm', item.next_mission_id), 'next_mission_id must be nm_*', errors);
  for (const [name, fn] of nextMissionChecks) {
    assert(fn(item), `next mission 10/10 check failed: ${name}`, errors);
  }
  return errors;
}

function validateTransition(item) {
  const errors = [];
  assert(item.schema_version === 'factory.v2', 'schema_version must be factory.v2', errors);
  assert(validCode('tr', item.transition_id), 'transition_id must be tr_*', errors);
  assert(phases.has(item.from_phase), 'from_phase must be valid phase', errors);
  assert(phases.has(item.to_phase), 'to_phase must be valid phase', errors);
  assert(isNonEmptyString(item.event_type), 'event_type required', errors);
  assert(isNonEmptyString(item.next_mission_type), 'next_mission_type required', errors);
  assert(isNonEmptyString(item.allowed_actor), 'allowed_actor required', errors);
  assert(item.invalid_transition_policy === 'emit_blocked_event_no_fallback', 'invalid transitions must emit blocked event and never fallback', errors);
  return errors;
}

for (const schema of schemas) {
  if (!existsSync(resolve(root, schema))) {
    console.error(JSON.stringify({ ok: false, error: `missing schema ${schema}` }, null, 2));
    process.exit(1);
  }
  readJson(schema);
}

const validations = [
  ['occurrence', files.occurrence, validateOccurrence, true],
  ['card', files.card, validateCard, true],
  ['event', files.event, validateEvent, true],
  ['next_mission', files.nextMission, validateNextMission, true],
  ['state_transition', files.transition, validateTransition, true],
  ['invalid_next_mission_missing_workdir', files.badNextMission, validateNextMission, false],
  ['invalid_state_transition_fallback', files.badTransition, validateTransition, false],
];

const results = validations.map(([name, file, validator, shouldPass]) => {
  const value = readJson(file);
  const errors = validator(value);
  const passed = errors.length === 0;
  return {
    name,
    file,
    expected: shouldPass ? 'pass' : 'fail',
    passed,
    ok: shouldPass ? passed : !passed,
    errors,
  };
});

const nextMission = readJson(files.nextMission);
const nextMissionScore = nextMissionChecks.filter(([, fn]) => fn(nextMission)).length === nextMissionChecks.length ? 10 : 0;
const result = {
  ok: results.every((item) => item.ok) && nextMissionScore === 10,
  schema_count: schemas.length,
  valid_example_count: results.filter((item) => item.expected === 'pass').length,
  invalid_example_count: results.filter((item) => item.expected === 'fail').length,
  next_mission_score: nextMissionScore,
  results,
  rechecks: {
    valid_payloads_pass: results.filter((item) => item.expected === 'pass').every((item) => item.passed),
    invalid_payloads_fail: results.filter((item) => item.expected === 'fail').every((item) => !item.passed),
    no_transition_fallback: results.find((item) => item.name === 'invalid_state_transition_fallback')?.passed === false,
    next_mission_10: nextMissionScore === 10,
  },
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
