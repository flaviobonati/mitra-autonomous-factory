#!/usr/bin/env node
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const configPath = process.argv[2];
const modeArg = process.argv.includes('--template') ? 'template' : 'local';
if (!configPath) {
  console.error('Usage: validate-factory-instance-config.mjs <factory-instance-config.json> [--template]');
  process.exit(2);
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
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

function mustArray(path, value) {
  if (!Array.isArray(value)) fail(`missing array: ${path}`);
}

function mustExist(path, label) {
  if (modeArg === 'template' && label === 'mitra.env_file') {
    ok(`${label} template placeholder accepted`);
    return;
  }
  if (modeArg === 'template' && String(path ?? '').includes('00000')) {
    ok(`${label} template placeholder accepted`);
    return;
  }
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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

function usableSecret(value) {
  return Boolean(value && !value.includes('RUNTIME_SECRET') && value !== '<secret>');
}

mustString('schema_version', config.schema_version);
mustString('factory_instance_code', config.factory_instance_code);
mustString('root_dir', config.root_dir);
mustString('mitra.base_url', config.mitra?.base_url);
mustString('mitra.integrations_url', config.mitra?.integrations_url);
mustString('mitra.workspace_id', config.mitra?.workspace_id);
mustString('mitra.token_env', config.mitra?.token_env);
mustString('mitra.env_file', config.mitra?.env_file);
mustString('factory_control_project.project_id', config.factory_control_project?.project_id);
mustString('factory_control_project.project_dir', config.factory_control_project?.project_dir);
mustString('factory_control_project.gateway_path', config.factory_control_project?.gateway_path);
mustString('coordinator_defaults.model', config.coordinator_defaults?.model);
mustString('coordinator_defaults.session_runtime', config.coordinator_defaults?.session_runtime);
mustString('telegram_wrapper.type', config.telegram_wrapper?.type);
mustArray('ui_project_creation.allowed_fields', config.ui_project_creation?.allowed_fields);
mustArray('ui_project_creation.forbidden_fields', config.ui_project_creation?.forbidden_fields);

if (config.schema_version !== 'factory.v2') fail('schema_version must be factory.v2');
if (config.coordinator_defaults?.model !== 'gpt-5.5') fail('coordinator_defaults.model must be gpt-5.5');
if (config.coordinator_defaults?.session_runtime !== 'tmux') fail('coordinator_defaults.session_runtime must be tmux');
if (config.telegram_wrapper?.type !== 'telegram') fail('telegram_wrapper.type must be telegram');
if (config.ui_project_creation?.creates_product_project_in_configured_workspace !== true) fail('UI project creation must create product project in configured workspace');
if (config.ui_project_creation?.initial_message_required !== false) fail('UI project creation must not require an initial message');
if (config.safety?.allow_meta_agent_operational_events !== false) fail('Meta-Agent operational events must be forbidden');
if (config.safety?.require_project_registry_before_run !== true) fail('Project Registry must be required before run');
if (config.safety?.require_product_git !== true) fail('Product git must be required');

const allowed = new Set(config.ui_project_creation?.allowed_fields ?? []);
const forbidden = new Set(config.ui_project_creation?.forbidden_fields ?? []);
for (const field of ['project_name', 'telegram_bot_ref']) {
  if (!allowed.has(field)) fail(`UI allowed_fields must include ${field}`);
}
for (const field of ['domain', 'workspace_id', 'factory_project_id', 'coordinator_model', 'initial_request_type', 'initial_intent_message', 'vps_config']) {
  if (!forbidden.has(field)) fail(`UI forbidden_fields must include ${field}`);
  if (allowed.has(field)) fail(`UI allowed_fields must not include forbidden field ${field}`);
}

const factoryProjectId = String(config.factory_control_project?.project_id ?? '');
const forbiddenProductIds = new Set((config.safety?.forbidden_product_project_ids ?? []).map(String));
if (!forbiddenProductIds.has(factoryProjectId)) fail('safety.forbidden_product_project_ids must include factory_control_project.project_id');

mustExist(config.root_dir, 'root_dir');
mustExist(config.mitra?.env_file, 'mitra.env_file');
mustExist(config.factory_control_project?.project_dir, 'factory_control_project.project_dir');
mustExist(config.factory_control_project?.gateway_path, 'factory_control_project.gateway_path');
mustExist(config.factory_control_project?.server_functions?.exchange_event?.id_file, 'exchange_event.id_file');
mustExist(config.factory_control_project?.server_functions?.exchange_event?.setup_script, 'exchange_event.setup_script');
mustExist(config.product_project_defaults?.template_dir, 'product_project_defaults.template_dir');
mustExist(config.product_project_defaults?.mitra_agent_dir, 'product_project_defaults.mitra_agent_dir');
mustExist(config.coordinator_defaults?.dir_root, 'coordinator_defaults.dir_root');
mustExist(config.coordinator_defaults?.package_source_dir, 'coordinator_defaults.package_source_dir');
mustExist(config.telegram_wrapper?.inbox_dir, 'telegram_wrapper.inbox_dir');

let envFileWorkspaceMatches = modeArg === 'template';
let envFileBaseUrlMatches = modeArg === 'template';
let tokenAvailable = modeArg === 'template';
if (modeArg === 'local' && config.mitra?.env_file && existsSync(config.mitra.env_file)) {
  const env = parseEnvFile(config.mitra.env_file);
  if (env.MITRA_WORKSPACE_ID === String(config.mitra.workspace_id)) {
    envFileWorkspaceMatches = true;
    ok(`mitra.env_file workspace matches config: ${env.MITRA_WORKSPACE_ID}`);
  } else {
    fail(`mitra.env_file MITRA_WORKSPACE_ID mismatch (${env.MITRA_WORKSPACE_ID || '<missing>'} !== ${config.mitra.workspace_id})`);
  }
  if (!env.MITRA_BASE_URL || env.MITRA_BASE_URL === config.mitra.base_url) {
    envFileBaseUrlMatches = true;
    ok('mitra.env_file base URL matches config');
  } else {
    fail(`mitra.env_file MITRA_BASE_URL mismatch (${env.MITRA_BASE_URL} !== ${config.mitra.base_url})`);
  }
  if (env.MITRA_BASE_URL_INTEGRATIONS && env.MITRA_BASE_URL_INTEGRATIONS !== config.mitra.integrations_url) {
    fail(`mitra.env_file MITRA_BASE_URL_INTEGRATIONS mismatch (${env.MITRA_BASE_URL_INTEGRATIONS} !== ${config.mitra.integrations_url})`);
  } else {
    ok('mitra.env_file integrations URL matches config');
  }
  tokenAvailable = usableSecret(env[config.mitra.token_env]) || usableSecret(process.env[config.mitra.token_env]);
  if (tokenAvailable) ok(`mitra token available redacted: ${config.mitra.token_env}`);
  else fail(`missing usable token ${config.mitra.token_env}`);
}

try {
  if (modeArg === 'local') {
    const root = realpathSync(config.root_dir);
    const control = realpathSync(config.factory_control_project.project_dir);
    const coordinatorRoot = realpathSync(config.coordinator_defaults.dir_root);
    if (control === root || control.startsWith(`${root}/`)) ok(`factory control project under root_dir: ${control}`);
    else fail('factory control project must be under root_dir');
    if (coordinatorRoot === root || coordinatorRoot.startsWith(`${root}/`)) ok(`coordinator dir under root_dir: ${coordinatorRoot}`);
    else fail('coordinator dir must be under root_dir');
  }
} catch (error) {
  fail(`realpath check failed: ${error.message}`);
}

if (Array.isArray(config.telegram_wrapper?.send_command)) {
  if (config.telegram_wrapper.send_command.includes('{message}')) ok('telegram send_command includes {message}');
  else fail('telegram send_command must include {message}');
}

const tmux = spawnSync('tmux', ['-V'], { encoding: 'utf8' });
if (tmux.status === 0) ok(`tmux available: ${tmux.stdout.trim()}`);
else fail('tmux is not available');

const result = {
  ok: errors.length === 0,
  mode: modeArg,
  config_path: configPath,
  factory_instance_code: config.factory_instance_code,
  workspace_id: config.mitra?.workspace_id,
  token_status: tokenAvailable ? 'present_redacted' : 'missing_or_placeholder',
  errors,
  evidence,
  rechecks: {
    env_file_workspace_matches_config: envFileWorkspaceMatches,
    env_file_base_url_matches_config: envFileBaseUrlMatches,
    token_available_redacted: tokenAvailable,
    ui_only_allows_project_name_and_telegram_bot_ref: allowed.size === 2 && allowed.has('project_name') && allowed.has('telegram_bot_ref'),
    ui_forbids_workspace_model_initial_type_and_vps: ['workspace_id', 'coordinator_model', 'initial_request_type', 'initial_intent_message', 'vps_config'].every((field) => forbidden.has(field)),
    factory_project_forbidden_as_product: forbiddenProductIds.has(factoryProjectId),
    registry_required_before_run: config.safety?.require_project_registry_before_run === true,
    tmux_available: evidence.some((item) => item.startsWith('tmux available'))
  }
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
