const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Expo's own config, which finds the monorepo's packages by itself, plus an
// id in every bundle so crash reports can be matched to its source maps.
// The maps are uploaded during store builds (SENTRY_AUTH_TOKEN in .env).
module.exports = getSentryExpoConfig(__dirname);
