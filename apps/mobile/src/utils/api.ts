import { httpsCallable } from 'firebase/functions';
import { copy } from '@grandcityrace/shared';
import { functions } from '../firebase';

// Everything that decides a race goes through the server functions, and
// every call goes through here. Each answer carries the server's time, which
// sets the phone's clock, so every phone counts down to the same start.
// Without a connection an action isn't kept for later: the player is told
// and tries again.

let clockOffset = 0;

// The time by the server's clock
export function serverNow(): number {
	return Date.now() + clockOffset;
}

// Each action carries an id, so the server never does it twice
function newRequestId(): string {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

// Without a connection a call doesn't always fail: it can sit and wait for
// the network to come back, the sign-in token first. So it gets a limit.
const LIMIT_MS = 8000;

// What a lost connection looks like; anything else is the server saying no
const UNREACHABLE = ['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal'];

// An action that didn't get through keeps its id, so that trying again
// can't do it twice if the first attempt arrives after all
const unsent = new Map<string, string>();

type Data = Record<string, unknown>;

// Calls a server function as the signed-in player. Errors carry the
// server's own sentence ("Not enough coins"), ready to show. `retryKey`
// names the action, so a retry of the same one reuses its id.
export async function call<T>(fn: 'play' | 'host', data: Data, retryKey?: string): Promise<T> {
	const requestId = (retryKey && unsent.get(retryKey)) || newRequestId();
	const sentAt = Date.now();
	try {
		const { data: result } = await Promise.race([
			httpsCallable<Data, T & { serverTime?: number }>(functions, fn)({ requestId, ...data }),
			new Promise<never>((_, reject) =>
				setTimeout(() => reject({ code: 'functions/deadline-exceeded' }), LIMIT_MS),
			),
		]);
		if (retryKey) unsent.delete(retryKey);
		if (typeof result.serverTime === 'number') {
			// The server's time was read halfway through the round trip
			clockOffset = result.serverTime - (sentAt + Date.now()) / 2;
		}
		return result;
	} catch (e) {
		if (UNREACHABLE.includes((e as { code?: string })?.code ?? '')) {
			if (retryKey) unsent.set(retryKey, requestId);
			throw new Error(copy.network.noConnection);
		}
		if (retryKey) unsent.delete(retryKey);
		throw new Error((e as Error)?.message ?? copy.network.somethingWrong);
	}
}

// A player's action in their game
export function play<T = Record<string, unknown>>(action: string, data: Data, retryKey?: string): Promise<T> {
	return call<T>('play', { action, ...data }, retryKey);
}
