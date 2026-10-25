import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';

// Crash reports go to Sentry, in its EU region. Never while developing, and
// no names, emails or positions: only what broke and on which phone model.
// The project key isn't a secret; it ships inside the app either way.
const DSN = 'https://6e3c81dbde9e9678b4d4d5c69783f37d@o4512316780576768.ingest.de.sentry.io/4512316819767376';
const enabled = !__DEV__;

if (enabled) {
	Sentry.init({ dsn: DSN, sendDefaultPii: false, tracesSampleRate: 0 });
}

type Root = ComponentType<Record<string, unknown>>;

export function withCrashReports(App: Root): Root {
	return enabled ? Sentry.wrap(App) : App;
}
