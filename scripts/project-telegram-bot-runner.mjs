#!/usr/bin/env node
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function arg(name, fallback = '') {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2));
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
    `/opt/mitra-factory/secrets/${ref}.env`,
    `/opt/mitra-factory/secrets/${ref}`,
  ];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const content = readFileSync(file, 'utf8');
    return parseEnvValue(content, 'TELEGRAM_BOT_TOKEN') || parseEnvValue(content, ref) || content.trim();
  }
  throw new Error(`Missing Telegram token secret ref: ${ref}`);
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function isGreeting(text) {
  const normalized = String(text ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /^(oi|ola|opa|bom dia|boa tarde|boa noite)[!. ]*$/i.test(normalized);
}

function nextResponse(text, state) {
  const answer = cleanText(text);
  const lower = answer.toLowerCase();

  if (!state.greeted && isGreeting(answer)) {
    return {
        text: 'oi',
      nextStage: 'greeted',
      followUpRequired: true,
      inputMode: 'greeting',
      intakePatch: { greeted: true },
    };
  }

  if (!state.projectBrief) {
    if (answer.length < 12) {
      return {
        text: 'Qual sistema voce quer que eu construa?',
        nextStage: 'waiting_project_brief',
        followUpRequired: true,
        inputMode: 'missing_project_brief',
        intakePatch: {},
      };
    }
    return {
      text: 'Quem vai usar esse sistema e quais sao os 3 fluxos que precisam funcionar primeiro?',
      nextStage: 'waiting_audience_flows',
      followUpRequired: true,
      inputMode: 'project_brief',
      intakePatch: { projectBrief: answer },
    };
  }

  if (!state.audienceFlows) {
    return {
      text: 'Existe algum sistema referencia para eu replicar ou evitar?',
      nextStage: 'waiting_reference',
      followUpRequired: true,
      inputMode: 'audience_and_flows',
      intakePatch: { audienceFlows: answer },
    };
  }

  if (!state.referenceProduct) {
    const normalizedLower = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const hasNoReference = /(nao|sem|nenhum|nao tem)/i.test(normalizedLower);
    return {
      text: 'Quais dados principais esse sistema precisa guardar?',
      nextStage: 'waiting_entities',
      followUpRequired: true,
      inputMode: hasNoReference ? 'no_reference_product' : 'reference_product',
      intakePatch: { referenceProduct: answer },
    };
  }

  if (!state.entities) {
    return {
      text: 'Fechado. Vou montar o intake com isso.',
      nextStage: 'intake_complete',
      followUpRequired: false,
      inputMode: 'entities_and_data',
      intakePatch: { entities: answer, intakeComplete: true },
    };
  }

  return {
    text: 'Recebi. Vou considerar isso no intake.',
    nextStage: 'intake_complete',
    followUpRequired: false,
    inputMode: 'scope_change',
    intakePatch: { lastExtra: answer },
  };
}

const runtimePath = arg('runtime');
if (!runtimePath) {
  console.error('Usage: project-telegram-bot-runner.mjs --runtime <runtime_contract.json> [--once] [--minutes N]');
  process.exit(2);
}

const runtime = JSON.parse(readFileSync(runtimePath, 'utf8'));
const token = tokenFromSecretRef(runtime.project_bot_token_secret_ref);
const botUsername = String(runtime.project_bot_username || runtime.bot_username || '').replace(/^@/, '');
const botRef = botUsername ? `@${botUsername}` : '';
const stateFile = runtime.telegram_state_path || resolve(dirname(runtimePath), 'telegram_state.json');
const offsetFile = runtime.telegram_offset_path || resolve(dirname(runtimePath), 'telegram_offset');
const updatesFile = runtime.telegram_updates_path || resolve(dirname(runtimePath), 'telegram_updates.jsonl');
const logFile = runtime.telegram_log_path || resolve(dirname(runtimePath), 'logs/project-telegram-bot.log');
const payloadDir = runtime.telegram_payload_dir || resolve(dirname(runtimePath), 'telegram_payloads');
const gatewayPath = runtime.factory_gateway_path;
const allowedUserId = String(runtime.allowed_telegram_user_id || process.env.FACTORY_ALLOWED_TELEGRAM_USER_ID || '').trim();

mkdirSync(dirname(stateFile), { recursive: true });
mkdirSync(dirname(offsetFile), { recursive: true });
mkdirSync(dirname(updatesFile), { recursive: true });
mkdirSync(dirname(logFile), { recursive: true });
mkdirSync(payloadDir, { recursive: true });

function log(message, extra = {}) {
  appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), message, ...extra }) + '\n');
}

