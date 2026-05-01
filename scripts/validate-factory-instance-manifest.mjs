#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Usage: validate-factory-instance-manifest.mjs <factory_instance_manifest.json>');
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const evidence = [];

function fail(message) {
  errors.push(message);
}

function ok(message) {
  evidence.push(message);
}

function mustString(path, value) {
  if (typeof value !== 'string' || value.trim() === '') fail(`missing string: ${path}`);
}

function mustExist(path, label) {
  if (!path || !existsSync(path)) fail(`missing ${label}: ${path}`);
  else ok(`${label} exists: ${path}`);
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

mustString('instance_code', manifest.instance_code);
mustString('root_dir', manifest.root_dir);
mustString('mitra.env_file', manifest.mitra?.env_file);
mustString('mitra.workspace_id', manifest.mitra?.workspace_id);
mustString('mitra.token_env', manifest.mitra?.token_env);
mustString('factory_control_project.project_id', manifest.factory_control_project?.project_id);
mustString('factory_control_project.project_dir', manifest.factory_control_project?.project_dir);
mustString('product_project_defaults.workspace_id', manifest.product_project_defaults?.workspace_id);
mustString('coordinator.dir_root', manifest.coordinator?.dir_root);
mustString('conversation_wrapper.inbox_dir', manifest.conversation_wrapper?.inbox_dir);

if (manifest.mitra?.workspace_id !== manifest.product_project_defaults?.workspace_id) {
  fail('product_project_defaults.workspace_id must match mitra.workspace_id for this bootstrap slice');
}

if (manifest.safety?.allow_meta_agent_operational_events !== false) {
  fail('safety.allow_meta_agent_operational_events must be false');
}
if (manifest.safety?.require_product_git !== true) fail('safety.require_product_git must be true');
if (manifest.safety?.require_coordinator_tmux !== true) fail('safety.require_coordinator_tmux must be true');
if (manifest.safety?.require_agent_readiness !== true) fail('safety.require_agent_readiness must be true');

const forbidden = new Set(manifest.safety?.forbidden_product_project_ids ?? []);
if (!forbidden.has(String(manifest.factory_control_project?.project_id ?? ''))) {
  fail('safety.forbidden_product_project_ids must include factory_control_project.project_id');
}

mustExist(manifest.root_dir, 'root_dir');
mustExist(manifest.mitra?.env_file, 'mitra.env_file');
mustExist(manifest.factory_control_project?.project_dir, 'factory_control_project.project_dir');
mustExist(manifest.factory_control_project?.gateway_path, 'factory_control_project.gateway_path');
mustExist(manifest.factory_control_project?.server_function?.setup_script, 'server_function.setup_script');
mustExist(manifest.factory_control_project?.server_function?.id_file, 'server_function.id_file');
mustExist(manifest.product_project_defaults?.template_dir, 'product_project_defaults.template_dir');
mustExist(manifest.product_project_defaults?.mitra_agent_dir, 'product_project_defaults.mitra_agent_dir');
mustExist(manifest.coordinator?.package_source_dir, 'coordinator.package_source_dir');
mustExist(manifest.conversation_wrapper?.inbox_dir, 'conversation_wrapper.inbox_dir');

try {
  const root = realpathSync(manifest.root_dir);
  const control = realpathSync(manifest.factory_control_project.project_dir);
  const coordinatorRoot = realpathSync(manifest.coordinator.dir_root);
  if (!control.startsWith(`${root}/`)) fail('factory_control_project.project_dir must be under root_dir');
  else ok(`control project is under root_dir: ${control}`);
  if (!coordinatorRoot.startsWith(`${root}/`)) fail('coordinator.dir_root must be under root_dir');
  else ok(`coordinator root is under root_dir: ${coordinatorRoot}`);
} catch (error) {
  fail(`realpath validation failed: ${error.message}`);
}

if (Array.isArray(manifest.conversation_wrapper?.send_command)) {
  if (!manifest.conversation_wrapper.send_command.includes('{message}')) {
    fail('conversation_wrapper.send_command must include {message} placeholder');
  } else {
    ok('conversation_wrapper.send_command includes {message}');
  }
}

const tmux = spawnSync('tmux', ['-V'], { encoding: 'utf8' });
if (tmux.status !== 0) fail('tmux is not available on this VPS');
else ok(`tmux available: ${tmux.stdout.trim()}`);

const tokenEnv = manifest.mitra?.token_env;
let mitraEnvFileWorkspaceMatches = false;
let mitraEnvFileBaseUrlMatches = false;
let mitraTokenUsable = false;
if (manifest.mitra?.env_file && existsSync(manifest.mitra.env_file)) {
  const envFile = parseEnvFile(manifest.mitra.env_file);
  const envWorkspace = envFile.MITRA_WORKSPACE_ID;
  if (envWorkspace === manifest.mitra.workspace_id) {
    mitraEnvFileWorkspaceMatches = true;
    ok(`mitra.env_file workspace matches manifest: ${envWorkspace}`);
  } else {
    fail(`mitra.env_file MITRA_WORKSPACE_ID must match manifest.mitra.workspace_id (${envWorkspace || '<missing>'} !== ${manifest.mitra.workspace_id})`);
  }

  const envBaseUrl = envFile.MITRA_BASE_URL;
  if (!envBaseUrl || envBaseUrl === manifest.mitra.base_url) {
    mitraEnvFileBaseUrlMatches = true;
    ok('mitra.env_file base URL matches manifest');
  } else {
    fail(`mitra.env_file MITRA_BASE_URL must match manifest.mitra.base_url (${envBaseUrl} !== ${manifest.mitra.base_url})`);
  }

  const envIntegrationUrl = envFile.MITRA_BASE_URL_INTEGRATIONS;
  if (envIntegrationUrl && envIntegrationUrl !== manifest.mitra.integrations_url) {
    fail(`mitra.env_file MITRA_BASE_URL_INTEGRATIONS must match manifest.mitra.integrations_url (${envIntegrationUrl} !== ${manifest.mitra.integrations_url})`);
  } else {
    ok('mitra.env_file integrations URL matches manifest');
  }

  mitraTokenUsable = usableSecret(envFile[tokenEnv]) || usableSecret(process.env[tokenEnv]);
  if (mitraTokenUsable) ok(`mitra token available from env_file or process env: ${tokenEnv}`);
  else fail(`missing usable mitra token for ${tokenEnv} in mitra.env_file or process env`);
} else if (tokenEnv && usableSecret(process.env[tokenEnv])) {
  mitraTokenUsable = true;
  ok(`mitra token available from process env: ${tokenEnv}`);
}

const result = {
  ok: errors.length === 0,
  manifest_path: manifestPath,
  instance_code: manifest.instance_code,
  errors,
  evidence,
  rechecks: {
    control_project_exists: evidence.some((item) => item.includes('factory_control_project.project_dir exists')),
    gateway_exists: evidence.some((item) => item.includes('factory_control_project.gateway_path exists')),
    wrapper_configured: evidence.some((item) => item.includes('send_command includes {message}')),
    tmux_available: evidence.some((item) => item.startsWith('tmux available')),
    factory_project_forbidden_as_product: forbidden.has(String(manifest.factory_control_project?.project_id ?? '')),
    mitra_env_file_workspace_matches_manifest: mitraEnvFileWorkspaceMatches,
    mitra_env_file_base_url_matches_manifest: mitraEnvFileBaseUrlMatches,
    mitra_token_available_redacted: mitraTokenUsable
  }
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
