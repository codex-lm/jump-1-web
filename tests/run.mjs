import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const tests = readdirSync(new URL('./', import.meta.url)).filter(name => name.endsWith('.test.mjs')).map(name => `tests/${name}`);
if (!tests.length) { console.log('Jump-1 skeleton ready; no implementation tests yet.'); process.exit(0); }
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
