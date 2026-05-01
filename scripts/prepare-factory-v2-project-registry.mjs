#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configureSdkMitra, runDdlMitra, runDmlMitra, runQueryMitra } from 'mitra-sdk';

const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: prepare-factory-v2-project-registry.mjs <factory-instance-config.json> [--execute]');
  process.exit(2);
}

const execute = process.argv.includes('--execute');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const scriptDir = dirname(new URL(import.meta.url).pathname);
const validator = resolve(scriptDir, 'validate-factory-instance-config.mjs');
const validation = spawnSync(process.execPath, [validator, configPath], { encoding: 'utf8' });
if (validation.status !== 0) {
  process.stderr.write(validation.stderr);
  process.stderr.write(validation.stdout);
  process.exit(validation.status ?? 1);
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

function esc(value) {
  return String(value ?? '').replaceAll("'", "''");
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${esc(value)}'`;
}

function insertSql(table, data) {
  const keys = Object.keys(data);
  return `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map((key) => sqlValue(data[key])).join(', ')})`;
}

function updateSql(table, keyColumn, keyValue, data) {
  const assignments = Object.entries(data)
    .filter(([key]) => key !== keyColumn)
    .map(([key, value]) => `${key} = ${sqlValue(value)}`)
    .join(', ');
  return `UPDATE ${table} SET ${assignments} WHERE ${keyColumn} = ${sqlValue(keyValue)}`;
}

async function q(sql) {
  return runQueryMitra({ projectId, sql });
}

async function dml(sql) {
  return runDmlMitra({ projectId, sql });
}

async function ddl(sql) {
  return runDdlMitra({ projectId, sql });
}

async function countWhere(table, column, value) {
  const result = await q(`SELECT COUNT(*) AS CNT FROM ${table} WHERE ${column} = ${sqlValue(value)}`);
  return Number(result?.result?.rows?.[0]?.CNT ?? 0);
}

async function upsert(table, keyColumn, data) {
  const keyValue = data[keyColumn];
  if (!execute) return { table, key: keyValue, action: 'would_upsert' };
  const count = await countWhere(table, keyColumn, keyValue);
  if (count > 0) {
    await dml(updateSql(table, keyColumn, keyValue, data));
    return { table, key: keyValue, action: 'updated' };
  }
  await dml(insertSql(table, data));
  return { table, key: keyValue, action: 'inserted' };
}

async function safeDdl(sql) {
  if (!execute) return { action: 'would_apply_ddl' };
  try {
    await ddl(sql);
    return { action: 'ddl_applied' };
  } catch (error) {
    const msg = String(error?.message?.message ?? error?.message ?? error);
    if (/exist|already|duplicate/i.test(msg)) return { action: 'ddl_already_exists' };
    throw error;
  }
}

function optionalJson(path) {
  try {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  } catch {}
  return null;
}

const env = parseEnvFile(config.mitra.env_file);
const token = env[config.mitra.token_env] || process.env[config.mitra.token_env];
const projectId = Number(config.factory_control_project.project_id);
const workspaceId = String(config.mitra.workspace_id);
const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

configureSdkMitra({
  baseURL: config.mitra.base_url,
  integrationURL: config.mitra.integrations_url,
  token,
  projectId,
});

const productSmoke = optionalJson('/opt/mitra-factory/output/factory_recovery/create_product_from_instance_execute.json');
const coordinatorSmoke = optionalJson('/opt/mitra-factory/output/factory_recovery/prepare_coordinator_from_instance_execute.json');

const ddlStatements = [
  `CREATE TABLE FACTORY_INSTANCES (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    INSTANCE_CODE VARCHAR(120),
    WORKSPACE_ID VARCHAR(40),
    FACTORY_PROJECT_ID VARCHAR(40),
    ROOT_DIR VARCHAR(400),
    CONFIG_PATH VARCHAR(500),
    STATUS VARCHAR(40),
    CREATED_AT VARCHAR(19),
    UPDATED_AT VARCHAR(19)
  )`,
  `CREATE TABLE VERTICALS (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    VERTICAL_CODE VARCHAR(120),
    INSTANCE_CODE VARCHAR(120),
    NAME VARCHAR(200),
    KIND VARCHAR(80),
    STATUS VARCHAR(40),
    CREATED_AT VARCHAR(19),
    UPDATED_AT VARCHAR(19)
  )`,
  `CREATE TABLE PROJECT_REGISTRY (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    REGISTRY_CODE VARCHAR(120),
    INSTANCE_CODE VARCHAR(120),
    VERTICAL_CODE VARCHAR(120),
    ROLE VARCHAR(80),
    WORKSPACE_ID VARCHAR(40),
    PROJECT_ID VARCHAR(40),
    PROJECT_NAME VARCHAR(200),
    WORKDIR VARCHAR(500),
    STATUS VARCHAR(40),
    CREATED_AT VARCHAR(19),
    UPDATED_AT VARCHAR(19)
  )`,
  `CREATE TABLE COORDINATOR_REGISTRY (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    COORDINATOR_CODE VARCHAR(120),
    INSTANCE_CODE VARCHAR(120),
    VERTICAL_CODE VARCHAR(120),
    PROJECT_REGISTRY_CODE VARCHAR(120),
    PRODUCT_PROJECT_ID VARCHAR(40),
    COORDINATOR_DIR VARCHAR(500),
    MODEL VARCHAR(80),
    STATUS VARCHAR(40),
    CREATED_AT VARCHAR(19),
    UPDATED_AT VARCHAR(19)
  )`,
  `CREATE TABLE WRAPPER_REGISTRY (
    ID INT AUTO_INCREMENT PRIMARY KEY,
    WRAPPER_CODE VARCHAR(120),
    INSTANCE_CODE VARCHAR(120),
    TYPE VARCHAR(40),
    INBOX_DIR VARCHAR(500),
    SEND_COMMAND_JSON TEXT,
    BOT_TOKEN_ENV VARCHAR(120),
    STATUS VARCHAR(40),
    CREATED_AT VARCHAR(19),
    UPDATED_AT VARCHAR(19)
  )`,
];

const verticalCode = 'vertical_factory_smoke';
const records = [
  {
    table: 'FACTORY_INSTANCES',
    keyColumn: 'INSTANCE_CODE',
    data: {
      INSTANCE_CODE: config.factory_instance_code,
      WORKSPACE_ID: workspaceId,
      FACTORY_PROJECT_ID: String(projectId),
      ROOT_DIR: config.root_dir,
      CONFIG_PATH: configPath,
      STATUS: 'active',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  },
  {
    table: 'VERTICALS',
    keyColumn: 'VERTICAL_CODE',
    data: {
      VERTICAL_CODE: verticalCode,
      INSTANCE_CODE: config.factory_instance_code,
      NAME: 'Factory Smoke',
      KIND: 'custom_scope',
      STATUS: 'active',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  },
  {
    table: 'PROJECT_REGISTRY',
    keyColumn: 'REGISTRY_CODE',
    data: {
      REGISTRY_CODE: `project_factory_control_${projectId}`,
      INSTANCE_CODE: config.factory_instance_code,
      VERTICAL_CODE: 'factory_control',
      ROLE: 'factory_control',
      WORKSPACE_ID: workspaceId,
      PROJECT_ID: String(projectId),
      PROJECT_NAME: 'Mitra Factory Control',
      WORKDIR: config.factory_control_project.project_dir,
      STATUS: 'active',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  },
  {
    table: 'WRAPPER_REGISTRY',
    keyColumn: 'WRAPPER_CODE',
    data: {
      WRAPPER_CODE: 'wrapper_telegram_current',
      INSTANCE_CODE: config.factory_instance_code,
      TYPE: 'telegram',
      INBOX_DIR: config.telegram_wrapper.inbox_dir,
      SEND_COMMAND_JSON: JSON.stringify(config.telegram_wrapper.send_command),
      BOT_TOKEN_ENV: config.telegram_wrapper.bot_token_env,
      STATUS: 'active',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  },
];

if (productSmoke?.project_id && productSmoke?.project_dir) {
  records.push({
    table: 'PROJECT_REGISTRY',
    keyColumn: 'REGISTRY_CODE',
    data: {
      REGISTRY_CODE: `project_product_test_${productSmoke.project_id}`,
      INSTANCE_CODE: config.factory_instance_code,
      VERTICAL_CODE: verticalCode,
      ROLE: 'product_test',
      WORKSPACE_ID: String(productSmoke.workspace_id ?? workspaceId),
      PROJECT_ID: String(productSmoke.project_id),
      PROJECT_NAME: productSmoke.project_name ?? 'Factory Instance Smoke',
      WORKDIR: productSmoke.project_dir,
      STATUS: 'active',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  });
}

if (coordinatorSmoke?.coordinator_code && coordinatorSmoke?.coordinator_dir) {
  records.push({
    table: 'COORDINATOR_REGISTRY',
    keyColumn: 'COORDINATOR_CODE',
    data: {
      COORDINATOR_CODE: coordinatorSmoke.coordinator_code,
      INSTANCE_CODE: config.factory_instance_code,
      VERTICAL_CODE: verticalCode,
      PROJECT_REGISTRY_CODE: productSmoke?.project_id ? `project_product_test_${productSmoke.project_id}` : '',
      PRODUCT_PROJECT_ID: String(coordinatorSmoke.product_project_id ?? productSmoke?.project_id ?? ''),
      COORDINATOR_DIR: coordinatorSmoke.coordinator_dir,
      MODEL: config.coordinator_defaults.model,
      STATUS: 'preflight_validated',
      CREATED_AT: now,
      UPDATED_AT: now,
    },
  });
}

const ddlResults = [];
for (const statement of ddlStatements) {
  ddlResults.push(await safeDdl(statement));
}

const recordResults = [];
for (const record of records) {
  recordResults.push(await upsert(record.table, record.keyColumn, record.data));
}

const counts = {};
const registeredRows = {};
if (execute) {
  for (const table of ['FACTORY_INSTANCES', 'VERTICALS', 'PROJECT_REGISTRY', 'COORDINATOR_REGISTRY', 'WRAPPER_REGISTRY']) {
    const result = await q(`SELECT COUNT(*) AS CNT FROM ${table}`);
    counts[table] = Number(result?.result?.rows?.[0]?.CNT ?? 0);
  }

  registeredRows.factory_instance = (await q(`SELECT INSTANCE_CODE, WORKSPACE_ID, FACTORY_PROJECT_ID, STATUS FROM FACTORY_INSTANCES WHERE INSTANCE_CODE = ${sqlValue(config.factory_instance_code)}`))?.result?.rows ?? [];
  registeredRows.verticals = (await q(`SELECT VERTICAL_CODE, INSTANCE_CODE, KIND, STATUS FROM VERTICALS WHERE INSTANCE_CODE = ${sqlValue(config.factory_instance_code)}`))?.result?.rows ?? [];
  registeredRows.projects = (await q(`SELECT REGISTRY_CODE, ROLE, WORKSPACE_ID, PROJECT_ID, WORKDIR, STATUS FROM PROJECT_REGISTRY WHERE INSTANCE_CODE = ${sqlValue(config.factory_instance_code)}`))?.result?.rows ?? [];
  registeredRows.coordinators = (await q(`SELECT COORDINATOR_CODE, PRODUCT_PROJECT_ID, MODEL, STATUS FROM COORDINATOR_REGISTRY WHERE INSTANCE_CODE = ${sqlValue(config.factory_instance_code)}`))?.result?.rows ?? [];
  registeredRows.wrappers = (await q(`SELECT WRAPPER_CODE, TYPE, INBOX_DIR, STATUS FROM WRAPPER_REGISTRY WHERE INSTANCE_CODE = ${sqlValue(config.factory_instance_code)}`))?.result?.rows ?? [];
}

const summary = {
  ok: true,
  mode: execute ? 'execute' : 'dry_run',
  config_path: configPath,
  project_id: String(projectId),
  workspace_id: workspaceId,
  ddl_count: ddlStatements.length,
  record_count: records.length,
  ddl_results: ddlResults,
  record_results: recordResults,
  counts,
  registered_rows: registeredRows,
  records_planned: records.map((record) => ({
    table: record.table,
    key: record.data[record.keyColumn],
    role: record.data.ROLE ?? record.data.KIND ?? record.data.TYPE ?? record.data.STATUS,
  })),
  rechecks: {
    factory_instance_planned: records.some((record) => record.table === 'FACTORY_INSTANCES' && record.data.INSTANCE_CODE === config.factory_instance_code),
    factory_project_registered: records.some((record) => record.table === 'PROJECT_REGISTRY' && record.data.ROLE === 'factory_control' && record.data.PROJECT_ID === String(projectId)),
    product_test_registered_when_available: productSmoke?.project_id ? records.some((record) => record.table === 'PROJECT_REGISTRY' && record.data.PROJECT_ID === String(productSmoke.project_id)) : true,
    wrapper_registered: records.some((record) => record.table === 'WRAPPER_REGISTRY' && record.data.TYPE === 'telegram'),
    coordinator_preflight_registered_when_available: coordinatorSmoke?.coordinator_code ? records.some((record) => record.table === 'COORDINATOR_REGISTRY' && record.data.COORDINATOR_CODE === coordinatorSmoke.coordinator_code) : true,
    executed_counts_present: execute ? Object.values(counts).every((value) => Number(value) >= 1) : true,
    registered_rows_present: execute ? Object.values(registeredRows).every((rows) => rows.length >= 1) : true,
    registered_factory_project_matches: execute ? registeredRows.projects.some((row) => String(row.ROLE) === 'factory_control' && String(row.PROJECT_ID) === String(projectId)) : true,
    registered_product_project_matches: execute && productSmoke?.project_id ? registeredRows.projects.some((row) => String(row.ROLE) === 'product_test' && String(row.PROJECT_ID) === String(productSmoke.project_id)) : true,
    registered_wrapper_matches: execute ? registeredRows.wrappers.some((row) => String(row.TYPE) === 'telegram' && String(row.INBOX_DIR) === config.telegram_wrapper.inbox_dir) : true,
  },
};

summary.ok = Object.values(summary.rechecks).every(Boolean);
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.ok ? 0 : 1);
