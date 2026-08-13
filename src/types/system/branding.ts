declare const __brand: unique symbol;

/**
 * Nominal Brand Type helper.
 * Attaches a compile-time brand symbol to a primitive type to prevent accidental assignability across distinct domains.
 * Example: `type PokemonSpeciesId = Brand<string, 'PokemonSpeciesId'>;`
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * Constructs a branded nominal value from a validated primitive.
 */
export function toBrand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>;
}

/**
 * Strips the nominal brand tag, returning the underlying primitive value.
 */
export function unbrand<T, B extends string>(branded: Brand<T, B>): T {
  return branded as T;
}
