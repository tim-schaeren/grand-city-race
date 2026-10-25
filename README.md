# Grand City Race 2026

A scavenger hunt / city race app you can play with your friends.

Licensed under [GPL v3](LICENSE) — free to use, modify, and distribute, but derivatives must remain open source under the same license.

## Project structure

```
gcr26/
├── apps/
│   ├── mobile/       React Native (Expo SDK 57) — iOS & Android
│   └── admin/        React + Vite + Tailwind — web admin console
└── packages/
    └── shared/       Shared TypeScript types and constants
```

This is an npm workspaces monorepo. Run `npm install` from the root to install all dependencies.

## Tech stack

| Layer         | Technology                                               |
| ------------- | -------------------------------------------------------- |
| Mobile        | Expo (React Native), React Navigation, Firebase JS SDK   |
| Admin         | React, Vite, Tailwind CSS, React Router, Firebase JS SDK |
| Backend       | Firebase Auth, Firestore, Cloud Functions                |
| Mobile builds | EAS Build (Expo Application Services)                    |
| Admin hosting | Netlify (auto-deploys from `main`)                       |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, the local Firebase emulator workflow, and how to submit a PR.

---

## Builds & deployment

### Admin (Netlify)

Deploys automatically on every push to `main`. Build config is in `netlify.toml`.

### Server functions

Everything that decides a race runs in Cloud Functions, in `apps/functions`
(TypeScript, region `europe-west1`, next to the database). Phones and the
console call them; they check the caller and write the result in one
transaction. Three callable functions, each a family of actions:

| Function | Does                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| `play`   | A player: join with a code, teams, unlock, distance, answers, hints, items, deleting their account |
| `host`   | A game's hosts: start, pause, resume, end, reset, teams and players, coins, co-hosts, push, the recap, deleting the game |
| `admin`  | Platform admins: delete an account, grant admin                              |

Two more run by themselves: `onQuestWritten` refreshes what teams see when a
host edits a quest mid-race, and `cleanup` deletes trails a week after a race
(building its recap first if nobody did) and old request records.

Every player action carries a request id, so a retry never pays or solves
twice. Without a connection the app tells the player and they try again; a
retry of the same action reuses its id (`apps/mobile/src/utils/api.ts`).
Arriving at a place and distance walked are retried by the app itself. Every
answer carries the server's time, which the app sets its clock by.

They are bundled with the shared package by `apps/functions/build.mjs` into
`apps/functions/dist`, which `firebase deploy --only functions` deploys.
Locally they run in the emulators:

```bash
npm run build --workspace=apps/functions
firebase emulators:start --only auth,firestore,functions --project demo-gcr
node local/functions-test.mjs    # plays a race end to end; seeds its own game
```

The app and console connect to the functions emulator along with the others.

### Crash reports

The app and the console report crashes to Sentry (EU region, org
`da8ba6275eca`, projects `grand-city-race-app` and `grand-city-race-console`),
never while developing and without names, emails or positions. Their keys are
in `apps/mobile/src/utils/crashes.ts` and `apps/admin/src/crashes.js`.

Builds upload source maps, so reports point at the real code, when they have
`SENTRY_AUTH_TOKEN` (a Sentry organization token): in `apps/mobile/.env` for
store builds, and in Netlify's environment for the console. Without it they
build as before, minus the upload.

### Patched dependencies

`patches/` holds fixes to third-party packages, applied by `patch-package` after
every `npm install`. `expo-location` copies Android sensor readings instead of
keeping a reference to them; on some phones the compass froze without it.

### Mobile (iOS)

Builds are done locally using EAS for credential management. A single command builds and submits to TestFlight:

```bash
cd apps/mobile
npm run ship
```

This sources `.env` so Firebase config is baked in, builds locally with EAS, and uploads the resulting IPA straight to App Store Connect with Xcode's `altool`. Build numbers are auto-incremented. Uploading directly avoids the EAS Submit queue, which can be slow on the free tier.

Upload needs one of these in `apps/mobile/.env`:

