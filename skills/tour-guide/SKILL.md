---
name: tour-guide
description: Creates, or rebuilds from scratch, the foundational "Show me around" product tour for a React or Electron app. Scans the code for core features, adds data-tour anchors, writes tour.json, and installs the latest spotlight overlay. Run with /tour-guide [optional focus].
argument-hint: "[optional focus, e.g. 'only the editor screen']"
disable-model-invocation: true
---

# Tour guide

Build the **basic tour**: the 5–10 features a brand-new user needs. If the app already has a tour, **rebuild it**: always install the latest runtime and rewrite the basic steps from the current code. Steps for individual new features (with a `since` version) are a separate job and are kept as they are.

Focus requested by the user: $ARGUMENTS
(If that shows the literal text `$ARGUMENTS`, your tool doesn't fill it in: use whatever the user typed after the command, if anything. Empty means the whole app.)

**This tour is silent: no narration, no audio files, no speaker button.** If the app already has narration from an earlier `/tour-voice` run, a rebuild removes it (see Step 1). Narrated tours are only made by `/tour-voice`, which runs these same steps and then adds the audio; when `/tour-voice` is the one following these steps, it tells you to skip the narration removal.

All paths below (`scripts/`, `templates/`, `references/`) are relative to this skill's folder (the folder containing this SKILL.md). Run the scripts with `node`; they work on macOS, Linux and Windows.

## Step 1: Check git and detect the stack

Run `node scripts/detect-stack.mjs <project root>`. For an Electron app with a separate renderer package, run it on the folder that has the React `package.json`.

**Check git before anything else.** This skill edits many files; git is how the user reviews and undoes them.

- `git: clean` → continue.
- `git: uncommitted changes` → tell the user their changes would mix with yours. Suggest committing or stashing first, and wait for their answer.
- `git: not a repository` → warn that there will be no easy way to see or undo the changes. Offer to set it up, and **wait for a yes** before running anything:
  1. If `gitignore: missing node_modules`, create or extend `.gitignore` first with the folders that must never be committed: `node_modules/`, build output (`dist/`, `out/`, `build/`), and any virtualenv (`.venv/`, `venv/`) or `.env` files you see.
  2. `git init && git add -A && git commit -m "Before /tour-guide"`.
  If the user says no, continue, but remind them in the final report that the changes can't be undone with git.

Then check the stack:

- **Supported:** `react` is present, with or without `electron`, with any bundler.
- **`stack: dotnet` or no React:** stop. Tell the user only React/Electron is supported so far.
- **`existing tour.json` is not `none`:** this is a **rebuild**. Don't ask whether to continue; the user ran `/tour-guide` to replace it. Tell them in one line that you're rebuilding, then before Step 2 note:
  - the `tour/` folder location (install the runtime there again, not in a new place),
  - the steps that have a `since` field: these are what's-new steps, **keep them unchanged**,
  - the current `<TourProvider>` props (`theme`, `colors`, `onBeforeStep`, `storage`), so you update the wiring instead of adding it twice,
  - whether the app has narration (a `tour/voice/` folder, a `voice` prop on the provider, an `import.meta.glob`/`require.context` map of `.wav` files). If it does, you'll **remove all of it** in Step 6: this command makes a silent tour.

## Step 2: Find the core features (read, don't guess)

Look at, in this order:
1. Routes / pages (router config, `pages/` or `app/` folders).
2. The main layout: sidebar, header, toolbar, tabs.
3. Primary actions: create, save, search, export, share.
4. Settings and help.
5. Electron only: the app menu (`Menu.buildFromTemplate`) shows what the team thinks users need.

Pick **5–10 steps** in the order a new user meets them (see `references/writing-steps.md` for the shape). If the user gave a focus above, stay within it.

Skip: dev/debug screens, admin-only areas, anything behind a feature flag, error and empty states, elements only shown after data exists unless the app ships sample data.

**Show the user the list before touching code**, as a table: step title, element (component + file), route if not the start screen. Wait for them to confirm or edit it.

## Step 3: Install the runtime

1. Copy `templates/react/tour/` into the app's source as a `tour/` folder (e.g. `src/tour/`; electron-vite: `src/renderer/src/tour/`).
   **Rebuild:** overwrite every runtime file in the existing `tour/` folder. Delete runtime files the template no longer has, but never delete `tour.json` or `tour.schema.json` (you replace it in point 4). The `voice/` folder is handled in Step 6.
2. Copy the files **unchanged**. They are tested; do not rewrite or "improve" them.
3. JavaScript project: rename `.tsx`→`.jsx`, `.ts`→`.js` and remove only the type annotations, `import type` lines and `interface`/`type` declarations. Change no logic.
4. Copy `templates/tour.schema.json` into the same `tour/` folder.

No npm packages are needed.

## Step 4: Add anchors

For each step, add `data-tour="<id>"` to the element that should be spotlighted.

- It must end up on a real DOM element. If the element is a custom component, check that it passes unknown props to its DOM root. If it doesn't, put the attribute inside that component or wrap the usage in a `<div data-tour="...">`.
- Name ids after the feature, in kebab-case: `export-button`, `project-list`. Never use position names like `top-right-btn`.
- Only add the attribute. Do not restyle, rename, or restructure anything.
- **Rebuild:** reuse existing `data-tour` attributes where they still fit. Remove the attribute (only the attribute) from elements that no step targets any more, unless a kept `since` step still uses it.

## Step 5: Write `tour/tour.json`

Read `references/writing-steps.md` first, then write:

```json
{
  "$schema": "./tour.schema.json",
  "steps": [
    { "id": "welcome", "title": "Welcome to Acme", "body": "Plan projects and track work in one place." },
    { "id": "projects", "target": "project-list", "title": "Your projects", "body": "Everything you're working on lives here. Click one to open it." }
  ]
}
```

- Basic steps have **no `since`**. `since` marks a what's-new step for one version.
- **Rebuild:** replace all steps that have no `since` with the new basic steps, then append the kept `since` steps unchanged. Reuse an old step's `id` when it describes the same feature, so ids stay stable across rebuilds.
- First step: a welcome with no `target`. Last step: target `tour-buttons` (Step 6), e.g. "Replay this tour any time, and click the sparkle to see what's new after each update."
- If the app has more than one page, give the **first step a route** (usually `"/"`) and add `"route"` wherever the page changes. A step without a route uses the route of the step before it, so Back works across pages.
- Check: every `target` appears as `data-tour="<target>"` in the code (grep for it), and every `id` is unique.

## Step 6: Wire it up

**Rebuild:** the provider is already there. Keep it and its props, and only change what the new steps need (e.g. add `onBeforeStep` if steps now have routes). Re-check the theme and colors below against the app's current styles. Don't add a second provider or button.

**Rebuild of a narrated app:** remove the narration completely: the `voice={...}` prop, the code that builds the audio map, the `tour/voice/` folder, and any CSP `media-src` entry that was added only for it. Without a `voice` prop the speaker button doesn't appear. (Skip this when `/tour-voice` is running these steps.)

Wrap the app root (inside the router if there is one, so navigation hooks work):

```tsx
import { TourProvider, type TourFile } from './tour';
import tour from './tour/tour.json';

<TourProvider tour={tour as TourFile} appVersion={APP_VERSION}>
  <App />
</TourProvider>
```

- **`appVersion`:** reuse the version the app already shows (About screen, footer) if it has one. Otherwise import it from `package.json` (`import { version } from '../package.json'`, adjusting the path). In Electron the `package.json` version is the app version.
- **Routes:** if any step has `route`, pass `onBeforeStep`, e.g. with react-router:
  ```tsx
  const navigate = useNavigate();
  const location = useLocation();
  <TourProvider ... onBeforeStep={(step) => { if (step.route && step.route !== location.pathname) navigate(step.route); }}>
  ```
  The overlay waits up to 1.5 s for the target to appear after navigation.
- **Match the app's look.** Without this, the card follows the OS light/dark setting and can clash with the app.
  1. Work out how the app picks light or dark:
     - Always dark or always light (e.g. hard-coded dark backgrounds, no light styles, Tailwind without `dark:` variants) → `theme="dark"` or `theme="light"`.
     - Its own theme toggle → pass the app's current theme from its state or context, e.g. `theme={isDark ? 'dark' : 'light'}`.
     - Follows the OS (`prefers-color-scheme`, Tailwind `darkMode: 'media'`) → leave the default `"system"`.
  2. Find the colors the app already uses: Tailwind config (`theme.extend.colors`), CSS variables in the global stylesheet, or the primary button's styles. Pass them with `colors`:
     ```tsx
     <TourProvider ... theme="dark" colors={{ accent: '#8b5cf6', accentText: '#ffffff', cardBg: '#16161d', cardText: '#e5e7eb', muted: '#9ca3af' }}>
     ```
     Keys: `accent` (primary button + ring), `accentText`, `cardBg`, `cardText`, `muted` (secondary text), `backdrop` (blur tint, keep it semi-transparent). Only use colors that already exist in the app; skip any you can't find, and the defaults fill in.
  3. Do not edit `tour.css` to change colors; use these props.
- **Tour buttons:** put both buttons **next to each other** where help lives (header, toolbar, help menu, settings), wrapped in one element with the anchor the last basic step targets:
  ```tsx
  import { ShowMeAroundButton, WhatsNewButton } from './tour';

  <div data-tour="tour-buttons" className="...">
    <ShowMeAroundButton className="..." />   {/* replays the basic tour */}
    <WhatsNewButton className="..." />       {/* sparkle icon: replays the newest release's what's-new steps */}
  </div>
  ```
  Style them like the app's other header/toolbar buttons (pass `className`). `WhatsNewButton` renders nothing until the tour has what's-new steps, so it's safe to add now. Rebuild: if the app has only `ShowMeAroundButton`, add `WhatsNewButton` beside it and move the anchor to the wrapper.
- **Electron: save tour state to a settings file.** Follow `references/electron-storage.md`: IPC handlers in the main process, `window.tourStore` in the preload, `storage={tourStorage}` on the provider. If the app already has a settings store, use it. Rebuild of an app that used localStorage: always wrap with `migrateFromBrowserStorage`, or every existing user sees the tour again. Plain web apps keep the default (localStorage).
- **Electron app menu:** if the app builds its own menu, also add a Help → Show me around item. Follow `references/electron-menu.md`.

## Step 7: Verify

1. Run the project's own checks (typecheck, lint, build: whatever `package.json` scripts exist). Fix any errors you introduced.
   Then run `node scripts/check-tour.mjs <tour.json> <source folder>`; it must report `issues: none`.
2. If you can run the app (dev server + browser, or the `run` skill), click through every step and confirm each spotlight lands on the right element. Look for `[tour] Skipping step` warnings in the console.
3. Otherwise tell the user how to test: open DevTools → Application → Local Storage, delete `showMeAround.lastSeenVersion`, reload. The basic tour starts automatically.

Finish with a short report: steps created, files changed, the theme and colors you chose and where they came from, anything skipped and why. On a rebuild, also list steps added, removed and kept. If the project has git, tell the user how to review: `git diff` or VS Code's Source Control panel.

If you removed narration on a rebuild, say so in the report, and that `/tour-voice` makes the narrated version.

## How the runtime behaves (so you can explain it)

- On launch, it compares the stored `showMeAround.lastSeenVersion` with `appVersion`:
  - nothing stored (first run) → basic tour (steps without `since`)
  - stored version is older → what's-new tour (steps with `lastSeen < since ≤ appVersion`), if any
  - otherwise → nothing
- The basic tour shows **once**, on first launch; after that only the Show me around button opens it. What's new shows **once per new version**; after that only the sparkle button opens it (newest release's steps).
- Closing or finishing the tour stores the current version (localStorage by default, or the `storage` you pass, e.g. a settings file in Electron).
- A user who skipped several releases sees at most 6 what's-new steps (`maxWhatsNewSteps`), newest first. A step with `replaces` hides the older steps it lists.
- A step whose target isn't on screen is skipped with a console warning instead of breaking the tour.
- Esc closes, ← / → move between steps. The card is a labelled dialog and gets keyboard focus.
- Narration is not part of this tour. (The runtime accepts a `voice` prop, used only by `/tour-voice`.)
