#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('/opt/mitra-factory');
const GATEWAY = process.env.FACTORY_GATEWAY_PATH ?? `${ROOT}/workspaces/w-19658/p-46955/backend/factory-gateway.mjs`;
const BACKEND_SUITE = process.env.FACTORY_NEXT_MISSION_SUITE ?? `${ROOT}/workspaces/w-19658/p-46955/backend/test-next-missions.mjs`;
const OUT_DIR = process.env.OUT_DIR ?? `${ROOT}/output/factory_recovery`;
const COORDINATOR_CODE = 'coord_cmms_contract_regression';
const EXECUTION_CODE = 'exec_cmms_contract_regression';

const qaStoryBatchPlan = {
  fixed_batch_size: 5,
  batches: [
    {
      batch: '01',
      story_index_start: 1,
      story_index_end: 5,
      story_ids: ['US-ASSET-001', 'US-WO-001', 'US-QR-001', 'US-OFFLINE-001', 'US-PM-001'],
      journey_ids: ['E2E-ASSET-001', 'E2E-WO-001', 'E2E-QR-001', 'E2E-OFFLINE-001', 'E2E-PM-001'],
      acceptance_criteria_ids: ['AC-ASSET-001', 'AC-WO-001', 'AC-QR-001', 'AC-OFFLINE-001', 'AC-PM-001'],
    },
    {
      batch: '02',
      story_index_start: 6,
      story_index_end: 10,
      story_ids: ['US-METER-001', 'US-ALERT-001', 'US-TECH-001', 'US-INVENTORY-001', 'US-DASH-001'],
      journey_ids: ['E2E-METER-001', 'E2E-ALERT-001', 'E2E-TECH-001', 'E2E-INVENTORY-001', 'E2E-DASH-001'],
      acceptance_criteria_ids: ['AC-METER-001', 'AC-ALERT-001', 'AC-TECH-001', 'AC-INVENTORY-001', 'AC-DASH-001'],
    },
  ],
};

const horizontalPassReport = {
  scores: {
    design: 10,
    ux: 10,
    features: 10,
    data_flow: 10,
  },
  qa_core_checklist_execution: [
    {
      check_id: 'DESIGN-09',
      mandatory: true,
      status: 'PASS',
      evidence: 'Playwright desktop and mobile evidence confirms the Mitra brand identity appears with the official asset hash.',
    },
    {
      check_id: 'FEATURE-MUST-01',
      mandatory: true,
      status: 'PASS',
      evidence: 'Work order creation, assignment and status transition were executed through the UI and persisted.',
    },
    {
      check_id: 'DATAFLOW-01',
      mandatory: true,
      status: 'PASS',
      evidence: 'Database before/after reads confirmed the work order record and timeline event persisted correctly.',
    },
  ],
  bug_retest_matrix: [
    {
      bug_id: 'QAH-005',
      status: 'PASS',
      origin_failed_checks: ['DESIGN-09', 'DESIGN-11', 'DESIGN-13', 'DESIGN-15', 'DESIGN-24'],
      evidence_by_check: {
        'DESIGN-09': { status: 'PASS', actual: 'Official logo asset hash and rendered DOM image were verified in desktop and mobile.' },
        'DESIGN-11': { status: 'PASS', actual: 'Favicon and app shell brand treatment were verified with screenshot evidence.' },
        'DESIGN-13': { status: 'PASS', actual: 'Typography, accents and Portuguese copy were checked against the approved brand surface.' },
        'DESIGN-15': { status: 'PASS', actual: 'Primary navigation and controls show the Mitra name consistently without placeholder text.' },
        'DESIGN-24': { status: 'PASS', actual: 'Responsive mobile viewport kept brand assets visible and non-overlapping.' },
      },
    },
  ],
};

function basePayload(eventType, phase, payload = {}, extra = {}) {
  return {
    coordinator_code: COORDINATOR_CODE,
    execution_code: EXECUTION_CODE,
    event_type: eventType,
    phase,
    payload,
    ...extra,
  };
}

