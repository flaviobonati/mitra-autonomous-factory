#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('Usage: validate-agent-readiness.mjs agent_readiness.json');
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

requiredString('agent_type');
requiredString('mission_id');

if (readiness.runtime_contract_loaded !== true) fail('runtime_contract_loaded must be true');
else ok('runtime_contract_loaded=true');

if (readiness.mission_loaded !== true) fail('mission_loaded must be true');
else ok('mission_loaded=true');

if (!Array.isArray(readiness.blocking_gaps)) fail('blocking_gaps must be an array');
else if (readiness.blocking_gaps.length > 0) fail(`blocking_gaps not empty: ${readiness.blocking_gaps.join('; ')}`);
else ok('blocking_gaps empty');

if (!Array.isArray(readiness.read_files) || readiness.read_files.length === 0) {
  fail('read_files must be a non-empty array');
} else {
  for (const entry of readiness.read_files) {
    const path = entry?.path;
    if (typeof path !== 'string' || path.trim() === '') {
      fail('read_files entry missing path');
      continue;
    }
    if (!existsSync(path)) {
      fail(`read file missing on disk: ${path}`);
      continue;
    }
    const bytes = statSync(path).size;
    const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (entry.bytes !== bytes) fail(`byte mismatch for ${path}: expected ${entry.bytes} got ${bytes}`);
    else ok(`bytes match: ${path}`);
    if (entry.sha256 !== sha256) fail(`sha256 mismatch for ${path}: expected ${entry.sha256} got ${sha256}`);
    else ok(`sha256 matches: ${path}`);
  }
}

const result = {
  ok: errors.length === 0,
  file,
  agent_type: readiness.agent_type,
  mission_id: readiness.mission_id,
  errors,
  evidence,
  rechecks: {
    file_count: Array.isArray(readiness.read_files) ? readiness.read_files.length : 0,
    hashes_verified: evidence.filter((item) => item.startsWith('sha256 matches')).length,
    bytes_verified: evidence.filter((item) => item.startsWith('bytes match')).length,
    blocking_gaps_empty: evidence.includes('blocking_gaps empty'),
  },
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
