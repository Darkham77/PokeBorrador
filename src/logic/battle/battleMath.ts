/**
 * src/logic/battle/battleMath.ts
 *
 * PURE MATH CORE (Zero external dependencies)
 *
 * Re-exports the modularized parts of the battle math logic (types, damage, catching).
 * This ensures backward compatibility with all files importing from battleMath.ts.
 *
 * [PureVue-Ignore]
 */

export * from './battleMathTypes.ts';
export * from './damageMath.ts';
export * from './catchMath.ts';
