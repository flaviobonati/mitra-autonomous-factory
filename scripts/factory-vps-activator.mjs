#!/usr/bin/env node
import dotenv from 'dotenv';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configureSdkMitra, runDmlMitra, runQueryMitra } from 'mitra-sdk';

dotenv.config({ path: '/opt/mitra-factory/workspaces/w-19658/p-46955/backend/.env', quiet: true });

const ROOT = process.env.FACTORY_ROOT_DIR ?? '/opt/mitra-factory';
const PROJECT_ID = Number(process.env.MITRA_PROJECT_ID ?? 46955);
const WORKSPACE_ID = String(process.env.MITRA_WORKSPACE_ID ?? 19658);
const TOKEN_FILE = process.env.MITRA_TOKEN_FILE ?? '/tmp/mitra_project_token_current';
const token = (existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, 'utf8').trim() : '') || process.env.MITRA_TOKEN;
const baseURL = process.env.MITRA_BASE_URL ?? 'https://newmitra.mitrasheet.com:8080';
const integrationURL = process.env.MITRA_BASE_URL_INTEGRATIONS ?? baseURL;
const PUBLIC_REPO = process.env.FACTORY_CANONICAL_REPO ?? 'https://github.com/flaviobonati/mitra-autonomous-factory.git';
const PUBLIC_REF = process.env.FACTORY_CANONICAL_REF ?? 'main';
const CANON_CACHE = process.env.FACTORY_CANONICAL_CACHE ?? `${ROOT}/runtime-cache/mitra-autonomous-factory-public`;
const TEMPLATE_DIR = process.env.FACTORY_PRODUCT_TEMPLATE_DIR ?? `${ROOT}/template`;
const MITRA_AGENT_DIR = process.env.FACTORY_MITRA_AGENT_DIR ?? `${ROOT}/mitra-agent-minimal`;
const FACTORY_DIR = `${ROOT}/workspaces/w-${WORKSPACE_ID}/p-${PROJECT_ID}`;
const GATEWAY = `${FACTORY_DIR}/backend/factory-gateway.mjs`;
const once = process.argv.includes('--once');

if (!token) throw new Error('Missing MITRA_TOKEN or MITRA_TOKEN_FILE');
configureSdkMitra({ baseURL, integrationURL, token, projectId: PROJECT_ID });

