import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

const publicPaths = ['', 'mission', 'how-it-works', 'hardware'];
for (const path of publicPaths) {
  const html = await readFile(`dist/${path ? `${path}/` : ''}index.html`, 'utf8');
  assert(html.includes('<main'), `${path || '/'} is missing prerendered content`);
  assert(!html.includes('<form'), 'A public page unexpectedly renders authentication');
  assert(html.includes('rel="canonical"'), 'Public canonical metadata is missing');
  for (const match of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const href = match[1];
    if (href === '/' || href.startsWith('/app')) continue;
    await access(`dist${href.includes('.') ? href : `${href}/index.html`}`);
  }
}
for (const page of ['login', 'app']) {
  const html = await readFile(`dist/${page}/index.html`, 'utf8');
  assert(html.includes('noindex,nofollow'), `${page} is missing noindex metadata`);
  assert(html.includes('<div id="root"></div>'), `${page} unexpectedly contains prerendered account data`);
}
await access('dist/social-preview.png');
console.log('Verified public HTML, internal links, social artwork, and private entry-point metadata.');