function loadOffset() {
  try {
    return Number(readFileSync(offsetFile, 'utf8').trim()) || 0;
  } catch {
    return 0;
  }
}

function saveOffset(offset) {
  writeFileSync(offsetFile, String(offset));
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.description || 'telegram_error'}`);
  return json.result;
}

async function validateBot() {
  const me = await telegram('getMe', {});
  const actual = String(me.username || '');
  if (botUsername && actual.toLowerCase() !== botUsername.toLowerCase()) {
    throw new Error(`Telegram bot username mismatch: expected ${botRef}, got @${actual}`);
  }
  return { id: me.id, username: actual, first_name: me.first_name };
}

async function getUpdates(offset, timeout) {
  return telegram('getUpdates', { offset, timeout, limit: 10, allowed_updates: ['message'] });
}

async function sendMessage(chatId, text) {
  return telegram('sendMessage', {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });
}

function gatewayExchange(payload) {
  const safeId = String(payload.idempotency_key).replace(/[^a-zA-Z0-9_.:-]/g, '_');
  const file = resolve(payloadDir, `${safeId}.json`);
  writeJson(file, payload);
  const result = spawnSync(process.execPath, [gatewayPath, 'exchange', '--file', file], {
    cwd: dirname(gatewayPath),
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      MITRA_PROJECT_ID: runtime.factory_control_project_id || '46955',
      MITRA_TOKEN_FILE: runtime.mitra_token_file || process.env.MITRA_TOKEN_FILE || '/tmp/mitra_project_token_current',
      FACTORY_AUTO_DEPLOY_LIVE_STATE: '0',
    },
  });
  if (result.status !== 0) {
    throw new Error(`factory-gateway exchange failed: ${result.stderr || result.stdout}`);
  }
  const parsed = JSON.parse(result.stdout);
  writeJson(resolve(payloadDir, `${safeId}.response.json`), parsed);
  return parsed;
}

function basePayload({ eventType, direction, title, summary, idempotencyKey, body }) {
  return {
    event_type: eventType,
    coordinator_code: runtime.coordinator_code,
    execution_code: runtime.execution_code,
    direction,
    phase: 'Scope Discovery & Construction',
    title,
    summary,
    idempotency_key: idempotencyKey,
    payload: {
      source: 'telegram_project_bot',
      bot_username: botUsername,
      bot_ref: botRef,
      product_workspace_id: runtime.product_workspace_id,
      product_project_id: runtime.product_project_id,
      product_project_dir: runtime.product_project_dir,
      ...body,
    },
  };
}

function appendRawUpdate(update, msg) {
  appendFileSync(
    updatesFile,
    JSON.stringify({
      source_bot: botUsername,
      update_id: update.update_id,
      message_id: msg.message_id,
      date: new Date(msg.date * 1000).toISOString(),
      chat_id: String(msg.chat.id),
      user_id: String(msg.from?.id ?? ''),
      username: msg.from?.username ?? '',
      first_name: msg.from?.first_name ?? '',
      text: msg.text ?? '',
      raw: update,
    }) + '\n'
  );
}

function persistInbound(update, msg, text, state) {
  const eventType = state.projectBrief || state.greeted ? 'intake_answer' : 'user_message_received';
  return gatewayExchange(basePayload({
    eventType,
    direction: 'inbound',
    title: eventType === 'user_message_received' ? `Mensagem Telegram recebida no ${botRef}` : `Resposta de intake recebida no ${botRef}`,
    summary: `Mensagem real recebida no ${botRef}: ${text}`,
    idempotencyKey: `${botUsername}:${update.update_id}:${msg.message_id}`,
    body: {
      update_id: update.update_id,
      message_id: msg.message_id,
      chat_id: String(msg.chat.id),
      user_id: String(msg.from?.id ?? ''),
      username: msg.from?.username ?? '',
      first_name: msg.from?.first_name ?? '',
      text,
      received_at: new Date(msg.date * 1000).toISOString(),
      intake_stage_before: state.stage ?? 'new',
    },
  }));
}

function persistClassification(update, msg, text, decision, nextState) {
  return gatewayExchange(basePayload({
    eventType: 'intake_classified',
    direction: 'internal',
    title: decision.followUpRequired ? 'Intake classificado com follow-up necessario' : 'Intake classificado como completo',
    summary: decision.followUpRequired
      ? `Classificacao silenciosa gerou proxima pergunta natural: ${decision.text}`
      : 'Classificacao silenciosa encerrou a coleta inicial de intake.',
    idempotencyKey: `${botUsername}:classify:${update.update_id}:${msg.message_id}`,
    body: {
      update_id: update.update_id,
      message_id: msg.message_id,
      text,
      input_mode: decision.inputMode,
      follow_up_required: decision.followUpRequired,
      next_question: decision.followUpRequired ? decision.text : '',
      intake_stage_after: decision.nextStage,
      current_intake: {
        project_brief: nextState.projectBrief ?? '',
        audience_flows: nextState.audienceFlows ?? '',
        reference_product: nextState.referenceProduct ?? '',
        entities: nextState.entities ?? '',
        complete: Boolean(nextState.intakeComplete),
      },
    },
  }));
}

function persistOutbound(sent, replyText, decision, inboundIdempotencyKey) {
  const eventType = decision.followUpRequired && replyText !== 'oi' ? 'followup_question_sent' : 'telegram_response_sent';
  return gatewayExchange(basePayload({
    eventType,
    direction: 'outbound',
    title: replyText === 'oi' ? `Resposta natural de saudacao enviada pelo ${botRef}` : `Resposta natural enviada pelo ${botRef}`,
    summary: `Bot ${botRef} respondeu ao usuario: ${replyText}`,
    idempotencyKey: `${botUsername}:outbound:${sent.message_id}`,
    body: {
      chat_id: String(sent.chat.id),
      message_id: sent.message_id,
      text: replyText,
      sent_at: new Date(sent.date * 1000).toISOString(),
      responds_to_inbound_idempotency_key: inboundIdempotencyKey,
      follow_up_required: decision.followUpRequired,
      intake_stage_after: decision.nextStage,
    },
  }));
}

function notifyCoordinatorTmux(update, msg, text, decision) {
  const session = runtime.coordinator_tmux_session || runtime.coordinator_code;
  const inboxDir = runtime.coordinator_inbox_dir || resolve(dirname(runtimePath), 'inbox');
  mkdirSync(inboxDir, { recursive: true });
  const file = resolve(inboxDir, `telegram_${update.update_id}_${msg.message_id}.md`);
  const body = [
    '# Telegram Message',
    '',
    `received_at: ${new Date(msg.date * 1000).toISOString()}`,
    `bot: ${botRef}`,
    `chat_id: ${String(msg.chat.id)}`,
    `user_id: ${String(msg.from?.id ?? '')}`,
    `message_id: ${msg.message_id}`,
    `update_id: ${update.update_id}`,
    `intake_stage_after_runner: ${decision.nextStage}`,
    `runner_reply_sent: ${decision.text}`,
    '',
    '## User Text',
    '',
    text,
    '',
    '## Required Coordinator Action',
    '',
    'Read this real Telegram message, read the latest next_mission from the Central System, and continue only by registering append-only events through factory-gateway.mjs.',
    '',
  ].join('\n');
  writeFileSync(file, body);

  const prompt = `Mensagem real do Telegram recebida. Leia ${file}, runtime_contract.json e a ultima next_mission no Sistema Central; nao invente contexto e registre o proximo evento pelo factory-gateway.mjs.`;
  const loaded = spawnSync('tmux', ['load-buffer', '-b', `${session}_telegram_msg`, '-'], {
    input: prompt,
    encoding: 'utf8',
  });
  if (loaded.status !== 0) {
    log('coordinator_tmux_notify_failed', { session, file, error: loaded.stderr || loaded.stdout });
    return { ok: false, file, error: loaded.stderr || loaded.stdout };
  }
  const pasted = spawnSync('tmux', ['paste-buffer', '-t', session, '-b', `${session}_telegram_msg`], { encoding: 'utf8' });
  if (pasted.status !== 0) {
    log('coordinator_tmux_notify_failed', { session, file, error: pasted.stderr || pasted.stdout });
    return { ok: false, file, error: pasted.stderr || pasted.stdout };
  }
  spawnSync('tmux', ['send-keys', '-t', session, 'Enter'], { encoding: 'utf8' });
  log('coordinator_tmux_notified', { session, file });
  return { ok: true, file, session };
}

async function handleUpdate(update, state) {
  const msg = update.message;
  if (!msg?.text) return state;
  const userId = String(msg.from?.id ?? '');
  if (allowedUserId && userId !== allowedUserId) return state;

  const text = cleanText(msg.text);
  appendRawUpdate(update, msg);

  const inboundKey = `${botUsername}:${update.update_id}:${msg.message_id}`;
  const inbound = persistInbound(update, msg, text, state);
  const decision = nextResponse(text, state);
  const nextState = {
    ...state,
    ...decision.intakePatch,
    stage: decision.nextStage,
    lastInbound: { updateId: update.update_id, messageId: msg.message_id, text, at: new Date().toISOString() },
  };
  const classification = persistClassification(update, msg, text, decision, nextState);
  const sent = await sendMessage(String(msg.chat.id), decision.text);
  const outbound = persistOutbound(sent, decision.text, decision, inboundKey);
  const coordinatorNotify = notifyCoordinatorTmux(update, msg, text, decision);

  log('processed_message', {
    update_id: update.update_id,
    message_id: msg.message_id,
    reply_message_id: sent.message_id,
    reply_text: decision.text,
    inbound_next_mission: inbound.next_mission?.title,
    classification_next_mission: classification.next_mission?.title,
    outbound_next_mission: outbound.next_mission?.title,
    coordinator_notify_ok: coordinatorNotify.ok,
    coordinator_inbox_file: coordinatorNotify.file,
  });

  return {
    ...nextState,
    lastOutbound: { messageId: sent.message_id, text: decision.text, at: new Date().toISOString() },
    processedCount: Number(state.processedCount ?? 0) + 1,
  };
}

async function runOnce(timeout = 20) {
  let offset = loadOffset();
  let state = readJson(stateFile, { stage: 'new', greeted: false, intakeComplete: false, processedCount: 0 });
  const updates = await getUpdates(offset, timeout);
  for (const update of updates) {
    offset = Math.max(offset, Number(update.update_id) + 1);
    state = await handleUpdate(update, state);
  }
  saveOffset(offset);
  writeJson(stateFile, state);
  return { processed: updates.length, offset, state };
}

async function main() {
  const me = await validateBot();
  log('runner_started', { once: hasFlag('once'), bot_username: me.username, runtime_path: runtimePath });
  writeJson(resolve(dirname(runtimePath), 'telegram_bot_readiness.json'), {
    ok: true,
    bot_username: `@${me.username}`,
    runtime_path: runtimePath,
    token_status: 'present_redacted',
    gateway_path: gatewayPath,
    started_at: new Date().toISOString(),
  });

  if (hasFlag('once')) {
    const result = await runOnce(1);
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
    return;
  }

  const minutesArg = arg('minutes', '');
  const until = minutesArg ? Date.now() + Math.max(1, Number(minutesArg)) * 60 * 1000 : Number.POSITIVE_INFINITY;
  while (Date.now() < until) {
    await runOnce(20);
  }
  log('runner_finished', { minutes: minutesArg || 'continuous' });
  console.log(JSON.stringify({ ok: true, finished: true, minutes: minutesArg || 'continuous' }, null, 2));
}

main().catch((error) => {
  log('runner_error', { error: error?.message ?? String(error) });
  console.error(JSON.stringify({ ok: false, error: error?.message ?? String(error) }, null, 2));
  process.exit(1);
});
