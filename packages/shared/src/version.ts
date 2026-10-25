// The version of the data the player app reads and writes. Raise it in the
// release that changes data in a way older builds can't handle. Once that
// build is out in both stores, set minClientVersion on settings/app to the
// same number in the Firebase console: older builds then ask their players
// to update instead of failing in ways nobody can see.
export const CLIENT_VERSION = 1;
