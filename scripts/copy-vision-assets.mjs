import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Match the installed SDK exactly; no external script execution is required.
const source = 'node_modules/@mediapipe/tasks-vision/wasm';
const version = JSON.parse(await readFile('node_modules/@mediapipe/tasks-vision/package.json', 'utf8')).version;
if (!/^[\d.\w-]+$/.test(version)) throw new Error('Invalid vision asset version.');
const target = `public/mediapipe/${version}/wasm`;
await mkdir(target, { recursive: true });
for (const name of await readdir(source)) {
  if (/^vision_wasm_[\w]+\.(js|wasm)$/.test(name)) await copyFile(path.join(source, name), path.join(target, name));
}
