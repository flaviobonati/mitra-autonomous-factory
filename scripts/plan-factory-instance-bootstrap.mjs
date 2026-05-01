#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestPath = process.argv[2];
const outputPath = process.argv[3] ?? '/opt/mitra-factory/output/factory_recovery/factory_instance_bootstrap_plan.json';

if (!manifestPath) {
  console.error('Usage: plan-factory-instance-bootstrap.mjs <factory_instance_manifest.json> [output.json]');
  process.exit(2);
}

const validator = resolve(dirname(new URL(import.meta.url).pathname), 'validate-factory-instance-manifest.mjs');
const validation = spawnSync('node', [validator, manifestPath], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stderr);
  process.stderr.write(validation.stdout);
  process.exit(validation.status ?? 1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const validationJson = JSON.parse(validation.stdout);
const root = manifest.root_dir;
const productName = `${manifest.product_project_defaults.name_prefix} <cliente-ou-produto>`;
const productWorkdir = `${root}/workspaces/w-${manifest.product_project_defaults.workspace_id}/p-<project_id_criado>`;
const coordinatorCode = `coord_<tema>_<timestamp>`;
const executionCode = `exec_<tema>_<timestamp>`;
const coordinatorDir = `${manifest.coordinator.dir_root}/${coordinatorCode}`;

const plan = {
  ok: true,
  mode: 'dry_run_plan_only',
  manifest_path: manifestPath,
  validation: validationJson,
  instance: {
    instance_code: manifest.instance_code,
    workspace_id: manifest.mitra.workspace_id,
    factory_control_project_id: manifest.factory_control_project.project_id,
    write_surface: `mitra_server_function:${manifest.factory_control_project.server_function.name}`
  },
  ordered_steps: [
    {
      id: '01_validate_instance',
      actor: 'meta_agent',
      mutates_run_state: false,
      command: `node ${validator} ${manifestPath}`,
      evidence: ['validation JSON ok=true', 'tmux available', 'control project/gateway/SF files exist']
    },
    {
      id: '02_create_product_project',
      actor: 'meta_agent',
      mutates_run_state: false,
      command: `MITRA_WORKSPACE_ID=${manifest.product_project_defaults.workspace_id} ${manifest.mitra.token_env}=<secret> node ${root}/mitra-autonomous-factory/scripts/create-product-project-for-coordinator.mjs --workspace-id ${manifest.product_project_defaults.workspace_id} --name "${productName}"`,
      outputs: ['product_project_id', 'product_project_dir', 'frontend/', 'backend/', '.git/', '.env.local', 'AGENTS.md', 'system_prompt.md'],
      gate: 'project_id must not equal factory_control_project_id'
    },
    {
      id: '03_prepare_coordinator_package',
      actor: 'meta_agent',
      mutates_run_state: false,
      command: `node ${root}/mitra-autonomous-factory/scripts/prepare-coordinator-from-instance.mjs ${manifestPath} --product-project-dir ${productWorkdir} --coordinator-code ${coordinatorCode} --execution-code ${executionCode} --start-tmux sleep --simulation false`,
      outputs: ['COORDINATOR.md', 'runtime_contract.json', 'coordinator_spawn_readiness.json', 'outbox/agent_readiness.json'],
      gate: 'validate-coordinator-spawn-readiness ok=true'
    },
    {
      id: '04_start_persistent_coordinator',
      actor: 'meta_agent',
      mutates_run_state: false,
      command: `tmux new-session -d -s ${coordinatorCode} "cd ${coordinatorDir} && <coordinator-supervisor-command>"`,
      outputs: ['tmux session', 'heartbeat', 'stdout jsonl'],
      gate: 'tmux has-session succeeds and coordinator_readiness proves COORDINATOR.md read'
    },
    {
      id: '05_connect_wrapper',
      actor: 'coordinator_supervisor',
      mutates_run_state: false,
      command: manifest.conversation_wrapper.send_command.join(' ').replace('{message}', '<mensagem natural do usuario>'),
      outputs: ['inbound/outbound wrapper logs', 'telegram message ids'],
      gate: 'user messages and coordinator responses are persisted by the wrapper and then by the Central System'
    },
    {
      id: '06_first_user_message',
      actor: 'user',
      mutates_run_state: true,
      command: 'Coordenador vivo registra user_message_received via Central System',
      outputs: ['COORDINATOR_EXCHANGES', 'EXECUTION_ROUNDS.NEXT_MISSION_JSON', 'EXECUTIONS.PHASE', 'card moved when phase changes'],
      gate: 'Meta-Agent does not register operational event'
    }
  ],
  next_missing_implementation: [
    'conversation wrapper must persist inbound/outbound records with idempotency and message ids',
    'control project bootstrap must create or bind af_exchange_event in the target factory control project'
  ]
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(plan, null, 2));
console.log(JSON.stringify(plan, null, 2));
