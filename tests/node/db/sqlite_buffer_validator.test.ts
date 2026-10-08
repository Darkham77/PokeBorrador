// test-fragmentation-ok: Isolated single-purpose regression test for SQLite buffer validation
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { isValidSqliteBuffer, SQLITE_MAGIC_HEADER } from '@/logic/db/sqliteBufferValidator.ts';

describe('SQLite Buffer Integrity Validator', () => {
  it('identifies the canonical 16-byte SQLite header', () => {
    assert.strictEqual(SQLITE_MAGIC_HEADER, 'SQLite format 3\0');
  });

  it('rejects null, undefined, empty, or truncated buffers under 16 bytes', () => {
    assert.strictEqual(isValidSqliteBuffer(null), false);
    assert.strictEqual(isValidSqliteBuffer(undefined), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(0)), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(15)), false);
  });

  it('rejects buffers missing the SQLite magic header', () => {
    const invalidHeader = Buffer.from('Not SQLite header!! Some random bytes');
    assert.strictEqual(isValidSqliteBuffer(invalidHeader), false);
  });

  it('rejects buffers whose length is less than the expected HTTP Content-Length', () => {
    const validHeader = Buffer.concat([
      Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8'),
      Buffer.alloc(100)
    ]);
    // Declared 500 bytes, but buffer only has 116 bytes (interrupted upload)
    assert.strictEqual(isValidSqliteBuffer(validHeader, 500), false);
  });

  it('accepts valid SQLite buffers matching header and content-length', () => {
    const validBuffer = Buffer.concat([
      Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8'),
      Buffer.alloc(500)
    ]);
    assert.strictEqual(isValidSqliteBuffer(validBuffer, validBuffer.length), true);
    assert.strictEqual(isValidSqliteBuffer(validBuffer), true);
  });
});
