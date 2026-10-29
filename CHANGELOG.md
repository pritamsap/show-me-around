# Changelog

## 0.8.0
- `/tour-guide` always makes a silent tour; rebuilding a narrated app removes the narration.
- `/tour-voice` does everything `/tour-guide` does, then narrates with the default voice (`af_heart`). One command, no voice choices.
- `/whats-new` never adds narration.

## 0.7.0
- What's new sparkle button (`WhatsNewButton`) next to Show me around. Electron Help menu gets both items.
- GitHub Copilot in VS Code: same plugin and skills; helper scripts rewritten in Node so they run on Windows; `scripts/install-skills.mjs` for `.github/skills/`.

## 0.6.0
- `/whats-new` plans five things in one table: new steps, changed features (`replaces`), promotions into the basic tour, retiring old steps, health fixes.
- Runtime: `replaces`, at most 6 what's-new steps per catch-up, pluggable storage. Electron apps save to a settings file via IPC, with migration from localStorage.
- `check-tour.mjs` health check.

## 0.5.0
- `/whats-new`: finds user-facing changes since the last release tag and adds "New in x.y.z" steps.

## 0.4.0
- `/tour-guide` rebuilds an existing tour (latest runtime, fresh basic steps) instead of refusing.

## 0.3.x
- `/tour-voice`: free local narration with Kokoro, speaker mute button.
- Smoother animation: single blur layer with a rounded cut-out, glided frame by frame (works around a Chromium clip-path bug).

## 0.2.0
- Git check before editing; `theme` and `colors` props to match the app.

## 0.1.0
- First version of `/tour-guide` for React and Electron.
