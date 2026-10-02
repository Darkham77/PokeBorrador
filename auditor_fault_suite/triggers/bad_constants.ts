/**
 * auditor_fault_suite/triggers/bad_constants.ts
 *
 * FAULT TRIGGER: Duplicate constants and invalid numeric constant prefixes.
 */

// Trigger: duplicate-constant-value
export const CONSTANT_FIRST_DUPLICATE = "UNIQUE_HARDCODED_DUPLICATE_STRING_VALUE_12345";
export const CONSTANT_SECOND_DUPLICATE = "UNIQUE_HARDCODED_DUPLICATE_STRING_VALUE_12345";

// Trigger: unallowed numeric constant prefix (must start with BASE_ or TAX_)
export const INVALID_NUMERIC_PREFIX_CONSTANT = 999.99;
