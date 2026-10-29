// Copies the three skills into a project (or your home folder) for tools that read skill folders directly.
// Usage:
//   node scripts/install-skills.mjs <project-dir> [--for copilot|claude|both]   # into the repo, shared with the team
//   node scripts/install-skills.mjs --user [--for copilot|claude|both]          # into your home folder, all projects
// Copilot reads .github/skills/ (project) and ~/.copilot/skills/ (personal); Claude Code reads .claude/skills/ and ~/.claude/skills/.
// The skills reference each other (../tour-guide/...), so all three are always copied together.
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { for: { type: 'string', default: 'copilot' }, user: { type: 'boolean', default: false } },
});
const targets = { copilot: ['copilot'], claude: ['claude'], both: ['copilot', 'claude'] }[opts.for];
if (!targets || (!opts.user && !positionals[0])) {
  console.error('Usage: node scripts/install-skills.mjs <project-dir> [--for copilot|claude|both]');
  console.error('       node scripts/install-skills.mjs --user [--for copilot|claude|both]');
  process.exit(1);
}

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills');
const base = opts.user ? homedir() : resolve(positionals[0]);
const folder = { copilot: opts.user ? '.copilot' : '.github', claude: '.claude' };

for (const tool of targets) {
  const dest = join(base, folder[tool], 'skills');
  for (const skill of readdirSync(skillsDir)) {
    const to = join(dest, skill);
    // Replace, don't merge, so files deleted from a skill don't linger in old installs.
    if (existsSync(to)) rmSync(to, { recursive: true });
    cpSync(join(skillsDir, skill), to, { recursive: true, filter: (src) => !src.includes('node_modules') });
  }
  console.log(`${tool}: installed ${readdirSync(skillsDir).join(', ')} into ${dest}`);
}
console.log('Start a new chat session so the tool picks up the skills, then type /tour-guide.');
