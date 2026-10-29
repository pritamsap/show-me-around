// Health check for tour.json: missing anchors, duplicate ids, bad `replaces`, basic tour size, old what's-new steps.
// Usage: node check-tour.mjs <tour.json> <source folder> [--keep-releases 5]
// Prints a report; never edits anything. Exit code 1 only when the arguments or tour.json are unusable.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'keep-releases': { type: 'string', default: '5' } },
});
const [tourPath, srcDir] = positionals;
if (!tourPath || !srcDir) {
  console.error('Usage: node check-tour.mjs <tour.json> <source folder> [--keep-releases 5]');
  process.exitCode = 1;
} else {
  let steps;
  try {
    steps = JSON.parse(readFileSync(tourPath, 'utf8')).steps;
  } catch (error) {
    console.error(`Can't read ${tourPath}: ${error.message}`);
    process.exitCode = 1;
  }
  if (steps) report(steps, srcDir, Number(opts['keep-releases']));
}

function report(steps, dir, keepReleases) {
  const { anchors, dynamicFiles } = findAnchors(dir);
  const issues = [];
  const ids = new Set();

  for (const step of steps) {
    if (ids.has(step.id)) issues.push(`duplicate id "${step.id}"`);
    ids.add(step.id);
    if (step.target && !anchors.has(step.target)) {
      issues.push(
        `step "${step.id}": no data-tour="${step.target}" in the code` +
          (dynamicFiles.length ? ' (may be set dynamically, check by hand)' : ''),
      );
    }
  }
  for (const step of steps) {
    for (const old of step.replaces ?? []) {
      const target = steps.find((s) => s.id === old);
      if (!target) issues.push(`step "${step.id}" replaces unknown step "${old}"`);
      else if (!target.since) issues.push(`step "${step.id}" replaces basic step "${old}" (replaces is for what's-new steps)`);
    }
  }

  const basic = steps.filter((s) => !s.since);
  const versions = [...new Set(steps.filter((s) => s.since).map((s) => s.since))].sort(compareVersions);
  const kept = versions.slice(-keepReleases);
  const expired = steps.filter((s) => s.since && !kept.includes(s.since));

  console.log(`basic tour: ${basic.length} steps${basic.length > 10 ? '  (over 10: suggest merging or dropping some)' : ''}`);
  console.log(`what's-new releases: ${versions.length ? versions.join(', ') : 'none'}`);
  for (const v of versions) {
    console.log(`  ${v}: ${steps.filter((s) => s.since === v).map((s) => s.id).join(', ')}`);
  }
  console.log(
    `older than the last ${keepReleases} releases (candidates to delete): ${expired.length ? expired.map((s) => `${s.id} (${s.since})`).join(', ') : 'none'}`,
  );
  if (dynamicFiles.length) console.log(`dynamic data-tour={...} in: ${dynamicFiles.join(', ')}`);
  console.log(issues.length ? `issues:\n${issues.map((i) => `  - ${i}`).join('\n')}` : 'issues: none');
}

/** Collects every data-tour="..." value. For data-tour={...}, also accepts kebab-case strings in that file. */
function findAnchors(dir) {
  const anchors = new Set();
  const dynamicFiles = [];
  for (const file of walk(dir)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/data-tour=["']([a-z0-9-]+)["']/g)) anchors.add(m[1]);
    if (/data-tour=\{/.test(text)) {
      dynamicFiles.push(file);
      for (const m of text.matchAll(/["']([a-z0-9]+(?:-[a-z0-9]+)+)["']/g)) anchors.add(m[1]);
    }
  }
  return { anchors, dynamicFiles };
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === 'tour' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (['.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte', '.html'].includes(extname(name))) yield path;
  }
}

function compareVersions(a, b) {
  const parse = (v) => v.replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}
