# Writing good tour steps

Users skim tours, so every word has to earn its place.

## Rules
- **Title:** 2–5 words, names the feature. "Export your data", not "The Export Button".
- **Body:** 1–2 sentences, max ~200 characters. Say what it does for the user, then how to use it.
- Use the exact label the user sees in the UI ("Click **New project**" → write `Click "New project"`). The body is plain text: no Markdown, no HTML.
- Never write "click here", "this button", or describe position ("top right"). The spotlight already shows where.
- One idea per step. If a screen has three features, that is three steps, or pick the most important one.
- Second person, present tense, friendly but not cute.

## Good vs bad

| Bad | Good |
|---|---|
| **Button** — This is the export button. Click here to export. | **Export your data** — Save any table as a CSV file to open in Excel. |
| **Sidebar** — The sidebar on the left contains navigation links to all the different pages of the application. | **Find your way** — Jump between Projects, Reports and Settings from here. |
| **Settings** — Settings. | **Make it yours** — Change the theme, language and notifications in Settings. |

## Shape of a basic tour
1. Welcome (no target): what the app is for, in one sentence.
2. Navigation: where things live.
3. The main action (the thing users open the app to do).
4. 2–5 secondary features, in the order a new user would need them.
5. Last step: point at the tour buttons (`tour-buttons`): "Replay this tour any time, and click the sparkle to see what's new after each update."