const cmmsSteps = [
  {
    id: '01_cmms_user_message_intake',
    payload: basePayload('user_message_received', 'Scope Discovery & Construction', {
      message: 'quero um CMMS tipo Tractian para manutencao industrial',
    }),
    expected: ['intake', 'Scope Discovery & Construction', 'coordinator', 'intake_classified'],
  },
  {
    id: '02_cmms_intake_answer_research',
    payload: basePayload('intake_answer', 'Scope Discovery & Construction', {
      message: 'quero replicar o Tractian com defaults da fabrica',
      scope_strategy: 'replicate_incumbent',
      incumbent: 'Tractian',
      follow_up_required: false,
    }),
    expected: ['research', 'Scope Discovery & Construction', 'researcher', 'researcher_brief'],
  },
  {
    id: '03_cmms_researcher_brief_running',
    payload: basePayload('researcher_brief', 'Scope Discovery & Construction', {
      target_agent: 'researcher',
      required_model: 'gpt-5.5',
      incumbent: 'Tractian',
    }),
    expected: ['research_running', 'Scope Discovery & Construction', 'researcher', 'researcher_artifacts_delivery'],
  },
  {
    id: '04_cmms_research_delivery_scope_canonicalization',
    payload: basePayload('researcher_artifacts_delivery', 'Scope Discovery & Construction', {
      source_agent: 'researcher',
      artifacts: ['dossie_incumbente.md', 'feature_source_matrix.json', 'user_stories.json', 'e2e_journeys.json'],
    }),
    expected: ['scope_canonicalization', 'Scope Discovery & Construction', 'coordinator', 'scope_canonicalization_delivery'],
  },
  {
    id: '05_cmms_scope_delivery_approval_request',
    payload: basePayload('scope_canonicalization_delivery', 'Scope Discovery & Construction', {
      artifacts: ['scope_state.json', 'personas.json', 'entities.json', 'user_stories.json'],
    }),
    expected: ['scope_approval_request', 'Scope Discovery & Construction', 'coordinator', 'scope_approved, scope_change_requested ou scope_rejected'],
  },
  {
    id: '06_cmms_scope_approved_dev_preparation',
    payload: basePayload('scope_approved', 'Scope Discovery & Construction', {
      approved: true,
      scope_strategy: 'replicate_incumbent',
      incumbent: 'Tractian',
    }),
    expected: ['dev_preparation', 'Development', 'coordinator', 'mission_created'],
  },
  {
    id: '07_cmms_mission_created_dev_spawn',
    payload: basePayload('mission_created', 'Development', {
      target_agent: 'dev',
      required_model: 'claude-opus-4-7',
      prompt_file: 'missions/dev_prompt_full.md',
    }),
    expected: ['dev_spawn', 'Development', 'dev', 'agent_spawned'],
  },
  {
    id: '08_cmms_dev_spawned_running',
    payload: basePayload('agent_spawned', 'Development', {
      target_agent: 'dev',
      required_model: 'claude-opus-4-7',
      tmux_session: 'dev_exec_cmms_contract_regression_r1',
    }),
    expected: ['dev_running', 'Development', 'dev', 'agent_output_received'],
  },
  {
    id: '09_cmms_dev_output_validation',
    payload: basePayload('agent_output_received', 'Development', {
      source_agent: 'dev',
      deploy_url: 'https://example.invalid/cmms',
      dev_handoff: 'dev_handoff.json',
    }),
    expected: ['dev_output_validation', 'Development', 'coordinator', 'output_validated'],
  },
  {
    id: '10_cmms_output_validated_qa_planner',
    payload: basePayload('output_validated', 'Development', {
      source_agent: 'dev',
      handoff_valid: true,
    }),
    expected: ['qa_horizontal_planner_spawn', 'QA Horizontal', 'qa_planner', 'agent_spawned'],
  },
  {
    id: '11_cmms_qa_planner_running',
    payload: basePayload('agent_spawned', 'QA Horizontal', {
      target_agent: 'qa_planner',
      required_model: 'gpt-5.5',
    }),
    expected: ['qa_horizontal_planner_running', 'QA Horizontal', 'qa_planner', 'agent_output_received'],
  },
  {
    id: '12_cmms_qa_planner_output_executor_spawn',
    payload: basePayload('agent_output_received', 'QA Horizontal', {
      source_agent: 'qa_planner',
      plan_file: 'qa_horizontal_plan.json',
    }),
    expected: ['qa_horizontal_executor_spawn', 'QA Horizontal', 'qa_horizontal', 'agent_spawned'],
  },
  {
    id: '13_cmms_qa_horizontal_running',
    payload: basePayload('agent_spawned', 'QA Horizontal', {
      target_agent: 'qa_horizontal',
      required_model: 'gpt-5.5',
    }),
    expected: ['qa_horizontal_running', 'QA Horizontal', 'qa_horizontal', 'qa_failed ou qa_approved'],
  },
  {
    id: '14_cmms_horizontal_failed_fix_spawn',
    payload: basePayload('qa_failed', 'QA Horizontal', {
      source_agent: 'qa_horizontal',
      bugs_found: ['BUG-QH-001'],
    }),
    expected: ['fix_horizontal', 'Fix / Retest Horizontal', 'dev', 'agent_spawned'],
  },
  {
    id: '15_cmms_horizontal_fix_dev_running',
    payload: basePayload('agent_spawned', 'Fix / Retest Horizontal', {
      target_agent: 'dev',
      mission_type: 'fix_horizontal',
      source_qa_failed_event: `${EXECUTION_CODE}:qa_failed:qa_horizontal_r1`,
    }),
    expected: ['dev_fix_running', 'Fix / Retest Horizontal', 'dev', 'agent_output_received'],
  },
  {
    id: '16_cmms_horizontal_fix_output_retest',
    payload: basePayload('agent_output_received', 'Fix / Retest Horizontal', {
      source_agent: 'dev',
      fix_handoff: 'dev_fix_horizontal_handoff.json',
    }),
    expected: ['qa_horizontal_retest', 'Fix / Retest Horizontal', 'qa_horizontal', 'agent_spawned'],
  },
  {
    id: '17_cmms_horizontal_retest_running',
    payload: basePayload('agent_spawned', 'Fix / Retest Horizontal', {
      target_agent: 'qa_horizontal_retest',
      required_model: 'gpt-5.5',
    }),
    expected: ['qa_horizontal_retest_running', 'Fix / Retest Horizontal', 'qa_horizontal', 'qa_failed ou qa_approved'],
  },
  {
    id: '18_cmms_horizontal_approved_story_spawn',
    payload: basePayload('qa_approved', 'Fix / Retest Horizontal', {
      source_agent: 'qa_horizontal',
      report: horizontalPassReport,
      scores: { functional: 10, visual: 10, integration: 10, regression: 10 },
    }),
    expected: ['qa_story_spawn', 'QA Story Validation', 'qa_story', 'agent_spawned'],
  },
  {
    id: '19_cmms_qa_story_running_batch_01',
    payload: basePayload('agent_spawned', 'QA Story Validation', {
      target_agent: 'qa_story',
      batch: '01',
      qa_story_batch_plan: qaStoryBatchPlan,
      expected_outputs: [
        'qa_story_results_batch_01.json',
        'qa_story_results_batch_01.md',
        'story_gap_list.md',
        'story_parity_matrix_batch_01.json',
        'evidence/db_verification_batch_01.json',
        'evidence_manifest.json',
      ],
    }),
    expected: ['qa_story_running', 'QA Story Validation', 'qa_story', 'agent_output_received'],
  },
  {
    id: '20_cmms_qa_story_output_review',
    payload: basePayload('agent_output_received', 'QA Story Validation', {
      source_agent: 'qa_story',
      batch: '01',
      qa_story_batch_plan: qaStoryBatchPlan,
    }),
    expected: ['qa_story_batch_review', 'QA Story Validation', 'coordinator', 'qa_approved'],
  },
  {
    id: '21_cmms_qa_story_batch_next',
    payload: basePayload('qa_approved', 'QA Story Validation', {
      source_agent: 'qa_story',
      batch: '01',
      qa_story_batch_plan: qaStoryBatchPlan,
    }),
    expected: ['qa_story_next_batch', 'QA Story Validation', 'qa_story', 'agent_spawned'],
  },
  {
    id: '22_cmms_qa_story_failed_fix_story',
    payload: basePayload('qa_failed', 'QA Story Validation', {
      source_agent: 'qa_story',
      batch: '02',
      story_gap_list: 'story_gap_list.md',
      gap_ids: ['GAP-B02-001', 'GAP-B02-002'],
    }),
    expected: ['fix_story', 'Fix / Retest Story', 'dev', 'agent_spawned'],
  },
  {
    id: '23_cmms_story_fix_dev_running',
    payload: basePayload('agent_spawned', 'Fix / Retest Story', {
      target_agent: 'dev',
      mission_type: 'fix_story',
      batch: '02',
      source_qa_failed_event: `${EXECUTION_CODE}:qa_failed:qa_story_batch_02`,
    }),
    expected: ['dev_fix_story_running', 'Fix / Retest Story', 'dev', 'agent_output_received'],
  },
  {
    id: '24_cmms_story_fix_output_retest',
    payload: basePayload('agent_output_received', 'Fix / Retest Story', {
      source_agent: 'dev',
      batch: '02',
      fix_handoff: 'dev_fix_story_handoff_batch_02.json',
    }),
    expected: ['qa_story_retest', 'Fix / Retest Story', 'qa_story', 'agent_spawned'],
  },
  {
    id: '25_cmms_story_retest_running',
    payload: basePayload('agent_spawned', 'Fix / Retest Story', {
      target_agent: 'qa_story_retest',
      batch: '02',
      gap_ids_to_verify: ['GAP-B02-001', 'GAP-B02-002'],
    }),
    expected: ['qa_story_retest_running', 'Fix / Retest Story', 'qa_story', 'agent_output_received'],
  },
  {
    id: '26_cmms_story_retest_output_review',
    payload: basePayload('agent_output_received', 'Fix / Retest Story', {
      source_agent: 'qa_story',
      batch: '02',
      retest_report: 'qa_story_retest_batch_02.json',
    }),
    expected: ['qa_story_retest_review', 'Fix / Retest Story', 'coordinator', 'qa_failed ou qa_approved'],
  },
  {
    id: '27_cmms_story_retest_approved_consolidation',
    payload: basePayload('qa_approved', 'Fix / Retest Story', {
      source_agent: 'qa_story',
      batch: '02',
      qa_story_batch_plan: qaStoryBatchPlan,
    }),
    expected: ['qa_consolidation', 'QA Consolidation', 'coordinator', 'release_candidate'],
  },
  {
    id: '28_cmms_release_candidate_review',
    payload: basePayload('release_candidate', 'QA Consolidation', {
      release_candidate: 'release_candidate.json',
      all_required_batches_complete: true,
    }),
    expected: ['release_review', 'Release Review', 'coordinator', 'production_approved ou release_rejected'],
  },
  {
    id: '29_cmms_production_approved_monitoring',
    payload: basePayload('production_approved', 'Release Review', {
      approved: true,
      deploy_url: 'https://example.invalid/cmms',
    }),
    expected: ['production_monitoring', 'Production', 'coordinator', 'production_health_report'],
  },
  {
    id: '30_cmms_blocked_story_fix_contract_repair',
    payload: basePayload('blocked_resolved', 'Fix / Retest Story', {
      source_agent: 'coordinator',
      recovery_reason: 'dev_fix_story_retest_batch_02_round_03 output_contract invalid; route to contract_repair',
      resume_mission_type: 'dev_fix_story_contract_repair',
      resume_target_agent: 'dev',
      resume_next_event: 'agent_spawned',
      next_expected_action: 'agent_spawned_contract_repair',
    }),
    expected: ['dev_fix_story_contract_repair', 'Fix / Retest Story', 'dev', 'agent_spawned'],
  },
  {
    id: '31_cmms_blocked_story_route_repair',
    payload: basePayload('blocked_resolved', 'Fix / Retest Story', {
      recovery_reason: 'qa_story_retest_batch_02 agent_spawned misrouted_to_intake at exchange 720',
      source_blocked_event: `${EXECUTION_CODE}:blocked:qa_story_retest_batch_02_misrouted_to_intake`,
      source_agent_spawned_idempotency_key: `${EXECUTION_CODE}:agent_spawned:qa_story_retest_batch_02`,
      resume_next_event: 'agent_spawned',
      resume_mission_type: 'qa_story_retest',
      resume_target_agent: 'qa_story',
      corrects_exchange_id: 720,
      next_expected_action: 'agent_spawned_route_repair',
    }),
    expected: ['qa_story_retest_route_repair', 'Fix / Retest Story', 'qa_story', 'agent_spawned'],
  },
  {
    id: '32_cmms_blocked_resume_story_output_registration',
    payload: basePayload('blocked_resolved', 'Fix / Retest Horizontal', {
      source_agent: 'dev',
      recovery_reason: 'deploy propagated and output_contract completed for dev_fix_story_r1',
      logical_phase: 'Fix / Retest Story',
      previous_agent_spawned_idempotency_key: `${EXECUTION_CODE}:agent_spawned:dev_fix_story_r1_batch_01`,
      resume_next_event: 'agent_output_received',
    }),
    expected: ['dev_fix_story_output_registration', 'Fix / Retest Story', 'coordinator', 'agent_output_received'],
  },
];

