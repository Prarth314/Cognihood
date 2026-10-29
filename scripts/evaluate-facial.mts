// Offline only; requires no network, backend credentials, images or external packages.
import { evaluateClosure, type ClosureObservation } from '../services/facialEvaluation.ts';
const path = Deno.args[0];
if (!path || Deno.args.length !== 1) throw new Error('Provide one private JSONL observation file.');
const info = await Deno.stat(path);
if (!info.isFile || info.size > 100 * 1024 * 1024) throw new Error('Input must be a file no larger than 100 MiB.');
const rows: ClosureObservation[] = [];
for (const [index, line] of (await Deno.readTextFile(path)).split(/\r?\n/).entries()) {
  if (!line.trim()) continue;
  try { rows.push(JSON.parse(line)); }
  catch { throw new Error(`Invalid JSON at line ${index + 1}`); }
  if (rows.length > 1_000_000) throw new Error('Input exceeds one million observations.');
}
console.log(JSON.stringify(evaluateClosure(rows), null, 2));
