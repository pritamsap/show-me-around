---
name: tour-voice
description: Builds (or rebuilds) the "Show me around" tour for a React or Electron app exactly like /tour-guide, then narrates every step with a natural female voice and adds a speaker on/off button. Audio is made locally with the free Kokoro model (Apache-2.0, no API key, no cost per user). Run with /tour-voice [optional focus].
argument-hint: "[optional focus, e.g. 'only the editor screen']"
disable-model-invocation: true
---

# Tour voice

`/tour-voice` = **`/tour-guide` + narration**. One command gives the user the whole narrated tour; they never need to run `/tour-guide` first. (`/tour-guide` on its own makes a silent tour.)

The audio is made **now, on the developer's machine**, and shipped as files with the app. The app never runs a speech model, needs no internet, and costs nothing per user.

Focus requested by the user: $ARGUMENTS
(If that shows the literal text `$ARGUMENTS`, your tool doesn't fill it in: use whatever the user typed after the command, if anything. Empty means the whole app.)

Paths like `scripts/` are relative to this skill's folder (the folder containing this SKILL.md). `../tour-guide/` is the sibling skill, installed next to this one. Run the scripts with `node`; they work on macOS, Linux and Windows.

## Step 1: Build the tour

Open `../tour-guide/SKILL.md` and follow **all of its steps (1–7)**, with the focus above, including its git check and the feature table the user confirms. Paths in that file are relative to `../tour-guide/`. Two differences:

- **Keep existing narration.** Skip its "remove the narration" instructions (Step 1 notes and Step 6). Keep `tour/voice/`, the `voice` prop and the audio map if they exist: the generator below reuses audio for steps whose text didn't change.
- **Don't write its final report yet.** Continue here; report once at the end.

## Step 2: Generate the audio

Always use the default voice, `af_heart` (natural American female). Don't ask the user to pick a voice and don't list alternatives.

Tell the user first: **the first run installs kokoro-js into `~/.cache/show-me-around/voice` (not into their app) and downloads the ~90 MB Kokoro model** once. Later runs are fast.

```bash
node scripts/voice.mjs --tour <path to tour.json> --out <tour folder>/voice --voice af_heart
```

- Writes `<id>.wav` per step plus `manifest.json` into `tour/voice/`. Only steps whose text changed are regenerated; audio for deleted steps is removed.
- A few seconds per step on a laptop CPU. Run it in the background if the tour is long.
- A full stop between title and body already gives a natural pause, so don't change the step text for the narration.

## Step 3: Wire playback

Skip if the provider already has a working `voice` prop. Otherwise build a `{ [stepId]: url }` map and pass it as `voice` to the `<TourProvider>`. How depends on the bundler (`node ../tour-guide/scripts/detect-stack.mjs` reports it):

**Vite / electron-vite:**
```ts
const voiceFiles = import.meta.glob('./tour/voice/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const tourVoice = Object.fromEntries(
  Object.entries(voiceFiles).map(([path, url]) => [path.split('/').pop()!.replace('.wav', ''), url]),
);
```
Adjust the glob path to be relative to the file it's in. In JavaScript, drop the `as Record<...>` and the `!`.

**webpack (Electron Forge webpack, CRA):**
```ts
const context = require.context('./tour/voice', false, /\.wav$/);
const tourVoice = Object.fromEntries(context.keys().map((key) => [key.slice(2, -4), context(key)]));
```
If webpack has no rule for `.wav`, add an asset rule (`{ test: /\.wav$/, type: 'asset/resource' }`) to the renderer config.

**Anything else:** copy `tour/voice/` into the static/public folder and build the map from `manifest.json` as `/<public path>/<file>`.

Then: `<TourProvider ... voice={tourVoice}>`. Define the map at module level (outside components) so it isn't rebuilt on every render. Passing `voice` is what makes the speaker on/off button appear in the tour card.

**Content Security Policy:** Electron apps often set a CSP (meta tag in `index.html`, or headers from the main process or a Vite plugin). If it has `default-src` without a `media-src`, audio is blocked. Add `media-src 'self'` (plus `blob:` or `data:` only if the bundler inlines audio that way). Don't loosen any other directive.

## Step 4: Verify

1. Run the project's build/lint scripts.
2. Run the app, reset the tour (delete `showMeAround.lastSeenVersion` from Local Storage, or delete `show-me-around.json` in the app's user-data folder if it uses the settings file) and listen to a few steps. Check the console for CSP or 404 errors on `.wav` files.
3. Report everything once: the `/tour-guide` report (steps, files, theme), plus number of audio files and total size (`du -sh tour/voice`), and how it behaves:
   - Narration plays per step and stops when they move on or close the tour.
   - The speaker button in the card turns sound on/off; the choice is remembered.
   - Browsers block sound until the user clicks something, so a tour that starts automatically may begin silent; one click on the speaker starts it. Electron allows autoplay by default, so desktop apps usually aren't affected.
   - What's-new steps added later by `/whats-new` are silent. Running `/tour-voice` again narrates them (unchanged steps are skipped, so it's quick).

Licensing, if asked: Kokoro-82M and kokoro-js are Apache-2.0, so the generated audio can ship in commercial apps.
