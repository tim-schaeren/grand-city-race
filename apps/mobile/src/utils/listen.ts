import {
	onSnapshot,
	type DocumentData,
	type DocumentReference,
	type DocumentSnapshot,
	type Query,
	type QuerySnapshot,
} from 'firebase/firestore';

// A listener that fails once is dead for good, and Firestore doesn't try
// again. Right after joining, the rules may not see the membership yet, and a
// phone may be offline or between networks, so every live read in the app
// goes through here: it tries again, backing off, until the server agrees or
// the caller stops listening. `onError` hears each failure, for a screen
// that shouldn't keep showing "loading" meanwhile.
export function listen<T = DocumentData>(
	ref: Query<T>,
	onNext: (snap: QuerySnapshot<T>) => void,
	onError?: (error: Error) => void,
): () => void;
export function listen<T = DocumentData>(
	ref: DocumentReference<T>,
	onNext: (snap: DocumentSnapshot<T>) => void,
	onError?: (error: Error) => void,
): () => void;
export function listen(ref: any, onNext: (snap: any) => void, onError?: (error: Error) => void): () => void {
	let unsubscribe: (() => void) | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let stopped = false;
	let attempt = 0;

	const start = () => {
		unsubscribe = onSnapshot(
			ref,
			(snap: unknown) => {
				attempt = 0;
				onNext(snap);
			},
			(error: Error) => {
				unsubscribe = null;
				if (stopped) return;
				onError?.(error);
				timer = setTimeout(start, Math.min(30000, 1000 * 2 ** attempt++));
			},
		);
	};

	start();
	return () => {
		stopped = true;
		if (timer) clearTimeout(timer);
		unsubscribe?.();
	};
}