const expectedKeys = ['mission_type', 'phase', 'target_agent', 'next_event'];

const baseQualityChecks = [
  ['mission_type explicit', (m) => nonEmpty(m.mission_type)],
  ['phase explicit', (m) => nonEmpty(m.phase)],
  ['target_agent explicit', (m) => nonEmpty(m.target_agent)],
  ['allowed_actor explicit', (m) => nonEmpty(m.allowed_actor)],
  ['required_model explicit', (m) => nonEmpty(m.required_model)],
  ['next_event explicit', (m) => nonEmpty(m.next_event)],
  ['title actionable', (m) => nonEmpty(m.title) && m.title.length >= 12],
  ['mission_instruction actionable', (m) => nonEmpty(m.mission_instruction) && m.mission_instruction.length >= 40],
  ['required prompts listed', (m) => nonEmptyArray(m.required_prompt_paths)],
  ['input artifacts listed', (m) => Array.isArray(m.input_artifacts)],
  ['required outputs listed', (m) => nonEmptyArray(m.required_outputs)],
  ['schemas or validators listed', (m) => nonEmptyArray(m.schemas_or_validators)],
  ['preflight checks listed', (m) => Array.isArray(m.preflight_checks) && m.preflight_checks.length >= 5],
  ['allowed actions listed', (m) => nonEmptyArray(m.allowed_actions)],
  ['forbidden actions listed', (m) => nonEmptyArray(m.forbidden_actions)],
  ['success criteria listed', (m) => Array.isArray(m.success_criteria) && m.success_criteria.length >= 3],
  ['blocking conditions listed', (m) => nonEmptyArray(m.blocking_conditions)],
  ['workdir scope explicit', (m) => m.workdir_requirements && nonEmpty(m.workdir_requirements.scope)],
  ['append-only registration required', (m) => (m.allowed_actions || []).some((item) => /append-only/.test(String(item)) || /factory-gateway/.test(String(item)) || /af_exchange_event/.test(String(item)))],
  ['no inferred phase allowed', (m) => (m.forbidden_actions || []).some((item) => /inferir proxima fase/.test(String(item)))],
];

