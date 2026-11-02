import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { createApp } from './app.js';
import { lane } from './lane.js';

// Plan morning-digest § 3: save one rig page as one self-contained HTML file (ADR 0001), lane
// banner included, for a preview host (ADR 0003). Renders through the same app the server runs.
// Previews never go into the repo: the file must land under var/ (gitignored).
//
//   pnpm save-preview [path] [out]          default: /digest/2026-10-28 -> var/digest-2026-10-28.html
//   LANE_MARKER= pnpm save-preview ...      the same page without the marker ("no marker set")

const path = process.argv[2] ?? '/digest/2026-10-28';
const out = process.argv[3] ?? `var/${path.replace(/^\/+/, '').replace(/\//g, '-') || 'index'}.html`;

const rel = relative(resolve('var'), resolve(out));
if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
  console.error(`save-preview: ${out} is not under var/; previews never go into the repo (ADR 0003)`);
  process.exit(2);
}

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`save-preview: ${path} answered ${res.status}; nothing saved`);
  process.exit(1);
}
const html = await res.text();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`saved ${path} -> ${out} · ${Buffer.byteLength(html)} bytes · banner: ${lane().marker ?? 'no marker set'}`);