- **App Store Connect API key** (preferred — no 2FA, doesn't expire): generate a key with the App Manager role under App Store Connect → Users and Access → Integrations → Keys, save the downloaded `.p8` as `~/.appstoreconnect/private_keys/AuthKey_<KEY_ID>.p8`, then set `ASC_KEY_ID` and `ASC_ISSUER_ID`.
- **App-specific password**: create one at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security, then set `APPLE_APP_SPECIFIC_PASSWORD` (with `APPLE_ID`).

After uploading, Apple takes ~10 minutes to process. Then go to [App Store Connect → TestFlight](https://appstoreconnect.apple.com) to add testers.

### Mobile (Android)

```bash
cd apps/mobile
npm run ship:android
```

Builds an app bundle locally with EAS and uploads it straight to the Play **internal testing** track with `fastlane supply`, skipping the EAS Submit queue. Version codes are auto-incremented.

Needs `apps/mobile/play-service-account.json`: a Google service account key whose account is invited in Play Console → Users and permissions with release and testing-track access. The same key can serve both Play submissions and FCM push, so one key from Firebase Console → Project settings → Service accounts is enough. It is gitignored — never commit it.

Push notifications additionally need that key uploaded to EAS once:

```bash
eas credentials   # Android → preview → Google Service Account → FCM V1
```

The signing keystore is managed by EAS. It is the upload key for the Play listing, so back it up (`eas credentials` can export it) and never replace it.

---

### Store listings

Everything the App Store and Play listings need lives in `apps/mobile/store/`:
the listing text and privacy answers (`listing.md`), screenshots for both
stores, the Play feature graphic, and in `source/` what they are rendered
from. Two scripts in `local/` support them:

- `seed-demo.mjs` fills the local emulator with a believable race to take
  screenshots of.
- `seed-recap.mjs` turns that race into a finished one, with routes, curses,
  robberies and shields, to try the recap on. `seed-demo.mjs` brings the live
  race back.
- `setup-review.mjs` creates the app reviewers' accounts and demo race in
  production, and resets it between review rounds. Its passwords live in
  `apps/mobile/store/review-credentials.local.md`, which is never committed.

## Firestore

### Security rules

Rules live in `firestore.rules`. Deploy with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

The server functions write everything that decides a race; the rules decide
who may read what (answers stay with hosts, a team's coins and items with the
team) and check the little people still write directly: their profile, their
position and trail, chat, and a host's own content. They have a test suite. Run it against a throwaway project on its own ports,
leaving your dev data alone:

```bash
firebase emulators:start --project rules-test --config firebase.rules-test.json
node local/rules-test.mjs
```

It covers a platform admin, a host, a player, a teammate, a rival team and an
outsider. Add a case whenever you touch the rules.

### Roles

Two separate things:

- **Platform admin** — an `admin` claim on the sign-in, granted from the Users
  page (only the server can set it). Runs every game and is the only role that
  sees the Users page: every account, the games each one is in and hosts, and
  deleting an account for someone who can't do it from the app.
- **Host** — listed in a game's `hostIds`. Runs that game and sees nothing of
  any other. Whoever creates a game becomes its host, so anyone who signs up on
  the web console can host their own race.

### How people get into a game

A game has a `joinCode`, shown on its Game page in the console. Players enter it
in the app; the server finds the game and adds them to `games/{id}/players`,
the one record of who is in a game and on which team. Someone can be in
several games; the app shows the most recent one that isn't over. A host can
also add someone who has an account by email.

Everyone in a game can read its player list (the team picker names who is in
each team), so it holds names only. Profiles hold email addresses and push
tokens and are private to their owner.

### Data model

See `packages/shared/src/types.ts` for the full data model and
`packages/shared/src/paths.ts` for where everything lives. Everything a race
produces sits under its game:

| Path                                   | Holds                                                         |
| -------------------------------------- | ------------------------------------------------------------- |
| `users/{uid}`                          | Name, email, push tokens; private to its owner                 |
| `settings/app`                         | The oldest app version still let in                           |
| `games/{id}`                           | Settings, `hostIds`, `joinCode`, and the race's state (server) |
| `games/{id}/quests`                    | The full quests, answers included — hosts only                 |
| `games/{id}/players`                   | Who is in the game and on which team                           |
| `games/{id}/positions`                 | Each player's last position — their team and the hosts         |
| `games/{id}/trail`                     | Route points — hosts only; deleted a week after the race       |
| `games/{id}/teams/{id}`                | What everyone sees of a team: name, colour, members, progress  |
| `games/{id}/teams/{id}/private/state`  | Coins, items, and the team's view of its current quest — the team and its hosts |
| `games/{id}/teams/{id}/coinLedger`     | Why a host changed a team's balance                            |
| `games/{id}/activity`                  | The bulletin board; entries are `public` or `team`-private     |
| `games/{id}/messages`                  | Chat, one thread per team, between that team and the hosts     |
| `games/{id}/attempts`                  | Rejected answers — hosts only                                  |
| `games/{id}/recap/summary`             | The race recap: the server builds it, players read it once shown |
| `games/{id}/requests`                  | Results of actions already done, so retries change nothing     |

### Copy

Every word the player app shows lives in `packages/shared/src/copy/en.ts`,
grouped by screen: buttons, messages, the activity feed, item names and
descriptions, sign-in errors, and what the server functions say to players.
Change wording there, not in the screens. Sentences with names or numbers are
small functions; keep their `${...}` parts. A second language is a copy of the
file (`de.ts`), which TypeScript checks for completeness.

The console's words are in `packages/shared/src/copy/console.en.ts`, grouped by
screen; texts both sides show (items, themes, the feed) stay in `en.ts`. The
console is plain JavaScript, so `node local/check-console-copy.mjs` checks that
every catalog name it uses exists. The manuals and legal pages are long-form
and stay in their pages.

### Themes and icons

A host picks a look per game in the console (`themeId` on the game): **Basic**
(black on white), **Retro** (Tangerine, Black Cherry and Cool Blue, in
Righteous), **Night** (navy and taxi yellow, in Bebas Neue), **Arcade** (black
and neon, in Press Start 2P) or **Bern** (sandstone, Bern red and Aare blue-green,
in Hind). Themes are presets in `packages/shared/src/themes.ts`, each with
every colour role checked for contrast against its own background, which is why
hosts choose a preset rather than free colours. The app applies the theme from
the team picker on; sign-in and joining stay Basic.

A new theme is one entry in `themes.ts` (colour roles, font with a size
factor, shape, and whether it is dark, which turns the status bar light), its
name in the copy catalog, and, for a new font, the file in
`apps/mobile/assets/fonts/` loaded in `App.tsx` plus a Google Fonts link in the
console for its preview. Old app versions show an unknown theme as Basic.

Screens build their styles from the theme through
`apps/mobile/src/theme/primitives.ts` (headings, labels, panels, buttons,
inputs) rather than hardcoded colours. Icons are Material Design Icons
everywhere — `@expo/vector-icons` in the app, `@mdi/js` in the console — named
in `packages/shared/src/icons.ts`. The UI uses no emoji.

App icons and splash come from `apps/mobile/app-icons/`; Expo generates every
size from the masters referenced in `app.json`.

### The recap

After a race, hosts build a recap on the Game page: a replay of every team's
route with its curses, robberies, shields, gifts and finishes, places over
time, awards, a card per team, and the final standings. `buildRecap` in
`packages/shared/src/recap.ts` turns the race (game, teams, activity, trail)
into one document, `games/{id}/recap/summary`. It runs in the host's browser
(`apps/admin/src/utils/recap.js`), which may read the whole trail and doesn't
have a server function's time limit.

Routes are per team: members' positions are merged minute by minute (the
median), GPS spikes dropped, the line smoothed and simplified, so they are
approximate by design. Players can read the recap once a host shows it
(`publishedAt` on the recap, mirrored as `recapPublishedAt` on the game, which
the app watches). The app shows the console's own page, `/recap/{gameId}`, in a
web view and hands it the recap and the game's current theme, so the page needs
no sign-in; `EXPO_PUBLIC_WEB_URL` points the app at a local console. Resetting
a game deletes its recap.

### Public pages

The console also serves the pages the app stores require, with no sign-in:
`/privacy`, `/terms` and `/guidelines`. The app links to them from sign-up and
from a player's profile.
