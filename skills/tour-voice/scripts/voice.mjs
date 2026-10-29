// Installs the voice generator once into a cache folder (not the app), then runs it.
// Usage: node voice.mjs --tour <tour.json> --out <folder> [--voice af_heart] [--speed 1] [--force] [--list-voices]
// Node instead of bash so it runs the same on macOS, Linux and Windows.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cache = process.env.SHOW_ME_AROUND_CACHE ?? join(homedir(), '.cache', 'show-me-around', 'voice');
mkdirSync(cache, { recursive: true });
copyFileSync(join(here, 'generate-voice.mjs'), join(cache, 'generate-voice.mjs'));
copyFileSync(join(here, 'package.json'), join(cache, 'package.json'));

const wanted = readFileSync(join(here, 'package.json'), 'utf8');
const installedMarker = join(cache, '.installed-package.json');
const installed = existsSync(installedMarker) ? readFileSync(installedMarker, 'utf8') : '';
if (!existsSync(join(cache, 'node_modules', 'kokoro-js')) || installed !== wanted) {
  console.log(`Installing kokoro-js into ${cache} (first run only, about a minute)...`);
  // On Windows npm is npm.cmd, which needs a shell to run.
  const npm = spawnSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: cache,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (npm.status !== 0) process.exit(npm.status ?? 1);
  copyFileSync(join(here, 'package.json'), installedMarker);
}

const run = spawnSync(process.execPath, [join(cache, 'generate-voice.mjs'), ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
