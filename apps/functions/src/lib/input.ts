import { HttpsError, type FunctionsErrorCode } from 'firebase-functions/v2/https';
import { copy } from '@grandcityrace/shared';

// Refuses the action with a sentence the app shows as it is
export function fail(code: FunctionsErrorCode, message: string): never {
  throw new HttpsError(code, message);
}

// What a caller sends is checked here before anything reads it

const ID = /^[A-Za-z0-9_-]{1,64}$/;

export function id(value: unknown): string {
  if (typeof value !== 'string' || !ID.test(value)) fail('invalid-argument', copy.server.badRequest);
  return value;
}

export function optionalId(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : id(value);
}

export function text(value: unknown, max: number, { required = true } = {}): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (required && !s) fail('invalid-argument', copy.server.badRequest);
  return s.slice(0, max);
}

export function int(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' ? Math.floor(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) fail('invalid-argument', copy.server.badRequest);
  return n;
}

export function point(lat: unknown, lng: unknown): { lat: number; lng: number } {
  if (typeof lat !== 'number' || typeof lng !== 'number'
    || !Number.isFinite(lat) || !Number.isFinite(lng)
    || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    fail('invalid-argument', copy.server.badRequest);
  }
  return { lat, lng };
}

export function oneOf<T extends string>(value: unknown, options: readonly T[]): T {
  if (!options.includes(value as T)) fail('invalid-argument', copy.server.badRequest);
  return value as T;
}
