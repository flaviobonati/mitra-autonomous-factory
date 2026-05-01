#!/usr/bin/env node
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: validate-coordinator-spawn-readiness.mjs readiness.json');
  process.exit(2);
}

const readiness = JSON.parse(readFileSync(file, 'utf8'));
const errors = [];
const evidence = [];

function fail(message) {
  errors.push(message);
}

function ok(message) {
  evidence.push(message);
}

function requiredString(key) {
  if (typeof readiness[key] !== 'string' || readiness[key].trim() === '') fail(`missing string: ${key}`);
}

function requiredTrue(key) {
  if (readiness[key] !== true) fail(`must be true: ${key}`);
}

function mustExist(path, label = path) {
  if (!path || !existsSync(path)) fail(`missing ${label}: ${path}`);
  else ok(`${label} exists: ${path}`);
}

[
  'coordinator_code',
  'execution_code',
  'factory_control_project_dir',
  'factory_gateway_path',
  'product_workspace_id',
  'product_project_id',
  'product_project_dir',
  'product_frontend_dir',
  'product_backend_dir',
  'runtime_contract_path',
  'coordinator_prompt_path',
  'coordinator_package_path',
  'tmux_session',
].forEach(requiredString);

[
  'project_is_not_factory',
  'project_has_frontend_backend',
  'project_has_git',
  'project_has_mitra_agent_files',
  'first_message_is_natural_user_request_only',
].forEach(requiredTrue);

if (String(readiness.product_project_id) === '46955') {
  fail('product_project_id must not be 46955');
}

mustExist(readiness.factory_control_project_dir, 'factory_control_project_dir');
mustExist(readiness.factory_gateway_path, 'factory_gateway_path');
mustExist(readiness.product_project_dir, 'product_project_dir');
mustExist(readiness.product_frontend_dir, 'product_frontend_dir');
mustExist(readiness.product_backend_dir, 'product_backend_dir');
mustExist(`${readiness.product_project_dir}/.git`, 'product .git');
mustExist(`${readiness.product_project_dir}/.env.local`, 'product .env.local');
mustExist(`${readiness.product_project_dir}/AGENTS.md`, 'product AGENTS.md');
mustExist(`${readiness.product_project_dir}/system_prompt.md`, 'product system_prompt.md');
mustExist(readiness.runtime_contract_path, 'runtime_contract_path');
mustExist(readiness.coordinator_prompt_path, 'coordinator_prompt_path');
mustExist(readiness.coordinator_package_path, 'coordinator_package_path');
mustExist(`${readiness.coordinator_package_path}/COORDINATOR.md`, 'COORDINATOR.md');
mustExist(`${readiness.coordinator_package_path}/prompts/coordinator.md`, 'prompts/coordinator.md');

try {
  const factoryReal = realpathSync(readiness.factory_control_project_dir);
  const productReal = realpathSync(readiness.product_project_dir);
  let isolated = true;
  if (factoryReal === productReal) {
    fail('product_project_dir realpath equals factory_control_project_dir');
    isolated = false;
  }
  if (productReal.startsWith(`${factoryReal}/`)) {
    fail('product_project_dir is inside factory_control_project_dir');
    isolated = false;
  }
  if (isolated) ok(`realpath isolation ok: product=${productReal} factory=${factoryReal}`);
} catch (e) {
  fail(`realpath check failed: ${e.message}`);
}

if (existsSync(readiness.runtime_contract_path)) {
  try {
    const contract = JSON.parse(readFileSync(readiness.runtime_contract_path, 'utf8'));
    if (contract.factory_control_project_dir !== readiness.factory_control_project_dir) {
      fail('runtime_contract.factory_control_project_dir mismatch');
    }
    if (contract.factory_gateway_path !== readiness.factory_gateway_path) {
      fail('runtime_contract.factory_gateway_path mismatch');
    }
    if (contract.product_project_dir !== readiness.product_project_dir) {
      fail('runtime_contract.product_project_dir mismatch');
    }
    if (!Array.isArray(contract.dev_write_scope) || !contract.dev_write_scope.includes('product_project_dir')) {
      fail('runtime_contract.dev_write_scope must include product_project_dir');
    }
    if (!Array.isArray(contract.dev_forbidden_scope) || !contract.dev_forbidden_scope.includes('factory_control_project_dir')) {
      fail('runtime_contract.dev_forbidden_scope must include factory_control_project_dir');
    }
    ok('runtime_contract fields match readiness');
  } catch (e) {
    fail(`runtime_contract parse/check failed: ${e.message}`);
  }
}

if (existsSync(readiness.coordinator_package_path)) {
  try {
    const coordinatorPath = `${readiness.coordinator_package_path}/COORDINATOR.md`;
    const promptPath = `${readiness.coordinator_package_path}/prompts/coordinator.md`;
    const stat = lstatSync(coordinatorPath);
    if (stat.size < 1000) fail('COORDINATOR.md appears too small to be canonical');
    else ok(`COORDINATOR.md size ok: ${stat.size} bytes`);
    if (existsSync(promptPath)) {
      const promptStat = lstatSync(promptPath);
      if (promptStat.size !== stat.size) fail('prompts/coordinator.md size differs from COORDINATOR.md');
      else ok(`prompts/coordinator.md size matches COORDINATOR.md: ${promptStat.size} bytes`);
      if (readFileSync(promptPath, 'utf8') !== readFileSync(coordinatorPath, 'utf8')) {
        fail('prompts/coordinator.md content differs from COORDINATOR.md');
      } else {
        ok('prompts/coordinator.md content matches COORDINATOR.md');
      }
    }
  } catch (e) {
    fail(`coordinator prompt stat/check failed: ${e.message}`);
  }
}

const tmux = spawnSync('tmux', ['has-session', '-t', readiness.tmux_session], { encoding: 'utf8' });
if (tmux.status !== 0) fail(`tmux session not found: ${readiness.tmux_session}`);
else ok(`tmux session exists: ${readiness.tmux_session}`);

const result = {
  ok: errors.length === 0,
  file,
  errors,
  evidence,
  rechecks: {
    local_files: evidence.filter((item) => item.includes('exists')).length,
    isolation: evidence.some((item) => item.startsWith('realpath isolation ok')),
    tmux: evidence.some((item) => item.startsWith('tmux session exists')),
  },
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
