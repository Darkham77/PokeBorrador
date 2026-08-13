/**
 * Option Monad: Represents optional values without ambiguous null/undefined semantics.
 */
export type Option<T> =
  | { readonly kind: 'some'; readonly value: T }
  | { readonly kind: 'none' };

/**
 * Result Monad: Represents either a successful computation value or a explicit domain error.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
