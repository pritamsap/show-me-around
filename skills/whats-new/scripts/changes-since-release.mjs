// Summarises what changed since the last release, so /whats-new can find user-facing features.
// Usage: node changes-since-release.mjs [project-dir] [base-ref]
// Node instead of bash so it runs the same on macOS, Linux and Windows.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? '.';
const git = (...args) =>
  execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trimEnd();

try {
  git('rev-parse', '--is-inside-work-tree');
} catch {
  console.log('git: not a repository');
  process.exit(0);
}

// The last release is the newest tag reachable from HEAD, unless a base was given.
let base = process.argv[3];
if (!base) {
  try {
    base = git('describe', '--tags', '--abbrev=0');
  } catch {
    console.log('base: none (no tags found; ask the user which commit or branch the last release was)');
    process.exit(0);
  }
}

const versionAt = (ref) => {
  try {
    return JSON.parse(git('show', `${ref}:package.json`)).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
};
let current = 'unknown';
try {
  current = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).version ?? 'unknown';
} catch {
  // no package.json: leave unknown
}

console.log(`base: ${base}`);
console.log(`base version: ${versionAt(base)}`);
console.log(`current version: ${current}`);
console.log(`\n== commits since ${base} ==`);
console.log(git('log', '--no-merges', '--format=%h %s', `${base}..HEAD`) || '(none)');
console.log(`\n== files changed since ${base} (committed) ==`);
console.log(git('diff', '--stat', `${base}..HEAD`).split('\n').slice(-30).join('\n') || '(none)');
console.log('\n== uncommitted changes ==');
console.log(git('status', '--porcelain').split('\n').slice(0, 30).join('\n') || '(none)');
console.log('\n== UI files changed (read these diffs) ==');
const changed = [git('diff', '--name-only', `${base}..HEAD`), git('diff', '--name-only'), git('diff', '--name-only', '--cached')]
  .join('\n')
  .split('\n')
  .filter((f) => /\.(tsx|jsx|vue|svelte|html)$/.test(f) && !/(^|\/)tour\//.test(f));
console.log([...new Set(changed)].sort().join('\n') || '(none)');
