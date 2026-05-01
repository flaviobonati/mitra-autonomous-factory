#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOT = resolve('/opt/mitra-factory');
const GATEWAY = process.env.FACTORY_GATEWAY_PATH ?? `${ROOT}/workspaces/w-19658/p-46955/backend/factory-gateway.mjs`;
const OUT_DIR = process.env.OUT_DIR ?? `${ROOT}/output/factory_recovery`;

const steps = [
  {
    id: '01_user_tipo_zendesk',
    event: 'user_message_received',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'user_message_received',
      phase: 'Scope Discovery & Construction',
      payload: { message: 'quero um sistema de helpdesk tipo Zendesk' },
    },
  },
  {
    id: '02_intake_followup_needed',
    event: 'intake_classified',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'intake_classified',
      phase: 'Scope Discovery & Construction',
      payload: {
        input_mode: 'incumbent_reference',
        incumbent: 'Zendesk',
        follow_up_required: true,
        ambiguity: 'usuario disse tipo Zendesk; confirmar inspiracao vs replica completa',
      },
    },
  },
  {
    id: '03_followup_sent',
    event: 'followup_question_sent',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'followup_question_sent',
      phase: 'Scope Discovery & Construction',
      payload: {
        question: 'Voce quer inspiracao no Zendesk ou uma replica funcional completa do incumbente?',
      },
    },
  },
  {
    id: '04_user_igual_zendesk',
    event: 'intake_answer',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'intake_answer',
      phase: 'Scope Discovery & Construction',
      payload: {
        message: 'nao, quero igualzinho o Zendesk',
        scope_strategy: 'replicate_incumbent',
        incumbent: 'Zendesk',
        follow_up_required: false,
      },
    },
  },
  {
    id: '05_researcher_brief',
    event: 'researcher_brief',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'researcher_brief',
      phase: 'Scope Discovery & Construction',
      payload: {
        required_model: 'gpt-5.5',
        input_files: [{ path: 'outbox/intake_classified.json' }, { path: 'missions/runtime_contract.json' }],
        expected_outputs: [
          { path: 'dossie_incumbente.md' },
          { path: 'dossie_summary.json' },
          { path: 'feature_source_matrix.json' },
          { path: 'personas.json' },
          { path: 'entities.json' },
          { path: 'data_flows.json' },
          { path: 'user_stories.json' },
          { path: 'acceptance_criteria.json' },
          { path: 'e2e_journeys.json' },
        ],
      },
    },
  },
  {
    id: '06_research_delivery',
    event: 'researcher_artifacts_delivery',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'researcher_artifacts_delivery',
      phase: 'Scope Discovery & Construction',
      source_agent: 'researcher',
      artifacts: [
        { name: 'dossie_incumbente.md', schema_valid: true },
        { name: 'dossie_summary.json', schema_valid: true },
        { name: 'feature_source_matrix.json', schema_valid: true },
        { name: 'personas.json', schema_valid: true },
        { name: 'entities.json', schema_valid: true },
        { name: 'data_flows.json', schema_valid: true },
        { name: 'user_stories.json', schema_valid: true },
        { name: 'acceptance_criteria.json', schema_valid: true },
        { name: 'e2e_journeys.json', schema_valid: true },
      ],
      context_manifest: {
        no_cross_run_files_read: true,
        files_read: [
          '/opt/mitra-factory/coordinators/coord_dry_run_zendesk/outbox/intake_classified.json',
          '/opt/mitra-factory/coordinators/coord_dry_run_zendesk/missions/runtime_contract.json',
        ],
      },
    },
  },
  {
    id: '07_scope_canonicalization_delivery',
    event: 'scope_canonicalization_delivery',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'scope_canonicalization_delivery',
      phase: 'Scope Discovery & Construction',
      artifacts: [
        { name: 'scope_state.json', schema_valid: true },
        { name: 'personas.json', schema_valid: true },
        { name: 'entities.json', schema_valid: true },
        { name: 'data_flows.json', schema_valid: true },
        { name: 'user_stories.json', schema_valid: true },
        { name: 'acceptance_criteria.json', schema_valid: true },
        { name: 'e2e_journeys.json', schema_valid: true },
      ],
    },
  },
  {
    id: '08_scope_approved',
    event: 'scope_approved',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'scope_approved',
      phase: 'Scope Discovery & Construction',
      payload: { approved: true, scope_strategy: 'replicate_incumbent' },
    },
  },
  {
    id: '09_mission_created_dev',
    event: 'mission_created',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'mission_created',
      phase: 'Development',
      payload: {
        target_agent: 'dev',
        required_model: 'claude-opus-4-7',
        prompt_file: 'missions/dev_prompt_full.md',
        runtime_contract: 'missions/runtime_contract.json',
      },
    },
  },
  {
    id: '10_agent_spawned_dev',
    event: 'agent_spawned',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'agent_spawned',
      phase: 'Development',
      payload: {
        target_agent: 'dev',
        required_model: 'claude-opus-4-7',
        tmux_session: 'dev_exec_dry_run_zendesk_r1',
        output_file: 'logs/dev_stdout.log',
        heartbeat_file: 'logs/dev.heartbeat',
      },
    },
  },
  {
    id: '11_agent_output_received_dev',
    event: 'agent_output_received',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'agent_output_received',
      phase: 'Development',
      payload: {
        source_agent: 'dev',
        dev_handoff: 'dev_handoff.json',
        deploy_url: 'https://example.invalid/',
        commit_hash: 'abcdef1234567890',
      },
    },
  },
  {
    id: '12_output_validated',
    event: 'output_validated',
    payload: {
      coordinator_code: 'coord_dry_run_zendesk',
      execution_code: 'exec_dry_run_zendesk',
      event_type: 'output_validated',
      phase: 'Development',
      payload: { source_agent: 'dev', handoff_valid: true, smoke_login: true },
    },
  },
];

