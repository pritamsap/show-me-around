# Show Me Around

**Add an in-app product tour to any React or Electron app with one slash command.**
Works in **Claude Code** and **GitHub Copilot in VS Code**.

Your AI coding agent reads your app, picks the features a new user needs, and installs a spotlight tour:
the rest of the app blurs, one feature at a time is highlighted, and a card explains it.
After each release, one more command adds a short **"What's new"** tour for the new features only.

- **Show me around** button: the basic tour. Opens by itself on first launch, then only when clicked.
- **What's new** sparkle button, right next to it: opens by itself **once per new version**, then only when clicked.
- Optional **narration** in a natural voice, generated free and offline. No API key, no per-user cost.
- Matches your app's light/dark theme and colors. No npm dependencies added to your app.

---

## Commands

| Command | What you get |
|---|---|
| `/tour-guide [focus]` | **Silent tour.** Scans the app, shows you the steps it picked, and after you confirm, adds the tour, the anchors and both buttons. Run it again any time to rebuild with the latest version. |
| `/tour-voice [focus]` | **Narrated tour.** Everything `/tour-guide` does, plus a human-sounding voice for every step and a speaker on/off button. One command. |
| `/whats-new [version]` | **Release tour.** Reads your git changes since the last release tag, keeps only what users would notice, and adds "New in x.y.z" steps. Also updates steps for features that changed, promotes important features into the basic tour, and retires old steps. |

`[focus]` is optional, e.g. `/tour-guide only the settings screen`.

## Requirements

- A **React** app (Vite, webpack, Next, CRA), with or without **Electron**. TypeScript or JavaScript.
- **Node.js 18+** (already there in any React project).
- **git**, strongly recommended: you'll want `git diff` to review what the agent changed. `/whats-new` needs git history and release tags.
- For `/tour-voice`: about 150 MB free disk once (voice model + generator, cached in `~/.cache/show-me-around`, not in your app).

Not supported yet: .NET (WPF, WinForms), Vue, Svelte, plain HTML.

---

## Install

### Claude Code

Inside Claude Code:

```
/plugin marketplace add pritamsap/show-me-around
/plugin install show-me-around@show-me-around
```

Or from your terminal:

```bash
claude plugin marketplace add pritamsap/show-me-around
claude plugin install show-me-around@show-me-around
```

Start a new Claude Code session, then type `/tour` to see the commands.

### GitHub Copilot in VS Code

VS Code reads this repo as an agent plugin. Pick one:

**As a plugin (each developer, once):** Command Palette → **Chat: Open Customizations** → **Browse** → **Configure Marketplaces** → **Add Marketplace** → `pritamsap/show-me-around` → install **show-me-around**.
Or add it in `settings.json`:

```json
"chat.plugins.marketplaces": ["pritamsap/show-me-around"]
```

Commands appear as `/show-me-around:tour-guide`, `/show-me-around:tour-voice`, `/show-me-around:whats-new`.

**Committed into your project (whole team, no setup):**

```bash
git clone https://github.com/pritamsap/show-me-around.git
node show-me-around/scripts/install-skills.mjs path/to/your-app --for copilot
```

This copies the skills into `your-app/.github/skills/`. Commit them and everyone who clones the app gets `/tour-guide`, `/tour-voice` and `/whats-new`.
Use `--for both` to also add `.claude/skills/` for Claude Code users, or `--user` to install into your home folder for all your projects.

In Copilot, use **Agent** mode (the skills edit files and run scripts) and start a new chat after installing.

---

## Quick start