const spawnMissionTypes = new Set([
  'dev_spawn',
  'fix_horizontal',
  'fix_story',
  'qa_horizontal_planner_spawn',
  'qa_horizontal_executor_spawn',
  'qa_horizontal_retest',
  'qa_story_spawn',
  'qa_story_next_batch',
  'qa_story_retest',
  'qa_story_retest_route_repair',
  'dev_fix_story_contract_repair',
]);

const spawnQualityChecks = [
  ['spawn_contract present', (m) => m.spawn_contract && typeof m.spawn_contract === 'object'],
  ['spawn target present', (m) => nonEmpty(m.spawn_contract?.target_agent)],
  ['spawn model present', (m) => nonEmpty(m.spawn_contract?.required_model)],
  ['spawn runner present', (m) => nonEmpty(m.spawn_contract?.runner) || nonEmpty(m.spawn_contract?.command_template) || nonEmpty(m.spawn_contract?.command)],
  ['spawn tmux present', (m) => nonEmpty(m.spawn_contract?.tmux_session)],
  ['spawn prompt present', (m) => nonEmpty(m.spawn_contract?.prompt_file)],
  ['spawn output present', (m) => nonEmpty(m.spawn_contract?.output_file)],
  ['spawn heartbeat present', (m) => nonEmpty(m.spawn_contract?.heartbeat_file)],
];

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every((item) => String(item ?? '').trim().length > 0);
}