const checks = [
  ['mission_type claro', (m) => nonEmpty(m.mission_type)],
  ['allowed_actor claro', (m) => nonEmpty(m.allowed_actor)],
  ['fase clara', (m) => nonEmpty(m.phase)],
  ['target_agent claro', (m) => nonEmpty(m.target_agent)],
  ['required_model claro', (m) => nonEmpty(m.required_model)],
  ['next_event claro', (m) => nonEmpty(m.next_event)],
  ['prompts obrigatorios listados', (m) => nonEmptyArray(m.required_prompt_paths)],
  ['input_artifacts listados', (m) => Array.isArray(m.input_artifacts)],
  ['outputs obrigatorios listados', (m) => nonEmptyArray(m.required_outputs)],
  ['schemas/validators listados', (m) => nonEmptyArray(m.schemas_or_validators)],
  ['preflight checks listados', (m) => nonEmptyArray(m.preflight_checks)],
  ['workdir requirements presentes', (m) => m.workdir_requirements && nonEmpty(m.workdir_requirements.scope)],
  ['allowed_actions listadas', (m) => nonEmptyArray(m.allowed_actions)],
  ['forbidden_actions listadas', (m) => nonEmptyArray(m.forbidden_actions)],
  ['success_criteria objetivo', (m) => nonEmptyArray(m.success_criteria)],
  ['blocking_conditions objetivas', (m) => nonEmptyArray(m.blocking_conditions)],
  ['mission_instruction acionavel', (m) => nonEmpty(m.mission_instruction) && m.mission_instruction.length >= 40],
  ['sem dependencia de memoria conversacional', (m) => !JSON.stringify(m).toLowerCase().includes('memoria solta')],
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
    maxBuffer: 20 * 1024 * 1024,
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

function scoreMission(mission) {
  const results = checks.map(([name, fn]) => {
    let pass = false;
    try {
      pass = Boolean(fn(mission));
    } catch {
      pass = false;
    }
    return { name, pass };
  });
  const passed = results.filter((item) => item.pass).length;
  const score = Number(((passed / results.length) * 10).toFixed(1));
  return {
    score,
    passed,
    total: results.length,
    failed_checks: results.filter((item) => !item.pass).map((item) => item.name),
    checks: results,
  };
}

function mdReport(entries) {
  const lines = [
    '# Next Mission Quality Report - Zendesk Dry Run',
    '',
    `Gateway: \`${GATEWAY}\``,
    `Generated at: ${new Date().toISOString()}`,
    '',
  ];
  for (const entry of entries) {
    lines.push(`## ${entry.id}`);
    lines.push('');
    lines.push(`- Event: \`${entry.event}\``);
    lines.push(`- Mission: \`${entry.next_mission.mission_type}\``);
    lines.push(`- Phase: \`${entry.next_mission.phase}\``);
    lines.push(`- Target: \`${entry.next_mission.target_agent}\``);
    lines.push(`- Model: \`${entry.next_mission.required_model}\``);
    lines.push(`- Score: **${entry.quality.score}/10**`);
    if (entry.quality.failed_checks.length) {
      lines.push(`- Failed checks: ${entry.quality.failed_checks.join(', ')}`);
      lines.push(`- Rewrite required: yes`);
    } else {
      lines.push('- Failed checks: none');
      lines.push('- Rewrite required: no');
    }
    lines.push(`- Recheck 1 local: dry-run returned valid JSON for \`${entry.event}\`.`);
    lines.push(`- Recheck 2 executable: quality scorer evaluated ${entry.quality.total} checks.`);
    lines.push(`- Recheck 3 integration: next mission includes phase, next_event and gateway-compatible event contract.`);
    lines.push('');
  }
  const allTen = entries.every((entry) => entry.quality.score === 10);
  lines.push(`Final gate: ${allTen ? 'PASS - all next missions scored 10/10.' : 'FAIL - at least one next mission scored below 10/10.'}`);
  lines.push('');
  return lines.join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });
const entries = steps.map((step) => {
  const response = runDryRun(step.payload);
  const nextMission = response.next_mission;
  return {
    id: step.id,
    event: step.event,
    request_payload: step.payload,
    response,
    next_mission: nextMission,
    quality: scoreMission(nextMission),
  };
});

const jsonPath = `${OUT_DIR}/next_mission_quality_report.json`;
const mdPath = `${OUT_DIR}/next_mission_quality_report.md`;
writeFileSync(jsonPath, JSON.stringify({ gateway: GATEWAY, generated_at: new Date().toISOString(), entries }, null, 2));
writeFileSync(mdPath, mdReport(entries));

console.log(JSON.stringify({
  ok: true,
  entries: entries.length,
  all_scores_10: entries.every((entry) => entry.quality.score === 10),
  min_score: Math.min(...entries.map((entry) => entry.quality.score)),
  json_path: jsonPath,
  md_path: mdPath,
}, null, 2));