function sqlValue(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`;
}

async function q(sql) {
  const result = await runQueryMitra({ projectId: PROJECT_ID, sql });
  return result?.result?.rows ?? result?.rows ?? [];
}

async function dml(sql) {
  return runDmlMitra({ projectId: PROJECT_ID, sql });
}

function run(cmd, args, options = {}) {
  return spawnSync(cmd, args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });
}

function mustRun(cmd, args, options = {}) {
  const result = run(cmd, args, options);
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout ?? '').trim();
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

function copyDir(src, dest) {
  if (!existsSync(src)) throw new Error(`Missing directory: ${src}`);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function mitraAgentSourceDir(repoDir) {
  const vendored = `${repoDir}/mitra-agent-minimal`;
  return existsSync(`${vendored}/system_prompt.md`) && existsSync(`${vendored}/AGENTS.md`) ? vendored : MITRA_AGENT_DIR;
}

function listFiles(root, dir = root) {
  const out = [];
  for (const item of readdirSync(dir)) {
    const path = join(dir, item);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...listFiles(root, path));
    else out.push(path.slice(root.length + 1));
  }
  return out.sort();
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 64) || 'factory';
}

function parseEnvValue(content, key) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalized = line.startsWith('export ') ? line.slice(7).trim() : line;
    const index = normalized.indexOf('=');
    if (index <= 0) continue;
    const k = normalized.slice(0, index).trim();
    let v = normalized.slice(index + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k === key) return v;
  }
  return '';
}

function tokenFromSecretRef(ref) {
  if (process.env[ref]) return process.env[ref];
  const candidates = [
    `${ROOT}/secrets/${ref}.env`,
    `${ROOT}/secrets/${ref}`,
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    return parseEnvValue(content, 'TELEGRAM_BOT_TOKEN') || parseEnvValue(content, ref) || content.trim();
  }
  throw new Error(`Missing Telegram token secret ref: ${ref}`);
}

async function validateTelegramBot(secretRef, expectedBotRef) {
  const expected = String(expectedBotRef || '').replace(/^@/, '').toLowerCase();
  const botToken = tokenFromSecretRef(secretRef);
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`Telegram getMe failed for secret ref ${secretRef}: ${json.description || 'telegram_error'}`);
  const actual = String(json.result?.username || '').toLowerCase();
  if (expected && actual !== expected) {
    throw new Error(`Telegram bot mismatch for secret ref ${secretRef}: expected @${expected}, got @${actual}`);
  }
  return { username: `@${json.result?.username || ''}`, id: json.result?.id, token_status: 'present_redacted' };
}

function publicRepoSnapshot() {
  if (!/^https:\/\/github\.com\/.+\.git$/.test(PUBLIC_REPO)) {
    return { ok: false, error: `canonical repo must be public GitHub HTTPS .git URL: ${PUBLIC_REPO}` };
  }

  const refProbe = run('git', ['ls-remote', PUBLIC_REPO, `refs/heads/${PUBLIC_REF}`], { timeout: 15000 });
  const headProbe = refProbe.status === 0 && refProbe.stdout.trim()
    ? refProbe
    : run('git', ['ls-remote', PUBLIC_REPO, PUBLIC_REF], { timeout: 15000 });
  if (headProbe.status !== 0 || !headProbe.stdout.trim()) {
    return {
      ok: false,
      error: (headProbe.stderr || headProbe.stdout || `git ls-remote returned no ref for ${PUBLIC_REF}`).slice(0, 900),
    };
  }

  mkdirSync(dirname(CANON_CACHE), { recursive: true });
  if (!existsSync(`${CANON_CACHE}/.git`)) {
    const cloned = run('git', ['clone', '--depth', '1', '--branch', PUBLIC_REF, PUBLIC_REPO, CANON_CACHE], { timeout: 60000 });
    if (cloned.status !== 0) return { ok: false, error: (cloned.stderr || cloned.stdout).slice(0, 900) };
  } else {
    const fetched = run('git', ['-C', CANON_CACHE, 'fetch', '--depth', '1', 'origin', PUBLIC_REF], { timeout: 60000 });
    if (fetched.status !== 0) return { ok: false, error: (fetched.stderr || fetched.stdout).slice(0, 900) };
    const checked = run('git', ['-C', CANON_CACHE, 'checkout', '--detach', 'FETCH_HEAD'], { timeout: 30000 });
    if (checked.status !== 0) return { ok: false, error: (checked.stderr || checked.stdout).slice(0, 900) };
  }

  const head = mustRun('git', ['-C', CANON_CACHE, 'rev-parse', 'HEAD']);
  const mandatory = [
    'prompts/meta-agent.md',
    'prompts/coordinator.md',
    'prompt-manifest.json',
    'scripts/send-telegram-by-secret-ref.mjs',
    'scripts/project-telegram-bot-runner.mjs',
    'docs/portable-factory-bootstrap.md',
    'schemas/next_mission.schema.json',
    'schemas/coordinator_spawn_readiness.schema.json',
  ];
  const missing = mandatory.filter((file) => !existsSync(`${CANON_CACHE}/${file}`));
  const missingMitraMinimal = [
    'mitra-agent-minimal/system_prompt.md',
    'mitra-agent-minimal/AGENTS.md',
    'mitra-agent-minimal/CLAUDE.md',
  ].filter((file) => !existsSync(`${CANON_CACHE}/${file}`));
  missing.push(...missingMitraMinimal);
  if (missing.length) {
    return { ok: false, error: `canonical repo snapshot missing required files: ${missing.join(', ')}` };
  }
  return { ok: true, path: CANON_CACHE, head };
}

async function updateMetaStatus(row, status, nextStep, errorMessage = '') {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await dml(
    `UPDATE META_AGENT_ACTIVATION_REQUESTS SET STATUS=${sqlValue(status)}, NEXT_STEP=${sqlValue(nextStep)}, ERROR_MESSAGE=${sqlValue(errorMessage)}, UPDATED_AT=${sqlValue(now)} WHERE REQUEST_CODE=${sqlValue(row.REQUEST_CODE)}`
  );
  await dml(
    `UPDATE META_AGENTS SET STATUS=${sqlValue(status)}, UPDATED_AT=${sqlValue(now)} WHERE META_AGENT_CODE=${sqlValue(row.META_AGENT_CODE)}`
  );
}

async function updateProjectStatus(row, status, nextStep, errorMessage = '') {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const shortStatusByRegistry = {
    coordinator_tmux_started_waiting_telegram: 'coord_tmux_started',
    blocked_public_repo_unreachable: 'repo_unreachable',
    mitra_project_created_activation_requested: 'activation_requested',
  };
  const registryStatus = shortStatusByRegistry[status] ?? String(status).slice(0, 40);
  await dml(
    `UPDATE FACTORY_PROJECT_REQUESTS SET STATUS=${sqlValue(status)}, NEXT_STEP=${sqlValue(nextStep)}, ERROR_MESSAGE=${sqlValue(errorMessage)}, UPDATED_AT=${sqlValue(now)} WHERE REQUEST_CODE=${sqlValue(row.REQUEST_CODE)}`
  );
  if (row.REGISTRY_CODE) {
    await dml(`UPDATE PROJECT_REGISTRY SET STATUS=${sqlValue(registryStatus)}, UPDATED_AT=${sqlValue(now)} WHERE REGISTRY_CODE=${sqlValue(row.REGISTRY_CODE)}`);
  }
  if (row.COORDINATOR_CODE) {
    await dml(`UPDATE COORDINATOR_REGISTRY SET STATUS=${sqlValue(registryStatus)}, UPDATED_AT=${sqlValue(now)} WHERE COORDINATOR_CODE=${sqlValue(row.COORDINATOR_CODE)}`);
  }
  if (row.PROJECT_BOT_TOKEN_SECRET_REF) {
    await dml(`UPDATE WRAPPER_REGISTRY SET STATUS=${sqlValue(registryStatus)}, UPDATED_AT=${sqlValue(now)} WHERE BOT_TOKEN_ENV=${sqlValue(row.PROJECT_BOT_TOKEN_SECRET_REF)}`);
  }
}

async function insertTimeline(executionCode, coordinatorCode, title, description) {
  const rows = await q(`SELECT ID FROM EXECUTIONS WHERE EXECUTION_CODE=${sqlValue(executionCode)} ORDER BY ID DESC LIMIT 1`);
  const executionId = rows[0]?.ID ?? rows[0]?.id;
  if (!executionId) return;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const clippedDescription = String(description ?? '').slice(0, 980);
  await dml(
    `INSERT INTO TIMELINE_EVENTS (EXECUTION_ID, EVENT_AT, PHASE, ACTOR, TITLE, DESCRIPTION, KIND) VALUES (${sqlValue(executionId)}, ${sqlValue(now)}, 'Scope Discovery & Construction', ${sqlValue(coordinatorCode)}, ${sqlValue(title)}, ${sqlValue(clippedDescription)}, 'event')`
  );
}

function ensureProductProject(row, repoDir) {
  const mitraBaseDir = mitraAgentSourceDir(repoDir);
  const projectDir = row.CREATED_PROJECT_DIR || `${ROOT}/workspaces/w-${row.WORKSPACE_ID || WORKSPACE_ID}/p-${row.CREATED_PROJECT_ID}`;
  const projectId = String(row.CREATED_PROJECT_ID || '').trim();
  if (!projectId) throw new Error('Project request has no CREATED_PROJECT_ID');
  if (projectId === String(PROJECT_ID)) throw new Error('Product project id cannot be the Factory Control project id');

  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
  }
  if (!existsSync(`${projectDir}/frontend`)) {
    copyDir(`${TEMPLATE_DIR}/frontend`, `${projectDir}/frontend`);
  }
  if (!existsSync(`${projectDir}/backend`)) {
    copyDir(`${TEMPLATE_DIR}/backend`, `${projectDir}/backend`);
  }

  copyFile(`${mitraBaseDir}/AGENTS.md`, `${projectDir}/AGENTS.md`);
  copyFile(`${mitraBaseDir}/system_prompt.md`, `${projectDir}/system_prompt.md`);
  copyFile(`${mitraBaseDir}/CLAUDE.md`, `${projectDir}/CLAUDE.md`);
  copyDir(`${mitraBaseDir}/.claude`, `${projectDir}/.claude`);
  copyFile(`${repoDir}/prompts/dev.md`, `${projectDir}/dev.md`);

  const envLocal = [
    `MITRA_BASE_URL=${baseURL}`,
    `MITRA_BASE_URL_INTEGRATIONS=${integrationURL}`,
    `MITRA_TOKEN=${token}`,
    `MITRA_WORKSPACE_ID=${row.WORKSPACE_ID || WORKSPACE_ID}`,
    `MITRA_PROJECT_ID=${projectId}`,
    `MITRA_DIRECTORY=${projectDir}`,
    '',
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
      `MITRA_WORKSPACE_ID=${row.WORKSPACE_ID || WORKSPACE_ID}`,
      `MITRA_PROJECT_ID=${projectId}`,
      `MITRA_DIRECTORY=${projectDir}`,
      '',
    ].join('\n')
  );
  writeFileSync(
    `${projectDir}/.gitignore`,
    ['.env.local', '.env', 'frontend/.env', 'backend/.env', 'node_modules/', 'dist/', '.DS_Store', ''].join('\n')
  );

  if (!existsSync(`${projectDir}/.git`)) {
    mustRun('git', ['init', '-b', 'main'], { cwd: projectDir });
    mustRun('git', ['config', 'user.email', 'factory@mitra.local'], { cwd: projectDir });
    mustRun('git', ['config', 'user.name', 'Mitra Factory'], { cwd: projectDir });
  }
  const statusBefore = run('git', ['-C', projectDir, 'status', '--short']).stdout.trim();
  if (statusBefore) {
    mustRun('git', ['-C', projectDir, 'add', '.']);
    mustRun('git', ['-C', projectDir, 'commit', '-m', `Factory product scaffold for ${row.PROJECT_NAME}`]);
  }
  const head = mustRun('git', ['-C', projectDir, 'rev-parse', 'HEAD']);
  const status = run('git', ['-C', projectDir, 'status', '--short']).stdout.trim();

  return { projectDir, projectId, gitHead: head, gitStatus: status };
}

function copyCoordinatorPackage(row, repoDir, product, botReadiness) {
  const mitraBaseDir = mitraAgentSourceDir(repoDir);
  const coordinatorCode = row.COORDINATOR_CODE;
  const executionCode = row.EXECUTION_CODE;
  const coordinatorDir = `${ROOT}/coordinators/${coordinatorCode}`;
  const logsDir = `${coordinatorDir}/logs`;
  const outboxDir = `${coordinatorDir}/outbox`;
  const inboxDir = `${coordinatorDir}/inbox`;
  const missionsDir = `${coordinatorDir}/missions`;
  mkdirSync(logsDir, { recursive: true });
  mkdirSync(outboxDir, { recursive: true });
  mkdirSync(inboxDir, { recursive: true });
  mkdirSync(missionsDir, { recursive: true });

  copyDir(repoDir, `${coordinatorDir}/coordinator-git`);
  copyDir(`${repoDir}/prompts`, `${coordinatorDir}/prompts`);
  copyDir(`${repoDir}/docs`, `${coordinatorDir}/docs`);
  copyDir(`${repoDir}/schemas`, `${coordinatorDir}/schemas`);
  copyFile(`${repoDir}/prompts/coordinator.md`, `${coordinatorDir}/COORDINATOR.md`);
  copyFile(`${repoDir}/prompt-manifest.json`, `${coordinatorDir}/prompt-manifest.json`);

  copyFile(`${mitraBaseDir}/AGENTS.md`, `${coordinatorDir}/mitra-agent-minimal/AGENTS.md`);
  copyFile(`${mitraBaseDir}/system_prompt.md`, `${coordinatorDir}/mitra-agent-minimal/system_prompt.md`);
  copyFile(`${mitraBaseDir}/CLAUDE.md`, `${coordinatorDir}/mitra-agent-minimal/CLAUDE.md`);
  copyDir(`${mitraBaseDir}/.claude`, `${coordinatorDir}/mitra-agent-minimal/.claude`);

  const runtime = {
    coordinator_code: coordinatorCode,
    execution_code: executionCode,
    project_name: row.PROJECT_NAME,
    coordinator_dir: coordinatorDir,
    factory_control_project_id: String(PROJECT_ID),
    factory_control_project_dir: FACTORY_DIR,
    factory_gateway_path: GATEWAY,
    mitra_token_file: TOKEN_FILE,
    product_workspace_id: String(row.WORKSPACE_ID || WORKSPACE_ID),
    product_project_id: product.projectId,
    product_project_dir: product.projectDir,
    product_frontend_dir: `${product.projectDir}/frontend`,
    product_backend_dir: `${product.projectDir}/backend`,
    product_git_head: product.gitHead,
    project_bot_username: row.PROJECT_BOT_USERNAME || row.TELEGRAM_BOT_REF,
    project_bot_token_secret_ref: row.PROJECT_BOT_TOKEN_SECRET_REF,
    telegram_bot_get_me: botReadiness,
    coordinator_tmux_session: coordinatorCode,
    coordinator_inbox_dir: inboxDir,
    telegram_state_path: `${coordinatorDir}/telegram_state.json`,
    telegram_offset_path: `${coordinatorDir}/telegram_offset`,
    telegram_updates_path: `${ROOT}/telegram_msgs/${slug(row.PROJECT_BOT_USERNAME || row.TELEGRAM_BOT_REF)}_updates.jsonl`,
    telegram_log_path: `${logsDir}/project-telegram-bot.log`,
    telegram_payload_dir: `${coordinatorDir}/telegram_payloads`,
    canonical_repo_url: PUBLIC_REPO,
    canonical_repo_ref: PUBLIC_REF,
    canonical_repo_head: mustRun('git', ['-C', repoDir, 'rev-parse', 'HEAD']),
    coordinator_git_dir: `${coordinatorDir}/coordinator-git`,
    coordinator_prompt_path: `${coordinatorDir}/COORDINATOR.md`,
    coordinator_prompt_sha256: sha256(`${coordinatorDir}/COORDINATOR.md`),
    coordinator_prompt_bytes: bytes(`${coordinatorDir}/COORDINATOR.md`),
    required_first_action: 'read_full_coordinator_md_and_write_outbox_agent_readiness_json',
    created_at: new Date().toISOString(),
  };
  writeFileSync(`${coordinatorDir}/runtime_contract.json`, JSON.stringify(runtime, null, 2));
  writeFileSync(`${missionsDir}/runtime_contract.json`, JSON.stringify(runtime, null, 2));

  const promptFiles = listFiles(`${coordinatorDir}/prompts`).map((file) => `${coordinatorDir}/prompts/${file}`);
  const docFiles = listFiles(`${coordinatorDir}/docs`).map((file) => `${coordinatorDir}/docs/${file}`);
  const schemaFiles = listFiles(`${coordinatorDir}/schemas`).map((file) => `${coordinatorDir}/schemas/${file}`);
  const minimalFiles = listFiles(`${coordinatorDir}/mitra-agent-minimal`).map((file) => `${coordinatorDir}/mitra-agent-minimal/${file}`);
  const evidenceFiles = [
    `${coordinatorDir}/COORDINATOR.md`,
    `${coordinatorDir}/runtime_contract.json`,
    `${coordinatorDir}/prompt-manifest.json`,
    ...promptFiles,
    ...docFiles,
    ...schemaFiles,
    ...minimalFiles,
  ];

  const packageReadiness = {
    prepared_by: 'factory_vps_activator',
    purpose: 'coordinator_package_from_public_github',
    coordinator_code: coordinatorCode,
    execution_code: executionCode,
    canonical_repo_url: PUBLIC_REPO,
    canonical_repo_ref: PUBLIC_REF,
    canonical_repo_head: runtime.canonical_repo_head,
    product_project_id: product.projectId,
    product_project_dir: product.projectDir,
    product_git_head: product.gitHead,
    product_git_status_short: product.gitStatus,
    files: evidenceFiles.map((path) => ({ path, sha256: sha256(path), bytes: bytes(path) })),
    prompt_count: promptFiles.length,
    docs_count: docFiles.length,
    schemas_count: schemaFiles.length,
    mitra_agent_minimal_count: minimalFiles.length,
    note: 'The live Coordinator must still write outbox/agent_readiness.json after reading COORDINATOR.md in tmux.',
  };
  writeFileSync(`${outboxDir}/coordinator_package_readiness.json`, JSON.stringify(packageReadiness, null, 2));

  const spawnReadiness = {
    coordinator_code: coordinatorCode,
    execution_code: executionCode,
    factory_control_project_dir: FACTORY_DIR,
    factory_gateway_path: GATEWAY,
    product_workspace_id: String(row.WORKSPACE_ID || WORKSPACE_ID),
    product_project_id: product.projectId,
    product_project_dir: product.projectDir,
    product_frontend_dir: `${product.projectDir}/frontend`,
    product_backend_dir: `${product.projectDir}/backend`,
    project_is_not_factory: product.projectId !== String(PROJECT_ID),
    project_has_frontend_backend: existsSync(`${product.projectDir}/frontend`) && existsSync(`${product.projectDir}/backend`),
    project_has_git: existsSync(`${product.projectDir}/.git`),
    project_has_mitra_agent_files: existsSync(`${product.projectDir}/AGENTS.md`) && existsSync(`${product.projectDir}/system_prompt.md`),
    runtime_contract_path: `${coordinatorDir}/runtime_contract.json`,
    coordinator_prompt_path: `${coordinatorDir}/COORDINATOR.md`,
    coordinator_package_path: coordinatorDir,
    tmux_session: coordinatorCode,
    first_message_is_natural_user_request_only: true,
    simulation: false,
  };
  writeFileSync(`${coordinatorDir}/coordinator_spawn_readiness.json`, JSON.stringify(spawnReadiness, null, 2));

  const bootPrompt = [
    'Leia COORDINATOR.md inteiro antes de agir.',
    'Depois escreva outbox/agent_readiness.json com agent_type=coordinator, prompt_path, prompt_sha256, prompt_bytes, read_complete=true, runtime_contract_loaded=true.',
    'Use runtime_contract.json. Aguarde mensagens reais do Telegram do bot do projeto; nao invente usuario.',
    'Todo evento e toda proxima missao precisam passar pelo Sistema Central via factory-gateway.mjs.',
    'O Meta-Agent nao e Coordenador desta run.',
  ].join('\n');
  writeFileSync(`${coordinatorDir}/boot_prompt.md`, `${bootPrompt}\n`);

  return { coordinatorDir, runtimePath: `${coordinatorDir}/runtime_contract.json`, packageReadiness, spawnReadiness };
}

function startTmuxIfMissing(session, cwd, command, logLabel) {
  const hasSession = run('tmux', ['has-session', '-t', session]);
  if (hasSession.status === 0) return { started: false, exists: true, session };
  const started = run('tmux', ['new-session', '-d', '-s', session, command], { cwd });
  if (started.status !== 0) throw new Error(`${logLabel} tmux start failed: ${started.stderr || started.stdout}`);
  const check = run('tmux', ['has-session', '-t', session]);
  if (check.status !== 0) throw new Error(`${logLabel} tmux did not stay alive: ${check.stderr || check.stdout}`);
  return { started: true, exists: true, session };
}

function startCodexTmuxIfMissing(session, cwd, promptFile, logFile, logLabel) {
  const hasSession = run('tmux', ['has-session', '-t', session]);
  if (hasSession.status === 0) return { started: false, exists: true, session };

  const command = `codex --dangerously-bypass-approvals-and-sandbox -m gpt-5.5 -C ${shellQuote(cwd)}`;
  const started = run('tmux', ['new-session', '-d', '-s', session, '-c', cwd, command], { cwd });
  if (started.status !== 0) throw new Error(`${logLabel} tmux start failed: ${started.stderr || started.stdout}`);

  const check = run('tmux', ['has-session', '-t', session]);
  if (check.status !== 0) throw new Error(`${logLabel} tmux did not stay alive: ${check.stderr || check.stdout}`);

  run('tmux', ['pipe-pane', '-o', '-t', session, `cat >> ${shellQuote(logFile)}`]);
  const bufferName = `${slug(session).slice(0, 60)}_boot`;
  const loaded = run('tmux', ['load-buffer', '-b', bufferName, promptFile]);
  if (loaded.status !== 0) throw new Error(`${logLabel} boot prompt load failed: ${loaded.stderr || loaded.stdout}`);
  const pasted = run('tmux', ['paste-buffer', '-b', bufferName, '-t', session]);
  if (pasted.status !== 0) throw new Error(`${logLabel} boot prompt paste failed: ${pasted.stderr || pasted.stdout}`);
  run('tmux', ['send-keys', '-t', session, 'Enter']);
  return { started: true, exists: true, session };
}

async function activateMetaAgent(row, repo) {
  try {
    await validateTelegramBot(row.BOT_TOKEN_SECRET_REF, row.BOT_USERNAME);
    const mitraBaseDir = mitraAgentSourceDir(repo.path);
    const metaAgentDir = row.META_AGENT_DIR;
    const logsDir = `${metaAgentDir}/logs`;
    const outboxDir = `${metaAgentDir}/outbox`;
    mkdirSync(logsDir, { recursive: true });
    mkdirSync(outboxDir, { recursive: true });

    const sourcePrompt = `${repo.path}/prompts/meta-agent.md`;
    const localPrompt = `${metaAgentDir}/META_AGENT.md`;
    copyDir(repo.path, `${metaAgentDir}/meta-agent-git`);
    copyDir(`${repo.path}/prompts`, `${metaAgentDir}/prompts`);
    copyDir(`${repo.path}/docs`, `${metaAgentDir}/docs`);
    copyDir(`${repo.path}/schemas`, `${metaAgentDir}/schemas`);
    copyFile(sourcePrompt, localPrompt);
    copyFile(`${repo.path}/prompts/coordinator.md`, `${metaAgentDir}/COORDINATOR.md`);
    copyFile(`${repo.path}/prompt-manifest.json`, `${metaAgentDir}/prompt-manifest.json`);
    copyFile(`${repo.path}/scripts/send-telegram-by-secret-ref.mjs`, `${metaAgentDir}/send-telegram-by-secret-ref.mjs`);
    copyFile(`${mitraBaseDir}/AGENTS.md`, `${metaAgentDir}/mitra-agent-minimal/AGENTS.md`);
    copyFile(`${mitraBaseDir}/system_prompt.md`, `${metaAgentDir}/mitra-agent-minimal/system_prompt.md`);
    copyFile(`${mitraBaseDir}/CLAUDE.md`, `${metaAgentDir}/mitra-agent-minimal/CLAUDE.md`);
    copyDir(`${mitraBaseDir}/.claude`, `${metaAgentDir}/mitra-agent-minimal/.claude`);

    const runtime = {
      meta_agent_code: row.META_AGENT_CODE,
      bot_username: row.BOT_USERNAME,
      bot_token_secret_ref: row.BOT_TOKEN_SECRET_REF,
      meta_agent_dir: metaAgentDir,
      tmux_session: row.TMUX_SESSION,
      prompt_path: localPrompt,
      prompt_sha256: sha256(localPrompt),
      prompt_bytes: bytes(localPrompt),
      coordinator_context_dir: `${metaAgentDir}/meta-agent-git`,
      coordinator_prompt_path: `${metaAgentDir}/COORDINATOR.md`,
      coordinator_prompt_sha256: sha256(`${metaAgentDir}/COORDINATOR.md`),
      coordinator_prompt_bytes: bytes(`${metaAgentDir}/COORDINATOR.md`),
      mitra_agent_minimal_dir: `${metaAgentDir}/mitra-agent-minimal`,
      has_full_coordinator_context: true,
      canonical_repo_url: PUBLIC_REPO,
      canonical_repo_ref: PUBLIC_REF,
      canonical_repo_head: repo.head,
      send_telegram_command: `node ${metaAgentDir}/send-telegram-by-secret-ref.mjs ${row.BOT_TOKEN_SECRET_REF} <chat_id> <message>`,
      created_at: new Date().toISOString(),
    };
    writeFileSync(`${metaAgentDir}/runtime_contract.json`, JSON.stringify(runtime, null, 2));
    writeFileSync(`${metaAgentDir}/heartbeat.json`, JSON.stringify({ status: 'booting', at: new Date().toISOString(), tmux_session: row.TMUX_SESSION }, null, 2));

    const bootPrompt = [
      'Leia META_AGENT.md inteiro antes de agir.',
      'Leia tambem COORDINATOR.md, prompt-manifest.json, docs/, schemas/ e mitra-agent-minimal/ para entender como a fabrica desenvolve no Mitra.',
      'Depois escreva outbox/agent_readiness.json com agent_type=meta_agent, prompt_path, prompt_sha256, prompt_bytes, coordinator_context_loaded=true, mitra_agent_minimal_loaded=true, read_complete=true.',
      'Use runtime_contract.json para Telegram, paths e limites.',
      'Voce e o Meta-Agent desta fabrica. Nao seja Coordenador de run. Aguarde mensagens do Telegram ou instrucoes do Flavio.',
    ].join('\n');
    writeFileSync(`${metaAgentDir}/boot_prompt.md`, `${bootPrompt}\n`);

    writeFileSync(`${logsDir}/meta-agent-tmux.log`, `${new Date().toISOString()} meta-agent tmux starting\n`, { flag: 'a' });
    startCodexTmuxIfMissing(row.TMUX_SESSION, metaAgentDir, `${metaAgentDir}/boot_prompt.md`, `${logsDir}/meta-agent-codex.log`, 'meta-agent');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await dml(
      `UPDATE META_AGENTS SET STATUS='tmux_started_reading_prompt', PROMPT_SHA256=${sqlValue(runtime.prompt_sha256)}, HEARTBEAT_PATH=${sqlValue(`${metaAgentDir}/heartbeat.json`)}, UPDATED_AT=${sqlValue(now)} WHERE META_AGENT_CODE=${sqlValue(row.META_AGENT_CODE)}`
    );
    await dml(
      `UPDATE META_AGENT_ACTIVATION_REQUESTS SET STATUS='tmux_started_reading_prompt', NEXT_STEP='Meta-Agent tmux criado; aguardar outbox/agent_readiness.json.', UPDATED_AT=${sqlValue(now)} WHERE REQUEST_CODE=${sqlValue(row.REQUEST_CODE)}`
    );
    return { ok: true, type: 'meta_agent', meta_agent_code: row.META_AGENT_CODE, tmux_session: row.TMUX_SESSION, meta_agent_dir: metaAgentDir };
  } catch (error) {
    await updateMetaStatus(row, 'failed_activation', 'Corrigir erro e reenviar ativacao.', error?.message ?? String(error));
    return { ok: false, type: 'meta_agent', meta_agent_code: row.META_AGENT_CODE, error: error?.message ?? String(error) };
  }
}

async function activateProject(row, repo) {
  try {
    const botReadiness = await validateTelegramBot(row.PROJECT_BOT_TOKEN_SECRET_REF, row.PROJECT_BOT_USERNAME || row.TELEGRAM_BOT_REF);
    const product = ensureProductProject(row, repo.path);
    const coordinator = copyCoordinatorPackage(row, repo.path, product, botReadiness);

    writeFileSync(`${coordinator.coordinatorDir}/logs/coordinator-tmux.log`, `${new Date().toISOString()} coordinator tmux starting\n`, { flag: 'a' });
    startCodexTmuxIfMissing(row.COORDINATOR_CODE, coordinator.coordinatorDir, `${coordinator.coordinatorDir}/boot_prompt.md`, `${coordinator.coordinatorDir}/logs/coordinator-codex.log`, 'coordinator');

    const botSession = `bot_${slug(row.COORDINATOR_CODE).slice(0, 110)}`;
    const botCmd = [
      `cd ${shellQuote(coordinator.coordinatorDir)}`,
      'umask 077',
      `node ${shellQuote(`${repo.path}/scripts/project-telegram-bot-runner.mjs`)} --runtime ${shellQuote(coordinator.runtimePath)} 2>&1 | tee -a logs/project-telegram-bot.stdout.log`,
    ].join(' && ');
    startTmuxIfMissing(botSession, coordinator.coordinatorDir, botCmd, 'project-bot');

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await dml(
      `UPDATE EXECUTIONS SET LAST_EVENT='Coordenador ativado em tmux pelo VPS activator', NEXT_MISSION='Aguardar primeira mensagem real no bot do projeto', BLOCKERS='', ATUALIZADO_EM=${sqlValue(now)} WHERE EXECUTION_CODE=${sqlValue(row.EXECUTION_CODE)}`
    );
    await updateProjectStatus(
      row,
      'coordinator_tmux_started_waiting_telegram',
      'Coordenador e runner Telegram iniciados; enviar primeira mensagem real ao bot do projeto.'
    );
    await insertTimeline(
      row.EXECUTION_CODE,
      row.COORDINATOR_CODE,
      'Coordenador ativado em tmux',
      `Coordenador ${row.COORDINATOR_CODE} criado em pasta nova, pacote copiado do GitHub publico e runner Telegram ${botSession} iniciado.`
    );

    return {
      ok: true,
      type: 'project',
      request_code: row.REQUEST_CODE,
      coordinator_code: row.COORDINATOR_CODE,
      execution_code: row.EXECUTION_CODE,
      product_project_id: product.projectId,
      product_project_dir: product.projectDir,
      coordinator_dir: coordinator.coordinatorDir,
      coordinator_tmux: row.COORDINATOR_CODE,
      project_bot_tmux: botSession,
    };
  } catch (error) {
    await updateProjectStatus(row, 'failed_activation', 'Corrigir erro e reexecutar ativador.', error?.message ?? String(error));
    return { ok: false, type: 'project', request_code: row.REQUEST_CODE, coordinator_code: row.COORDINATOR_CODE, error: error?.message ?? String(error) };
  }
}

async function processPending() {
  const metaRows = await q(
    "SELECT REQUEST_CODE, BOT_USERNAME, BOT_TOKEN_SECRET_REF, META_AGENT_CODE, META_AGENT_DIR, TMUX_SESSION, PROMPT_PATH, STATUS FROM META_AGENT_ACTIVATION_REQUESTS WHERE STATUS IN ('activation_requested','blocked_public_repo_unreachable') ORDER BY ID ASC LIMIT 5"
  );
  const projectRows = await q(
    "SELECT REQUEST_CODE, IDEMPOTENCY_KEY, INSTANCE_CODE, PROJECT_NAME, TELEGRAM_BOT_REF, PROJECT_BOT_USERNAME, PROJECT_BOT_TOKEN_SECRET_REF, STATUS, WORKSPACE_ID, CREATED_PROJECT_ID, CREATED_PROJECT_DIR, REGISTRY_CODE, COORDINATOR_CODE, EXECUTION_CODE, NEXT_STEP, ERROR_MESSAGE, CREATED_AT, UPDATED_AT FROM FACTORY_PROJECT_REQUESTS WHERE STATUS IN ('mitra_project_created_activation_requested','blocked_public_repo_unreachable') ORDER BY ID ASC LIMIT 5"
  );
  const rows = [...metaRows, ...projectRows];
  if (!rows.length) return { ok: true, processed: 0, results: [] };

  const repo = publicRepoSnapshot();
  if (!repo.ok) {
    const nextStep = `Tornar ${PUBLIC_REPO} publico e contendo os arquivos canonicos; reexecutar ativador.`;
    const results = [];
    for (const row of metaRows) {
      await updateMetaStatus(row, 'blocked_public_repo_unreachable', nextStep, repo.error);
      results.push({ ok: false, type: 'meta_agent', blocked: 'public_repo_unreachable', code: row.META_AGENT_CODE });
    }
    for (const row of projectRows) {
      await updateProjectStatus(row, 'blocked_public_repo_unreachable', nextStep, repo.error);
      results.push({ ok: false, type: 'project', blocked: 'public_repo_unreachable', code: row.COORDINATOR_CODE });
    }
    return { ok: false, processed: rows.length, results, public_repo_error: repo.error };
  }

  const results = [];
  for (const row of metaRows) results.push(await activateMetaAgent(row, repo));
  for (const row of projectRows) results.push(await activateProject(row, repo));
  return { ok: results.every((item) => item.ok), processed: results.length, canonical_repo_head: repo.head, results };
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  if (once) {
    console.log(JSON.stringify(await processPending(), null, 2));
    return;
  }
  while (true) {
    const result = await processPending();
    console.log(JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2));
    await sleep(15000);
  }
}

await main();