function runDryRun(payload) {
  const result = spawnSync(process.execPath, [GATEWAY, 'dry-run', JSON.stringify(payload)], {
    cwd: `${ROOT}/workspaces/w-19658/p-46955/backend`,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    env: {
      ...process.env,
      FACTORY_REFRESH_LIVE_STATE: '0',
      FACTORY_AUTO_DEPLOY_LIVE_STATE: '0',
    },
  });

  if (result.status !== 0) {
    throw new Error(`dry-run failed for ${payload.event_type}: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function runBackendSuite() {
  const result = spawnSync(process.execPath, [BACKEND_SUITE], {
    cwd: `${ROOT}/workspaces/w-19658/p-46955/backend`,
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
    env: {
      ...process.env,
      FACTORY_REFRESH_LIVE_STATE: '0',
      FACTORY_AUTO_DEPLOY_LIVE_STATE: '0',
    },
  });

  if (result.status !== 0) {
    return {
      ok: false,
      status: result.status,
      stderr: String(result.stderr || '').slice(0, 4000),
      stdout: String(result.stdout || '').slice(0, 4000),
    };
  }

  const parsed = JSON.parse(result.stdout);
  const failures = [];
  for (const entry of parsed.results || []) {
    if (entry.simplicity_objectivity_score !== 10) {
      failures.push({ name: entry.name, score: entry.simplicity_objectivity_score, key: 'simplicity_objectivity_score' });
    }
    if (entry.qa_spawn_contract_score !== 'NA' && entry.qa_spawn_contract_score !== 10) {
      failures.push({ name: entry.name, score: entry.qa_spawn_contract_score, key: 'qa_spawn_contract_score' });
    }
    if (entry.qa_story_batching_mobile_score !== 'NA' && entry.qa_story_batching_mobile_score !== 10) {
      failures.push({ name: entry.name, score: entry.qa_story_batching_mobile_score, key: 'qa_story_batching_mobile_score' });
    }
  }

  return {
    ok: parsed.ok === true && failures.length === 0,
    cases: parsed.cases,
    covered_mission_types: parsed.coveredMissionTypes,
    failures,
  };
}

function scoreMission(mission, expected) {
  const failed = [];
  const expectedObject = Object.fromEntries(expectedKeys.map((key, index) => [key, expected[index]]));

  for (const key of expectedKeys) {
    if (mission[key] !== expectedObject[key]) {
      failed.push(`expected ${key}=${expectedObject[key]} actual=${mission[key]}`);
    }
  }

  for (const [name, check] of baseQualityChecks) {
    let pass = false;
    try {
      pass = Boolean(check(mission));
    } catch {
      pass = false;
    }
    if (!pass) failed.push(name);
  }

  if (spawnMissionTypes.has(mission.mission_type)) {
    for (const [name, check] of spawnQualityChecks) {
      let pass = false;
      try {
        pass = Boolean(check(mission));
      } catch {
        pass = false;
      }
      if (!pass) failed.push(name);
    }
  }

  return {
    score: failed.length === 0 ? 10 : Math.max(0, 10 - failed.length),
    failed_checks: failed,
    expected: expectedObject,
  };
}

function mdReport(report) {
  const lines = [
    '# CMMS Next Mission Regression',
    '',
    `Generated at: ${report.generated_at}`,
    `Gateway: \`${report.gateway}\``,
    `Backend suite: \`${report.backend_suite.path}\``,
    `Coordinator role used: \`${COORDINATOR_CODE}\``,
    `Execution role used: \`${EXECUTION_CODE}\``,
    '',
    'This is a contract dry-run. It does not restart the old CMMS runtime.',
    '',
    '## Backend All-Case Suite',
    '',
    `- OK: ${report.backend_suite.ok}`,
    `- Cases: ${report.backend_suite.cases ?? 'unknown'}`,
    `- Failures: ${report.backend_suite.failures.length}`,
    '',
    '## CMMS Coordinator Dry-Run Sequence',
    '',
  ];

  for (const entry of report.entries) {
    lines.push(`### ${entry.id}`);
    lines.push('');
    lines.push(`- Event: \`${entry.event_type}\``);
    lines.push(`- Mission: \`${entry.next_mission.mission_type}\``);
    lines.push(`- Phase: \`${entry.next_mission.phase}\``);
    lines.push(`- Target: \`${entry.next_mission.target_agent}\``);
    lines.push(`- Next event: \`${entry.next_mission.next_event}\``);
    lines.push(`- Simplicity/objectivity score: **${entry.quality.score}/10**`);
    lines.push(`- Failed checks: ${entry.quality.failed_checks.length ? entry.quality.failed_checks.join('; ') : 'none'}`);
    lines.push(`- Recheck 1 local dry-run: PASS`);
    lines.push(`- Recheck 2 expected contract: ${entry.quality.failed_checks.length ? 'FAIL' : 'PASS'}`);
    lines.push(`- Recheck 3 Central System compatibility: ${entry.response.ok === true && entry.response.dry_run === true ? 'PASS' : 'FAIL'}`);
    lines.push('');
  }

  lines.push(`Final gate: ${report.ok ? 'PASS - every next mission scored 10/10.' : 'FAIL - at least one next mission needs rewrite.'}`);
  lines.push('');
  return lines.join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });

