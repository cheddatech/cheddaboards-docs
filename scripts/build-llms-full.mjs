// scripts/build-llms-full.mjs
// Concatenates the docs markdown sources into public/llms-full.txt in sidebar
// order, with the hand-written llms.txt header on top. Run before `vitepress build`.
//
//   "scripts": {
//     "docs:build": "node scripts/build-llms-full.mjs && vitepress build"
//   }
//
// Pages are read from disk, so this never drifts from what's published.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SITE = 'https://docs.cheddaboards.com';

// Sidebar order. Keep in sync with .vitepress/config.
const PAGES = [
  'ai-integration',
  'quickstart/rest',
  'quickstart/godot',
  'quickstart/unity',
  'quickstart/production',
  'quickstart/jam',
  'api/overview',
  'api/authentication',
  'api/scores',
  'api/scoreboards',
  'api/players',
  'api/achievements',
  'api/errors',
  'engines/godot-4',
  'engines/godot-3',
  'engines/godot-signals',
  'engines/web-export',
  'concepts/data-model',
  'concepts/accounts',
  'concepts/player-names',
  'concepts/device-code',
  'concepts/timed-leaderboards',
  'concepts/category-boards',
  'concepts/anti-cheat',
  'concepts/moderation',
  'concepts/privacy',
  'self-hosting/overview',
  'self-hosting/canister',
  'self-hosting/proxy',
];

function stripFrontmatter(md) {
  return md.replace(/^---\n[\s\S]*?\n---\n/, '');
}

// VitePress-only syntax that reads badly as plain text.
function cleanup(md) {
  return md
    .replace(/^::: (tip|info|warning|danger)( .*)?$/gm, (_, type, title) => `> **${(title || type).trim()}**`)
    .replace(/^:::\s*$/gm, '')
    .replace(/\]\((\/[^)]+)\)/g, (_, path) => `](${SITE}${path})`); // absolute links
}

const header = readFileSync(resolve(ROOT, 'public/llms.txt'), 'utf8').trim();
let out = header + '\n\n---\n\n';

for (const page of PAGES) {
  const file = resolve(ROOT, `${page}.md`);
  if (!existsSync(file)) {
    console.warn(`llms-full: missing ${page}.md, skipping`);
    continue;
  }
  const body = cleanup(stripFrontmatter(readFileSync(file, 'utf8'))).trim();
  out += `<!-- ${SITE}/${page} -->\n\n${body}\n\n---\n\n`;
}

writeFileSync(resolve(ROOT, 'public/llms-full.txt'), out);
console.log(`llms-full.txt: ${PAGES.length} pages, ${(out.length / 1024).toFixed(0)} KB`);
