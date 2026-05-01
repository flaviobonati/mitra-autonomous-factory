#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: validate-dev-spawn-readiness.mjs readiness.json');
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

function requiredStringAllowEmpty(key) {
  if (typeof readiness[key] !== 'string') fail(`missing string: ${key}`);
}

function requiredArray(key) {
  if (!Array.isArray(readiness[key]) || readiness[key].length === 0) fail(`missing non-empty array: ${key}`);
}

function requiredObject(key) {
  if (!readiness[key] || typeof readiness[key] !== 'object' || Array.isArray(readiness[key])) fail(`missing object: ${key}`);
}

function requiredTrue(key) {
  if (readiness[key] !== true) fail(`must be true: ${key}`);
}

function mustExist(path, label = path) {
  if (!path || !existsSync(path)) fail(`missing ${label}: ${path}`);
  else ok(`${label} exists: ${path}`);
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function checkHash(pathKey, hashKey) {
  const path = readiness[pathKey];
  if (!path || !existsSync(path)) return;
  const actual = sha256(path);
  const expected = String(readiness[hashKey] ?? '').replace(/^sha256:/, '');
  if (!expected) fail(`missing hash: ${hashKey}`);
  else if (actual !== expected) fail(`${hashKey} mismatch for ${pathKey}: expected ${expected} got ${actual}`);
  else ok(`${hashKey} matches ${pathKey}: ${actual}`);
}

[
  'execution_id',
  'mission_id',
  'workspace_id',
  'project_id',
  'product_project_dir',
  'frontend_path',
  'backend_path',
  'git_head_before',
  'dirty_tree_policy',
  'runtime_contract_path',
  'runtime_contract_hash',
  'dev_prompt_path',
  'dev_prompt_hash',
  'system_prompt_path',
  'system_prompt_hash',
  'agents_md_path',
  'agents_md_hash',
  'expected_model',
].forEach(requiredString);

requiredStringAllowEmpty('git_status_before');

[
  'scope_artifact_refs',
  'dev_write_scope',
  'dev_forbidden_scope',
].forEach(requiredArray);

requiredObject('output_contract');
[
  'project_is_not_factory',
  'project_has_frontend_backend',
  'project_has_git',
  'project_has_mitra_agent_files',
  'prompt_readiness_required',
  'backend_mitra_required',
  'commit_or_block_required',
].forEach(requiredTrue);

if (String(readiness.project_id) === '46955') fail('project_id must not be 46955');
if (readiness.expected_model !== 'claude-opus-4-7') fail('expected_model must be claude-opus-4-7');
if (!readiness.dev_write_scope.includes('product_project_dir')) fail('dev_write_scope must include product_project_dir');
if (!readiness.dev_forbidden_scope.includes('factory_control_project_dir')) fail('dev_forbidden_scope must include factory_control_project_dir');
if (!readiness.dev_forbidden_scope.includes('coordinator_dir')) fail('dev_forbidden_scope must include coordinator_dir');

mustExist(readiness.product_project_dir, 'product_project_dir');
mustExist(readiness.frontend_path, 'frontend_path');
mustExist(readiness.backend_path, 'backend_path');
mustExist(`${readiness.product_project_dir}/.git`, 'product .git');
mustExist(`${readiness.product_project_dir}/.env.local`, 'product .env.local');
mustExist(`${readiness.product_project_dir}/AGENTS.md`, 'product AGENTS.md');
mustExist(`${readiness.product_project_dir}/system_prompt.md`, 'product system_prompt.md');
mustExist(readiness.runtime_contract_path, 'runtime_contract_path');
mustExist(readiness.dev_prompt_path, 'dev_prompt_path');
mustExist(readiness.system_prompt_path, 'system_prompt_path');
mustExist(readiness.agents_md_path, 'agents_md_path');

try {
  const productReal = realpathSync(readiness.product_project_dir);
  const factoryReal = realpathSync(readiness.factory_control_project_dir ?? '/opt/mitra-factory/workspaces/w-19658/p-46955');
  let isolated = true;
  if (productReal === factoryReal) {
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

if (existsSync(readiness.product_project_dir)) {
  const gitHead = spawnSync('git', ['-C', readiness.product_project_dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (gitHead.status !== 0) fail(`git rev-parse failed: ${gitHead.stderr || gitHead.stdout}`);
  else if (gitHead.stdout.trim() !== readiness.git_head_before) fail('git_head_before does not match product HEAD');
  else ok(`git_head_before matches product HEAD: ${readiness.git_head_before}`);

  const gitStatus = spawnSync('git', ['-C', readiness.product_project_dir, 'status', '--short'], { encoding: 'utf8' });
  if (gitStatus.status !== 0) fail(`git status failed: ${gitStatus.stderr || gitStatus.stdout}`);
  else if (gitStatus.stdout.trim() !== readiness.git_status_before.trim()) fail('git_status_before does not match current product status');
  else ok('git_status_before matches current product status');
}

for (const [key, label] of [
  ['frontend_path', 'frontend_path'],
  ['backend_path', 'backend_path'],
]) {
  if (readiness[key] && existsSync(readiness[key])) {
    const stat = lstatSync(readiness[key]);
    if (!stat.isDirectory()) fail(`${label} must be a directory`);
  }
}

checkHash('runtime_contract_path', 'runtime_contract_hash');
checkHash('dev_prompt_path', 'dev_prompt_hash');
checkHash('system_prompt_path', 'system_prompt_hash');
checkHash('agents_md_path', 'agents_md_hash');

const result = {
  ok: errors.length === 0,
  file,
  errors,
  evidence,
  rechecks: {
    local_files: evidence.filter((item) => item.includes('exists')).length,
    isolation: evidence.some((item) => item.startsWith('realpath isolation ok')),
    git: evidence.some((item) => item.startsWith('git_head_before matches')) && evidence.includes('git_status_before matches current product status'),
    hashes: evidence.filter((item) => item.includes(' matches ')).length,
  },
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
