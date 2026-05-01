#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: prepare-coordinator-from-instance.mjs <factory_instance_manifest.json> --product-project-dir <dir> [--coordinator-code <code>] [--execution-code <code>] [--start-tmux sleep|none] [--simulation true|false]');
  process.exit(2);
}

function arg(name, fallback = '') {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function bytes(path) {
  return readFileSync(path).length;
}

function copyFile(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

function mustExist(path, label = path) {
  if (!existsSync(path)) throw new Error(`Missing ${label}: ${path}`);
}

const scriptDir = dirname(new URL(import.meta.url).pathname);
const validator = resolve(scriptDir, 'validate-factory-instance-manifest.mjs');
const validation = spawnSync('node', [validator, manifestPath], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stderr);
  process.stderr.write(validation.stdout);
  process.exit(validation.status ?? 1);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const productProjectDirArg = arg('product-project-dir');
if (!productProjectDirArg) throw new Error('Provide --product-project-dir');
const productProjectDir = resolve(productProjectDirArg);

const productMatch = productProjectDir.match(/\/workspaces\/w-([^/]+)\/p-([^/]+)$/);
if (!productMatch) throw new Error(`Cannot infer workspace/project from ${productProjectDir}`);
const productWorkspaceId = productMatch[1];
const productProjectId = productMatch[2];

if (new Set(manifest.safety.forbidden_product_project_ids).has(productProjectId)) {
  throw new Error(`Product project ${productProjectId} is forbidden by manifest safety rules`);
}

mustExist(productProjectDir, 'product_project_dir');
mustExist(`${productProjectDir}/frontend`, 'product frontend');
mustExist(`${productProjectDir}/backend`, 'product backend');
mustExist(`${productProjectDir}/.git`, 'product git');
mustExist(`${productProjectDir}/.env.local`, 'product .env.local');
mustExist(`${productProjectDir}/AGENTS.md`, 'product AGENTS.md');
mustExist(`${productProjectDir}/system_prompt.md`, 'product system_prompt.md');

const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15).toLowerCase();
const coordinatorCode = arg('coordinator-code', `coord_${manifest.instance_code}_${stamp}`);
const executionCode = arg('execution-code', `exec_${manifest.instance_code}_${stamp}`);
const coordinatorDir = `${manifest.coordinator.dir_root}/${coordinatorCode}`;
const tmuxSession = coordinatorCode;
const startTmux = arg('start-tmux', 'none');
const simulation = arg('simulation', 'true') !== 'false';

mkdirSync(coordinatorDir, { recursive: true });
for (const dir of ['prompts', 'docs', 'schemas', 'missions', 'logs', 'outbox']) {
  mkdirSync(`${coordinatorDir}/${dir}`, { recursive: true });
}

const canon = manifest.coordinator.package_source_dir;
copyFile(`${canon}/prompts/coordinator.md`, `${coordinatorDir}/COORDINATOR.md`);
copyFile(`${canon}/prompts/coordinator.md`, `${coordinatorDir}/prompts/coordinator.md`);

const promptFiles = ['researcher.md', 'dev.md', 'qa-core.md', 'qa-horizontal.md', 'qa-story.md', 'qa-consolidator.md'];
for (const prompt of promptFiles) {
  copyFile(`${canon}/prompts/${prompt}`, `${coordinatorDir}/prompts/${prompt}`);
}

const docFiles = ['context-delivery.md', 'new-run-readiness-gates.md', 'initial_scope_artifact_templates.md'];
for (const doc of docFiles) {
  copyFile(`${canon}/docs/${doc}`, `${coordinatorDir}/docs/${doc}`);
}

const schemaFiles = [
  'next_mission.schema.json',
  'agent_readiness.schema.json',
  'coordinator_spawn_readiness.schema.json',
  'dev_spawn_readiness.schema.json',
  'factory_instance_manifest.schema.json',
  'scope_state.schema.json',
  'dev_handoff.schema.json',
  'qa_result.schema.json',
  'qa_story_batch_result.schema.json',
  'qa_story_result.schema.json'
];
for (const schema of schemaFiles) {
  copyFile(`${canon}/schemas/${schema}`, `${coordinatorDir}/schemas/${schema}`);
}

const runtimeContract = {
  coordinator_code: coordinatorCode,
  execution_code: executionCode,
  coordinator_dir: coordinatorDir,
  factory_instance_manifest_path: manifestPath,
  factory_instance_code: manifest.instance_code,
  factory_control_project_dir: manifest.factory_control_project.project_dir,
  factory_gateway_path: manifest.factory_control_project.gateway_path,
  product_workspace_id: productWorkspaceId,
  product_project_id: productProjectId,
  product_project_dir: productProjectDir,
  product_frontend_dir: `${productProjectDir}/frontend`,
  product_backend_dir: `${productProjectDir}/backend`,
  dev_write_scope: ['product_project_dir'],
  dev_forbidden_scope: ['factory_control_project_dir', 'coordinator_dir'],
  write_surface: `mitra_server_function:${manifest.factory_control_project.server_function.name}:${manifest.factory_control_project.server_function.id ?? '<id-from-file>'}`,
  gateway_usage: 'append-only event registration by coordinator only through the Mitra SF when available',
  conversation_wrapper: {
    type: manifest.conversation_wrapper.type,
    inbox_dir: manifest.conversation_wrapper.inbox_dir,
    send_command: manifest.conversation_wrapper.send_command
  },
  simulation
};
const runtimePath = `${coordinatorDir}/missions/runtime_contract.json`;
writeFileSync(runtimePath, JSON.stringify(runtimeContract, null, 2));

const firstMessage = [
  `Leia COORDINATOR.md inteiro antes de agir.`,
  `coordinator_code=${coordinatorCode}; execution_code=${executionCode}; gateway=${manifest.factory_control_project.gateway_path}; product_project_id=${productProjectId}; product_project_dir=${productProjectDir}.`,
  'Usuario: <mensagem natural do usuario>'
].join(' ');
writeFileSync(`${coordinatorDir}/missions/first_message_template.txt`, `${firstMessage}\n`);

const packageReadiness = {
  prepared_by: 'meta_agent',
  purpose: 'coordinator_package_preflight',
  coordinator_code: coordinatorCode,
  execution_code: executionCode,
  files: [
    `${coordinatorDir}/COORDINATOR.md`,
    `${coordinatorDir}/prompts/coordinator.md`,
    runtimePath,
    manifestPath
  ].map((path) => ({ path, sha256: sha256(path), bytes: bytes(path) })),
  note: 'This is package evidence. The live Coordinator still must read COORDINATOR.md and produce its own agent_readiness before acting.'
};
writeFileSync(`${coordinatorDir}/outbox/coordinator_package_readiness.json`, JSON.stringify(packageReadiness, null, 2));

const readiness = {
  coordinator_code: coordinatorCode,
  execution_code: executionCode,
  factory_control_project_dir: manifest.factory_control_project.project_dir,
  factory_gateway_path: manifest.factory_control_project.gateway_path,
  product_workspace_id: productWorkspaceId,
  product_project_id: productProjectId,
  product_project_dir: productProjectDir,
  product_frontend_dir: `${productProjectDir}/frontend`,
  product_backend_dir: `${productProjectDir}/backend`,
  project_is_not_factory: true,
  project_has_frontend_backend: true,
  project_has_git: true,
  project_has_mitra_agent_files: true,
  runtime_contract_path: runtimePath,
  coordinator_prompt_path: `${coordinatorDir}/prompts/coordinator.md`,
  coordinator_package_path: coordinatorDir,
  tmux_session: tmuxSession,
  first_message_is_natural_user_request_only: true,
  simulation
};
const readinessPath = `${coordinatorDir}/coordinator_spawn_readiness.json`;
writeFileSync(readinessPath, JSON.stringify(readiness, null, 2));

const gitHead = spawnSync('git', ['-C', productProjectDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
const gitStatus = spawnSync('git', ['-C', productProjectDir, 'status', '--short'], { encoding: 'utf8' });

if (startTmux !== 'none') {
  const hasSession = spawnSync('tmux', ['has-session', '-t', tmuxSession], { encoding: 'utf8' });
  if (hasSession.status !== 0) {
    const cmd = `cd ${coordinatorDir}; printf 'Coordinator package ${coordinatorCode} ready. Live coordinator must read COORDINATOR.md before acting.\\n'; sleep 3600`;
    const started = spawnSync('tmux', ['new-session', '-d', '-s', tmuxSession, cmd], { encoding: 'utf8' });
    if (started.status !== 0) throw new Error(started.stderr || started.stdout || `failed to start tmux ${tmuxSession}`);
  }
}

const summary = {
  ok: true,
  mode: simulation ? 'simulation_package' : 'real_package_preflight',
  manifest_path: manifestPath,
  coordinator_code: coordinatorCode,
  execution_code: executionCode,
  coordinator_dir: coordinatorDir,
  readiness_path: readinessPath,
  runtime_contract_path: runtimePath,
  package_readiness_path: `${coordinatorDir}/outbox/coordinator_package_readiness.json`,
  first_message_template_path: `${coordinatorDir}/missions/first_message_template.txt`,
  tmux_session: tmuxSession,
  tmux_started: startTmux !== 'none',
  product_project_dir: productProjectDir,
  product_workspace_id: productWorkspaceId,
  product_project_id: productProjectId,
  product_git_head: gitHead.stdout.trim(),
  product_git_status_short: gitStatus.stdout,
  copied_prompt_count: promptFiles.length + 2,
  copied_doc_count: docFiles.length,
  copied_schema_count: schemaFiles.length
};

writeFileSync(`${coordinatorDir}/prepare_from_instance_summary.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
