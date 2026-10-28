import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Each stage locks the shared snapshot and preserves successful source data.
let failed = false;
for (const script of ['sync-policies.mjs', 'enrich-policies.mjs', 'audit-policies.mjs']) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(script, import.meta.url))], {stdio:'inherit', env:process.env});
  if (result.status !== 0) failed = true;
}
if (failed) process.exitCode = 1;
