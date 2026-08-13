import type { Option, Result } from '@/types/system/result';

/**
 * Creates an Option containing a value (`some`).
 */
export function some<T>(value: T): Option<T> {
  return { kind: 'some', value };
}

/**
 * Creates an empty Option (`none`).
 */
export function none<T = never>(): Option<T> {
  return { kind: 'none' };
}

/**
 * Converts a nullable value (`T | null | undefined`) into an `Option<T>`.
 */
export function fromNullable<T>(value: T | null | undefined): Option<T> {
  return value !== null && value !== undefined ? some(value) : none();
}

/**
 * Returns the contained value of an `Option<T>`, or `fallback` if `none`.
 */
export function unwrapOr<T>(option: Option<T>, fallback: T): T {
  return option.kind === 'some' ? option.value : fallback;
}

/**
 * Creates a successful Result.
 */
export function ok<T, E = Error>(value: T): Result<T, E> {
  return { ok: true, value };
}

/**
 * Creates an error Result.
 */
export function err<T = never, E = Error>(error: E): Result<T, E> {
  return { ok: false, error };
}

/**
 * Pattern-matches over a Result, executing either `onOk` or `onErr`.
 */
export function matchResult<T, R, E = Error>(
  result: Result<T, E>,
  onOk: (value: T) => R,
  onErr: (error: E) => R
): R {
  return result.ok ? onOk(result.value) : onErr(result.error);
}
