#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configureSdkMitra, createProjectMitra } from 'mitra-sdk';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: create-product-project-from-instance.mjs <factory_instance_manifest.json> [--name <name>] [--dry-run true|false] [--execute]');
  process.exit(2);
}

function arg(name, fallback = '') {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function parseEnvFile(path) {
  const env = {};
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const index = normalized.indexOf('=');
    if (index <= 0) continue;
    const key = normalized.slice(0, index).trim();
    let value = normalized.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function usableSecret(value) {
  return Boolean(value && !value.includes('RUNTIME_SECRET') && value !== '<secret>');
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...options });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
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
const instanceEnv = parseEnvFile(manifest.mitra.env_file);
const workspaceId = Number(manifest.mitra.workspace_id);
const envWorkspaceId = instanceEnv.MITRA_WORKSPACE_ID;
const baseURL = instanceEnv.MITRA_BASE_URL || manifest.mitra.base_url;
const integrationURL = instanceEnv.MITRA_BASE_URL_INTEGRATIONS || manifest.mitra.integrations_url;
const tokenEnv = manifest.mitra.token_env;
const token = usableSecret(instanceEnv[tokenEnv]) ? instanceEnv[tokenEnv] : process.env[tokenEnv];
const dryRun = hasFlag('execute') ? false : arg('dry-run', 'true') !== 'false';
const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15);
const name = arg('name', `${manifest.product_project_defaults.name_prefix} ${stamp}`);

if (!workspaceId) throw new Error('manifest.mitra.workspace_id must be numeric');
if (String(envWorkspaceId) !== String(manifest.mitra.workspace_id)) {
  throw new Error(`Refusing to create project: env_file workspace ${envWorkspaceId || '<missing>'} does not match manifest workspace ${manifest.mitra.workspace_id}`);
}
if (baseURL !== manifest.mitra.base_url) {
  throw new Error(`Refusing to create project: env_file base URL ${baseURL} does not match manifest base URL ${manifest.mitra.base_url}`);
}
if (integrationURL !== manifest.mitra.integrations_url) {
  throw new Error(`Refusing to create project: env_file integrations URL ${integrationURL} does not match manifest integrations URL ${manifest.mitra.integrations_url}`);
}
if (!usableSecret(token)) {
  throw new Error(`Missing usable token ${tokenEnv} in mitra.env_file or process env`);
}

const root = manifest.root_dir;
const templateDir = manifest.product_project_defaults.template_dir;
const mitraAgentDir = manifest.product_project_defaults.mitra_agent_dir;
const canon = manifest.coordinator.package_source_dir;
const forbiddenProjectIds = new Set(manifest.safety.forbidden_product_project_ids.map(String));
mustExist(`${templateDir}/frontend`, 'product template frontend');
mustExist(`${templateDir}/backend`, 'product template backend');
mustExist(`${mitraAgentDir}/AGENTS.md`, 'mitra agent AGENTS.md');
mustExist(`${mitraAgentDir}/system_prompt.md`, 'mitra agent system_prompt.md');
mustExist(`${canon}/prompts/dev.md`, 'canonical dev prompt');

const preflight = {
  ok: true,
  mode: dryRun ? 'dry_run' : 'execute',
  manifest_path: manifestPath,
  instance_code: manifest.instance_code,
  workspace_id: String(workspaceId),
  project_name: name,
  mitra_env_file: manifest.mitra.env_file,
  token_status: 'present_redacted',
  checks: {
    env_file_workspace_matches_manifest: true,
    env_file_base_url_matches_manifest: true,
    token_available_redacted: true,
    template_frontend_exists: true,
    template_backend_exists: true,
    mitra_agent_files_exist: true
  }
};

if (dryRun) {
  console.log(JSON.stringify({
    ...preflight,
    would_call: 'createProjectMitra',
    would_create_under: `${root}/workspaces/w-${workspaceId}/p-<project_id_criado>`,
    mutates_remote: false,
    mutates_filesystem: false
  }, null, 2));
  process.exit(0);
}

