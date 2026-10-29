# Notely (demo)

A tiny Vite + React app with the Show Me Around tour installed, the way `/tour-voice` leaves an app:
basic tour, one what's-new step (`since: "1.1.0"`), narration, a dark theme with custom colors, and the two buttons in the header.

```bash
npm install
npm run dev
```

The tour starts on first load. To see it again, delete `showMeAround.lastSeenVersion` from Local Storage, or click **Show me around**.
To see what an updating user sees, set `showMeAround.lastSeenVersion` to `1.0.0` and reload.
