# Contributing to GCR26

Thanks for helping out, I appreciate it! This is a monorepo with a React Native mobile app, a React/Vite admin console and the server functions that run the game, backed by Firebase.

## Setup

Fork the repo on GitHub, then:

```bash
git clone https://github.com/YOUR_USERNAME/grand-city-race.git
cd grand-city-race
npm install
cp apps/admin/.env.example apps/admin/.env
cp apps/mobile/.env.example apps/mobile/.env
```

The `.env.example` files use placeholder values — they work as-is for local development since everything runs against the emulator. The only exception is `EXPO_PUBLIC_EMULATOR_HOST` in `apps/mobile/.env`, which needs to be set to your machine's LAN IP if testing on a physical device (see [Physical devices](#physical-devices)).

`APPLE_ID` and `ASC_APP_ID` can be left blank, they're only needed for `npm run ship`.

## Running locally

Build the server functions, then start the Firebase emulator (from the repo root):

```bash
npm run build --workspace=apps/functions
firebase emulators:start
```

Rebuild the functions after changing them; the emulator picks up the new build.

No Firebase login required. The emulator UI is at http://localhost:4000. You can browse and edit data there.

**Admin console** (http://localhost:5173):

```bash
cd apps/admin
npm run dev
```

The quest editor's phone preview is the app built for the web. Build it once, and again after changing the app's quest screens:

```bash
npm run build:preview --workspace=apps/mobile
```

**Mobile** (download Expo Go, then scan the QR in the terminal):

```bash
cd apps/mobile
npx expo start --clear
```

Both apps auto-connect to the emulator in dev mode. Data is local and ephemeral, nothing touches the real project.

## Database

### Getting admin access

Anyone can host their own games in the console. Platform admin (every game, and the Users page) is a claim on the sign-in: `seed-players.mjs` below creates `admin@grandcityrace.test` / `admin123` with it, and an admin grants it to others from the Users page.

### Seeding test players

With the emulator running:

```bash
cd apps/admin
node --env-file=.env ../../local/seed-players.mjs
```

Test account credentials are in `local/test-players.md`.

### Physical devices

If you're running Expo Go on a physical device (not a simulator), the device can't reach `localhost` on your machine. Start the emulator so it listens on your network, and set `EXPO_PUBLIC_EMULATOR_HOST` in `apps/mobile/.env` to your machine's LAN IP:

```bash
firebase emulators:start --project gcr26-d76cc --config firebase.devices.json
```

```
EXPO_PUBLIC_EMULATOR_HOST=192.168.1.x
```

### Firestore rules

Rules live in `firestore.rules`. If your PR changes them, flag it clearly in the PR description. Only the project owner can deploy them to production. Deploying requires Editor/Owner access to the Firebase project, separate from the client config.

## Submitting a PR

- Create a branch in your fork, named descriptively (`fix/quest-ordering`, `feat/team-chat`)
- Keep PRs focused. One thing at a time
- The CI workflow type-checks everything, lints the console, builds the functions, the phone preview and the console, and runs the rules and server tests against the emulators
- If you're changing Firestore rules or the shared data model (`packages/shared/src/types.ts`), call that out clearly in the PR description

## Building for mobile

Regular contributors don't need to build the app. Just use Expo Go for development. Submitting to TestFlight requires Apple credentials (`APPLE_ID`, `ASC_APP_ID` in `apps/mobile/.env`) and is handled by the project owner:

```bash
cd apps/mobile
npm run ship
```