configureSdkMitra({ baseURL, token, integrationURL });
const created = await createProjectMitra({ workspaceId, name });
const projectId = created?.result?.projectId;
if (!projectId) {
  throw new Error(`createProjectMitra did not return projectId: ${JSON.stringify(created)}`);
}
if (forbiddenProjectIds.has(String(projectId))) {
  throw new Error(`Mitra returned forbidden project id ${projectId}`);
}

const projectDir = `${root}/workspaces/w-${workspaceId}/p-${projectId}`;
if (existsSync(projectDir)) {
  throw new Error(`Refusing to overwrite existing product project dir: ${projectDir}`);
}

mkdirSync(projectDir, { recursive: true });
cpSync(`${templateDir}/frontend`, `${projectDir}/frontend`, { recursive: true });
cpSync(`${templateDir}/backend`, `${projectDir}/backend`, { recursive: true });
rmSync(`${projectDir}/frontend/node_modules`, { recursive: true, force: true });
rmSync(`${projectDir}/backend/node_modules`, { recursive: true, force: true });

copyFile(`${mitraAgentDir}/AGENTS.md`, `${projectDir}/AGENTS.md`);
copyFile(`${mitraAgentDir}/system_prompt.md`, `${projectDir}/system_prompt.md`);
copyFile(`${canon}/prompts/dev.md`, `${projectDir}/dev.md`);

const envLocal = [
  `MITRA_BASE_URL=${baseURL}`,
  `MITRA_BASE_URL_INTEGRATIONS=${integrationURL}`,
  `MITRA_TOKEN=${token}`,
  `MITRA_WORKSPACE_ID=${workspaceId}`,
  `MITRA_PROJECT_ID=${projectId}`,
  `MITRA_DIRECTORY=${projectDir}`,
  ''
].join('\n');
writeFileSync(`${projectDir}/.env.local`, envLocal, { mode: 0o600 });
writeFileSync(`${projectDir}/frontend/.env`, envLocal, { mode: 0o600 });
writeFileSync(`${projectDir}/backend/.env`, envLocal, { mode: 0o600 });
writeFileSync(
  `${projectDir}/.env.example`,
  [
    `MITRA_BASE_URL=${baseURL}`,
    `MITRA_BASE_URL_INTEGRATIONS=${integrationURL}`,
    'MITRA_TOKEN=',
    `MITRA_WORKSPACE_ID=${workspaceId}`,
    `MITRA_PROJECT_ID=${projectId}`,
    `MITRA_DIRECTORY=${projectDir}`,
    ''
  ].join('\n')
);
writeFileSync(
  `${projectDir}/.gitignore`,
  ['.env.local', '.env', 'frontend/.env', 'backend/.env', 'node_modules/', 'dist/', '.DS_Store', ''].join('\n')
);

run('git', ['init', '-b', 'main'], { cwd: projectDir });
run('git', ['config', 'user.email', 'factory@mitra.local'], { cwd: projectDir });
run('git', ['config', 'user.name', 'Mitra Factory'], { cwd: projectDir });
run('git', ['add', '.'], { cwd: projectDir });
run('git', ['commit', '-m', `Initial Mitra product scaffold for ${name}`], { cwd: projectDir });

const head = run('git', ['rev-parse', 'HEAD'], { cwd: projectDir });
const status = run('git', ['status', '--short'], { cwd: projectDir });

const summary = {
  ...preflight,
  project_id: String(projectId),
  project_dir: projectDir,
  frontend_dir: `${projectDir}/frontend`,
  backend_dir: `${projectDir}/backend`,
  git_head: head,
  git_status_short: status,
  rechecks: {
    workspace_matches_manifest: String(workspaceId) === manifest.mitra.workspace_id,
    project_not_forbidden: !forbiddenProjectIds.has(String(projectId)),
    local_dir_created: existsSync(projectDir),
    git_clean: status === '',
    env_files_written: existsSync(`${projectDir}/.env.local`) && existsSync(`${projectDir}/frontend/.env`) && existsSync(`${projectDir}/backend/.env`)
  },
  mitra_files: {
    agents_md_sha256: sha256(`${projectDir}/AGENTS.md`),
    system_prompt_sha256: sha256(`${projectDir}/system_prompt.md`),
    dev_md_sha256: sha256(`${projectDir}/dev.md`)
  }
};

console.log(JSON.stringify(summary, null, 2));
