---
name: whats-new
description: Adds "New in x.y.z" steps to an existing "Show me around" tour for the features built since the last release, and keeps the tour healthy - updates steps for features that changed again, promotes important older features into the basic tour, and retires old what's-new steps. Reads git history and confirms everything with the user in one table. Never adds narration. Run before each release with /whats-new [version].
argument-hint: "[release version, e.g. 1.4.0]"
disable-model-invocation: true
---

# What's new

Users who **update** the app see a short tour of only the new features, once. This skill writes those steps and tidies the older ones. The runtime installed by `/tour-guide` already shows them: a step with `"since": "1.4.0"` appears for users whose last-seen version is older than 1.4.0, with a "New in 1.4.0" badge.

Release version requested by the user: $ARGUMENTS
(If that shows the literal text `$ARGUMENTS`, your tool doesn't fill it in: use whatever the user typed after the command, if anything.)

Paths like `scripts/` are relative to this skill's folder (the folder containing this SKILL.md). `../tour-guide/` is a sibling skill, installed next to this one. Run the scripts with `node`; they work on macOS, Linux and Windows.

## How the two tours share tour.json (explain this if the user asks)

| Moment | What the user sees |
|---|---|
| Fresh install (or "Show me around" button) | **Basic tour**: steps without `since` |
| Update | **What's new**: steps with `since` newer than the version they last saw, at most 6 (newest win) |

The two lists never reach the same user at the same time. So a feature can be in **both**: a basic step teaches it to new users, and its what's-new step announces it to updating users. That's why promoting a feature to the basic tour *copies* it and keeps the what's-new step: users who skipped that release still get their catch-up.

## Step 1: Preconditions

1. Find `tour.json` outside `node_modules`. None → stop and tell the user to run `/tour-guide` first.
2. Run `node scripts/changes-since-release.mjs <project root>`.
   - `git: not a repository` → you can't see what changed. Ask the user to describe the new features in their own words and continue from Step 3 with that list.
   - `base: none` → no release tags. Ask which commit, branch or date the last release was, then rerun with it as the second argument.
3. Uncommitted changes listed → they count too (features often aren't committed yet). Mention that you're including them.
4. Run the health check: `node ../tour-guide/scripts/check-tour.mjs <tour.json> <source folder>`. Keep its report for Step 4.
5. Runtime version: if the project's `tour/versions` file has no `replaces` handling, or `tour/index` doesn't export `WhatsNewButton`, the app has an older runtime. Tell the user to run `/tour-guide` first (it rebuilds and upgrades the runtime) and stop.
6. Check the app renders `<WhatsNewButton />` next to `<ShowMeAroundButton />`. If it doesn't, add it in Step 5 (same wrapper, same styling): it's how users reopen What's new after the first time.

## Step 2: Decide the version

The steps belong to the version **being released**:
- The user gave one → use it.
- `current version` is higher than `base version` → the version was already bumped; use `current version`.
- Otherwise → propose the next minor version (1.3.0 → 1.4.0) and ask. Offer to bump `package.json` to it; only do it on a yes. Without a bump, users will never see the new steps, because the runtime compares against `appVersion`. If the team's pipeline sets the version, use the number it will release and don't bump.

## Step 3: Find the user-facing changes

Read the commit list, then the diffs of the UI files (`git diff <base> -- <file>`, plus `git diff` for uncommitted work). Keep a change only if a user would **notice it in the app**:

| Keep | Skip |
|---|---|
| New screen, button, panel, shortcut, setting | Refactors, renames, moved files |
| Existing feature that now works visibly differently | Tests, CI, docs, dependency bumps |
| A capability users asked for | Bug fixes (unless the feature was unusable before) |
| | Small styling tweaks, copy edits |

Commit messages can mislead (a "refactor" can hide a feature, a "feat" can be internal): trust the diff. Aim for **1–4 new steps per release**; more than 5 → group related changes or keep the ones users will care about most.

For each change, check whether it **touches a feature the tour already covers**: the diff changes an element that has a `data-tour` used by an existing step, or the same component/screen. Those are *changed* features (Step 4b), not new ones.

## Step 4: Plan every change to tour.json

Build one plan with five parts:

**a. New features** → a new what's-new step each, `"since": "<version>"`, text written per `../tour-guide/references/writing-steps.md`.

**b. Changed features** (an existing step covers it):
- If a **basic** step covers it → update that step's text and target to match the app now.
- If a **what's-new** step from an earlier release covers it → add a new what's-new step for this version with `"replaces": ["<old step id>"]`. Write it so it makes sense on its own (some users never saw the old one): describe the feature as it is now, leading with what changed. Leave the old step's text as it was.
- If both exist, do both.

**c. Promote last release's features.** For each what's-new step from the **previous** release (the newest `since` before this version), ask: *should every new user learn this?*
- Yes → make sure the basic tour covers it. If a basic step for that feature already exists, update its text to the current app instead of adding another. If not, add a basic step (no `since`, its own id like `<feature>`; the what's-new step keeps its id) at the place in the basic order where a new user would need it.
- No → leave it as a what's-new step.
- Keep the basic tour at about 10 steps or fewer. If promoting would go over, suggest which basic steps to merge or drop.
- A step whose `replaces` points at it means the feature changed; promote the newest version of the feature, not the replaced one.

**d. Retire old steps.** The health check lists what's-new steps older than the last 5 releases. Propose deleting them (they're no longer news; the max-6 rule already hides them from users who jump many versions). Never delete a step another kept step `replaces`; delete them together.

**e. Fix health-check issues:** missing anchors (feature removed → delete or update the step; element renamed → fix the target), duplicate ids, bad `replaces`.

**Show the user the whole plan in one table before touching code** (part, step id, version, what happens, proposed title/body, evidence). Wait for them to confirm or edit.

## Step 5: Apply it

1. **Anchors:** same rules as `/tour-guide` Step 4 (`data-tour="<feature-id>"` on a real DOM element, kebab-case, nothing else changed). Reuse existing anchors.
2. **tour.json:**
   - Basic steps (no `since`) stay first, in tour order; insert promoted steps where they belong.
   - What's-new steps follow, grouped by version, oldest first; new ones go at the end.
   - Add `"route"` if the element isn't on the page the previous step ends on.
3. Run the health check again: it must report `issues: none`.
4. **No narration here.** Don't generate audio or touch the `voice` wiring. One exception, so users never hear the wrong words: if `tour/voice/` exists, delete the `.wav` file of every step whose text you edited or that you deleted (they'd still play the old text). Those steps, and the new ones, are simply silent.

## Step 6: Verify

1. Run the project's build/lint scripts.
2. Test as an updating user: set the stored last-seen version to the **previous** version (DevTools → Application → Local Storage → `showMeAround.lastSeenVersion`; or edit `show-me-around.json` in the app's user-data folder if the app uses the settings-file storage), then reload. Only the new steps should appear, with the "New in …" badge. If nothing appears, check that `appVersion` is the new version.
3. Test as a new user: clear that value and reload. The basic tour should include any promoted features.
4. Report: version; steps added, updated, promoted, retired; anchors added; files changed. If the app has narration, add one line: the new and edited steps are silent, and running `/tour-voice` narrates them. Remind the user to tag the release (`git tag v<version>`) when it ships, so the next `/whats-new` starts from there.
