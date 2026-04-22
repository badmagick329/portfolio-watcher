import fs from 'node:fs';
import path from 'node:path';

const sqlitePath = process.env.SQLITE_DB;

if (!sqlitePath) {
  console.error('SQLITE_DB is required.');
  process.exit(1);
}

const resolvedPath = path.resolve(sqlitePath);
const parent = path.dirname(resolvedPath);

fs.mkdirSync(parent, { recursive: true });
