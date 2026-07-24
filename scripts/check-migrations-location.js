const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const oldMigrationsDir = path.join(root, 'database', 'migrations');
const canonicalMigrationsDir = path.join(root, 'supabase', 'migrations');

function fail(messages) {
  console.error('ERRO:');
  console.error('As migrations do Bellory devem existir exclusivamente em supabase/migrations.');
  for (const message of messages) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

function listSqlFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
}

const errors = [];

if (!fs.existsSync(canonicalMigrationsDir)) {
  errors.push('Diretorio canonico ausente: supabase/migrations.');
}

const oldSqlFiles = listSqlFiles(oldMigrationsDir);
if (oldSqlFiles.length > 0) {
  errors.push(`Foram encontradas migrations em database/migrations: ${oldSqlFiles.join(', ')}.`);
}

const canonicalSqlFiles = listSqlFiles(canonicalMigrationsDir);
const names = new Set();
const timestamps = new Map();

for (const fileName of canonicalSqlFiles) {
  const lowerName = fileName.toLowerCase();
  if (names.has(lowerName)) {
    errors.push(`Nome duplicado em supabase/migrations: ${fileName}.`);
  }
  names.add(lowerName);

  const timestamp = fileName.slice(0, 14);
  if (!/^\d{14}$/.test(timestamp)) {
    errors.push(`Migration sem timestamp YYYYMMDDHHMMSS: ${fileName}.`);
    continue;
  }

  const existing = timestamps.get(timestamp) || [];
  existing.push(fileName);
  timestamps.set(timestamp, existing);
}

for (const [timestamp, files] of timestamps.entries()) {
  if (files.length > 1) {
    errors.push(`Timestamp duplicado ${timestamp}: ${files.join(', ')}.`);
  }
}

if (errors.length > 0) {
  fail(errors);
}

console.log('OK: migrations canonicas em supabase/migrations.');