1. Open your app's folder and commit your work (`git status` should be clean).
2. Run `/tour-guide` (or `/tour-voice` for narration).
3. The agent shows a table of the steps it picked. Edit or confirm it.
4. It installs the tour, runs your build and lint, and reports what changed.
5. Run your app. The tour starts automatically on first launch.
   To see it again: delete `showMeAround.lastSeenVersion` from DevTools → Application → Local Storage
   (Electron apps that use the settings file: delete `show-me-around.json` in the app's user-data folder) and reload, or click **Show me around**.

### Each release

1. Tag what users already have (once): `git tag v1.0.0`
2. Build your features as usual.
3. Before the release, run `/whats-new`. It proposes the new version number and the steps, and you confirm.
4. Ship it, then tag it: `git tag v1.1.0`

Users who update see a short "New in 1.1.0" tour once. New users get the basic tour instead.

```
your branch ──► /whats-new ──► commit + PR ──► merge ──► CI builds & releases ──► users update
                (adds steps                                                         └─ "New in 1.1.0", once
                 + version bump)
```

---

## How it works

Everything lives in a `tour/` folder inside your app (about 10 small files, no dependencies):

```
src/tour/
├── tour.json            ← the steps (plain data, easy to review in a PR)
├── TourProvider.tsx     ← decides what to show and when
├── TourOverlay.tsx      ← blur + spotlight + card, keyboard and screen-reader friendly
├── ShowMeAroundButton.tsx, WhatsNewButton.tsx
└── voice/               ← only with /tour-voice: one .wav per step
```

A step points at an element through a `data-tour` attribute:

```json
{ "id": "export", "target": "export-button", "title": "Take notes with you", "body": "Export all your notes as a text file." }
```

```tsx
<button data-tour="export-button">Export</button>
```

Steps **without** `since` form the basic tour. Steps **with** `"since": "1.1.0"` are what's-new steps.

| Moment | What the user sees |
|---|---|
| First launch | Basic tour |
| Opened again | Nothing (until they click a button) |
| Updated to a new version | What's new for the versions they missed (max 6 steps, newest first) |
| A newer step `replaces` an older one | Only the newer one, so nobody sees an outdated card |

The app remembers the last version the user saw: in `localStorage` for web apps, and in a JSON settings file in the user's app-data folder for Electron apps (read and written by the main process over IPC).

### Narration

`/tour-voice` uses [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) through [kokoro-js](https://www.npmjs.com/package/kokoro-js), both Apache-2.0, running locally on your machine's CPU.
Audio is generated **while you develop** and shipped as small `.wav` files (about 200 KB per step), so the app never runs a speech model.
Only steps whose text changed are regenerated. Users can mute it with the speaker button, and the choice is remembered.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `/tour-guide` doesn't appear | Start a **new** session/chat after installing. In Copilot, check you're in Agent mode and type `/` to see the list. |
| The tour shows every time | The app's version isn't reaching the tour, or storage is blocked. Check that `appVersion` is passed to `<TourProvider>`. |
| A step is skipped | Its `data-tour` element isn't on screen. The console says which: `[tour] Skipping step "…"`. |
| No sound | Electron: check the Content-Security-Policy allows `media-src 'self'`. Browsers block sound until the user clicks once; the speaker button starts it. |
| `/whats-new` finds nothing | It compares against the newest git tag. Tag your last release (`git tag v1.0.0`) or tell it which commit was the release. |

Health check for any app with a tour:

```bash
node path/to/show-me-around/skills/tour-guide/scripts/check-tour.mjs src/tour/tour.json src
```

## Update or uninstall

- **Claude Code:** update with `claude plugin marketplace update show-me-around` then `claude plugin update show-me-around@show-me-around`; remove with `claude plugin uninstall show-me-around@show-me-around`.
- **Copilot:** update or remove it in **Chat: Open Customizations**; for committed skills, re-run `install-skills.mjs` (it replaces the old copy) or delete `.github/skills/tour-guide`, `tour-voice` and `whats-new`.
- **Updating an app's tour code:** run `/tour-guide` (or `/tour-voice`) again. It rebuilds with the latest version and keeps your what's-new history.
- **Removing the tour from an app:** delete the `tour/` folder, the `<TourProvider>` wrapper, the two buttons and the `data-tour` attributes.

---

## Repository layout

```
.claude-plugin/        plugin + marketplace manifests (read by Claude Code and VS Code)
skills/
  tour-guide/          SKILL.md, templates (the tour code copied into apps), references, scripts
  tour-voice/          SKILL.md, voice generator (Kokoro)
  whats-new/           SKILL.md, release-diff script
scripts/
  install-skills.mjs   copy the skills into a project's .github/skills or .claude/skills
  detect-dotnet-ui.sh  survey .NET repos (for the planned .NET version)
examples/react-demo/   "Notely", a small app with the narrated tour installed
```

Try the demo:

```bash
cd examples/react-demo && npm install && npm run dev
```

Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

Copyright © 2026 Pritam. All rights reserved.

You're welcome to read the code and install the plugin to try it. No license is granted to copy, modify or redistribute it.
