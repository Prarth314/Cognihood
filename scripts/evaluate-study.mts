import { evaluateStudy } from '../services/studyEvaluation.ts';
const path = Deno.args[0];
if (!path || Deno.args.length !== 1) throw new Error('Provide one private study JSON file.');
const info = await Deno.stat(path);
if (!info.isFile || info.size > 25 * 1024 * 1024) throw new Error('Expected study file no larger than 25 MiB.');
let input;
try { input = JSON.parse(await Deno.readTextFile(path)); } catch { throw new Error('Study JSON could not be read/parsed; input is not logged.'); }
console.log(JSON.stringify(evaluateStudy(input), null, 2));