const entries = cmmsSteps.map((step) => {
  const response = runDryRun(step.payload);
  const nextMission = response.next_mission;
  return {
    id: step.id,
    event_type: step.payload.event_type,
    request_payload: step.payload,
    response,
    next_mission: nextMission,
    quality: scoreMission(nextMission, step.expected),
  };
});

const backendSuite = runBackendSuite();
const failures = entries
  .filter((entry) => entry.quality.score !== 10)
  .map((entry) => ({ id: entry.id, failed_checks: entry.quality.failed_checks }));

if (!backendSuite.ok) {
  failures.push({ id: 'backend_all_case_suite', failed_checks: backendSuite.failures.length ? backendSuite.failures : [backendSuite.stderr || backendSuite.stdout || 'backend suite failed'] });
}

const report = {
  ok: failures.length === 0,
  generated_at: new Date().toISOString(),
  gateway: GATEWAY,
  coordinator_code: COORDINATOR_CODE,
  execution_code: EXECUTION_CODE,
  backend_suite: {
    path: BACKEND_SUITE,
    ...backendSuite,
  },
  entries,
  failures,
  summary: {
    dry_run_entries: entries.length,
    dry_run_all_scores_10: entries.every((entry) => entry.quality.score === 10),
    dry_run_min_score: Math.min(...entries.map((entry) => entry.quality.score)),
    backend_suite_ok: backendSuite.ok,
    backend_suite_cases: backendSuite.cases,
  },
};

const jsonPath = `${OUT_DIR}/cmms_next_mission_regression.json`;
const mdPath = `${OUT_DIR}/cmms_next_mission_regression.md`;
writeFileSync(jsonPath, JSON.stringify(report, null, 2));
writeFileSync(mdPath, mdReport(report));

console.log(JSON.stringify({
  ok: report.ok,
  dry_run_entries: report.summary.dry_run_entries,
  dry_run_all_scores_10: report.summary.dry_run_all_scores_10,
  dry_run_min_score: report.summary.dry_run_min_score,
  backend_suite_ok: report.summary.backend_suite_ok,
  backend_suite_cases: report.summary.backend_suite_cases,
  json_path: jsonPath,
  md_path: mdPath,
  failures: report.failures,
}, null, 2));

if (!report.ok) {
  process.exit(1);
}
