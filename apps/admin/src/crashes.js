import * as Sentry from '@sentry/react';

// Crash reports go to Sentry, in its EU region. Never while developing, and
// no names or emails: only what broke and in which browser. The project key
// isn't a secret; it ships inside the website either way.
const DSN = 'https://e603acc0108123435c3286ec2546cd77@o4512316780576768.ingest.de.sentry.io/4512316831105104';
const enabled = import.meta.env.PROD;

if (enabled) {
  Sentry.init({ dsn: DSN, sendDefaultPii: false, tracesSampleRate: 0 });
}

// For createRoot: errors React catches itself are reported too
export const rootOptions = enabled
  ? {
      onUncaughtError: Sentry.reactErrorHandler(),
      onCaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
    }
  : {};
