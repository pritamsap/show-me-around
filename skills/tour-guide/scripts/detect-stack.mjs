// Prints the facts /tour-guide needs about a project before installing the tour.
// Usage: node detect-stack.mjs [project-dir]
// Node instead of bash so it runs the same on macOS, Linux and Windows.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const dir = process.argv[2] ?? '.';

// Git first: the skill edits many files, so the user needs a way to review and undo.
const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
let gitState;
try {
  git('rev-parse', '--is-inside-work-tree');
  gitState = git('status', '--porcelain').trim() ? 'uncommitted changes' : 'clean';
} catch {
  gitState = 'not a repository';
}
console.log(`git: ${gitState}`);
const gitignore = join(dir, '.gitignore');
const ignoresModules = existsSync(gitignore) && readFileSync(gitignore, 'utf8').includes('node_modules');
console.log(`gitignore: ${ignoresModules ? 'has node_modules' : 'missing node_modules'}`);

const pkgPath = join(dir, 'package.json');
if (!existsSync(pkgPath)) {
  const files = [...walk(dir, 3)];
  console.log(
    files.some((f) => f.endsWith('.csproj'))
      ? 'stack: dotnet (not supported by the React template yet)'
      : `stack: unknown (no package.json in ${dir})`,
  );
} else {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const has = (name) => name in deps;
  const pick = (names) => names.find(has) ?? 'none';
  console.log(`name: ${pkg.name ?? '?'}`);
  console.log(`version: ${pkg.version ?? 'none'}`);
  console.log(`react: ${has('react') ? deps.react : 'no'}`);
  console.log(`electron: ${has('electron') ? deps.electron : 'no'}`);
  console.log(
    `bundler: ${pick(['electron-vite', '@electron-forge/plugin-vite', '@electron-forge/plugin-webpack', 'next', 'vite', 'react-scripts', 'webpack'])}`,
  );
  console.log(`router: ${pick(['react-router-dom', 'react-router', '@tanstack/react-router', 'next', 'wouter'])}`);
  console.log(`language: ${existsSync(join(dir, 'tsconfig.json')) ? 'typescript' : 'javascript'}`);

  const tours = [];
  let anchorFiles = 0;
  for (const file of walk(dir, Infinity)) {
    if (file.endsWith(`${join('tour', 'tour.json')}`)) tours.push(relative(dir, file));
    // `data-tour="` followed by a letter, so the runtime's own selector template isn't counted.
    if (['.tsx', '.jsx'].includes(extname(file)) && /data-tour="[a-z]/.test(readFileSync(file, 'utf8'))) anchorFiles++;
  }
  console.log(`existing tour.json: ${tours.length ? tours.slice(0, 5).join(', ') : 'none'}`);
  console.log(`files with data-tour anchors: ${anchorFiles}`);
}

function* walk(root, depth) {
  if (depth < 0) return;
  for (const name of readdirSync(root)) {
    if (['node_modules', 'dist', 'out', 'build', 'bin', 'obj'].includes(name) || name.startsWith('.')) continue;
    const path = join(root, name);
    if (statSync(path).isDirectory()) yield* walk(path, depth - 1);
    else yield path;
  }
}
