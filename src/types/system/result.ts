/**
 * Option Monad: Represents optional values without ambiguous null/undefined semantics.
 */
export type Option<T> = { readonly kind: 'some'; readonly value: T } | { readonly kind: 'none' };

/**
 * Result Monad: Represents either a successful computation value or a explicit domain error.
 */
export type Result<T, E = Error> = {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: E;
};
