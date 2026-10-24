# Contributing to GCR26

Thanks for helping out, I appreciate it! This is a monorepo with two apps: a React Native mobile app and a React/Vite admin console, backed by Firebase.

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

Start the Firebase emulator first (from the repo root):

```bash
firebase emulators:start
```

No Firebase login required. The emulator UI is at http://localhost:4000. You can browse and edit data there.

**Admin console** (http://localhost:5173):

```bash
cd apps/admin
npm run dev
```

**Mobile** (download Expo Go, then scan the QR in the terminal):

```bash
cd apps/mobile
npx expo start --clear
```

Both apps auto-connect to the emulator in dev mode. Data is local and ephemeral, nothing touches the real project.

## Database

### Getting admin access

The admin console requires your Firestore user document to have `isAdmin: true`. Sign up via the mobile app first, then open the emulator UI at http://localhost:4000, find your document in the `users` collection, and set `isAdmin: true`.

### Seeding test players

With the emulator running:

```bash
cd apps/admin
node --env-file=.env ../../local/seed-players.mjs
```

Test account credentials are in `local/test-players.md`.

### Physical devices

If you're running Expo Go on a physical device (not a simulator), the device can't reach `localhost` on your machine. Set `EXPO_PUBLIC_EMULATOR_HOST` in `apps/mobile/.env` to your machine's LAN IP:

```
EXPO_PUBLIC_EMULATOR_HOST=192.168.1.x
```

### Firestore rules

Rules live in `firestore.rules`. If your PR changes them, flag it clearly in the PR description. Only the project owner can deploy them to production. Deploying requires Editor/Owner access to the Firebase project, separate from the client config.

## Submitting a PR

- Create a branch in your fork, named descriptively (`fix/quest-ordering`, `feat/team-chat`)
- Keep PRs focused. One thing at a time
- The CI workflow runs `npm ci` and builds the admin app to catch obvious breakage
- If you're changing Firestore rules or the shared data model (`packages/shared/src/types.ts`), call that out clearly in the PR description

## Building for mobile

Regular contributors don't need to build the app. Just use Expo Go for development. Submitting to TestFlight requires Apple credentials (`APPLE_ID`, `ASC_APP_ID` in `apps/mobile/.env`) and is handled by the project owner:

```bash
cd apps/mobile
npm run ship
```
