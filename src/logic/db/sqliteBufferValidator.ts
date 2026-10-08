/**
 * src/logic/db/sqliteBufferValidator.ts
 *
 * Single Source of Truth for validating SQLite binary buffers against truncation,
 * corruption, and incomplete HTTP uploads.
 */

export const SQLITE_MAGIC_HEADER = 'SQLite format 3\0' as const;
const SQLITE_HEADER_BYTE_LENGTH = 16 as const;

/**
 * Validates whether a given buffer is a non-empty, structurally valid SQLite database
 * starting with the canonical 'SQLite format 3\0' magic bytes.
 */
export function isValidSqliteBuffer(
  buffer: Uint8Array | Buffer | null | undefined,
  expectedLength?: number
): boolean {
  if (!buffer || buffer.length < SQLITE_HEADER_BYTE_LENGTH) {
    return false;
  }

  if (expectedLength !== undefined && expectedLength > 0 && buffer.length < expectedLength) {
    return false;
  }

  // Inspect the first 16 bytes for the magic signature
  const headerSlice = buffer.subarray(0, SQLITE_HEADER_BYTE_LENGTH);
  const headerStr = typeof Buffer !== 'undefined' && Buffer.isBuffer(headerSlice)
    ? headerSlice.toString('utf-8')
    : new TextDecoder('utf-8').decode(headerSlice);

  return headerStr === SQLITE_MAGIC_HEADER;
}
