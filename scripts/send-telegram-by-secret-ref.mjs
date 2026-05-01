#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const secretRef = process.argv[2];
const chatId = process.argv[3];
const message = process.argv.slice(4).join(' ');

if (!secretRef || !chatId || !message) {
  console.error('Usage: send-telegram-by-secret-ref.mjs <SECRET_REF> <CHAT_ID> <message>');
  process.exit(2);
}

function parseEnv(content, key) {
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
    return parseEnv(content, 'TELEGRAM_BOT_TOKEN') || parseEnv(content, ref) || content.trim();
  }
  throw new Error(`Missing Telegram token secret ref: ${ref}`);
}

const token = tokenFromSecretRef(secretRef);
const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: chatId,
    text: message,
    disable_web_page_preview: true,
  }),
});

const json = await response.json();
if (!json.ok) {
  console.error(JSON.stringify({ ok: false, error: json.description || json }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, message_id: json.result?.message_id }, null, 2));
