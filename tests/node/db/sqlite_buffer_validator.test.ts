import assert from 'node:assert/strict';

import { describe, it } from 'vite-plus/test';

import { isValidSqliteBuffer, SQLITE_MAGIC_HEADER } from '@/logic/db/sqliteBufferValidator.ts';

describe('SQLite Buffer Integrity Validator', () => {
  it('identifies the canonical 16-byte SQLite header', () => {
    assert.strictEqual(SQLITE_MAGIC_HEADER, 'SQLite format 3\0');
    assert.strictEqual(Buffer.byteLength(SQLITE_MAGIC_HEADER, 'utf-8'), 16);
  });

  it('rejects null, undefined, empty, or truncated buffers under 16 bytes', () => {
    assert.strictEqual(isValidSqliteBuffer(null), false);
    assert.strictEqual(isValidSqliteBuffer(undefined), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(0)), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(15)), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(8)), false);
    assert.strictEqual(isValidSqliteBuffer(new Uint8Array(1)), false);
  });

  it('rejects buffers missing the SQLite magic header', () => {
    const invalidHeader = Buffer.from('Not SQLite header!! Some random bytes');
    assert.strictEqual(isValidSqliteBuffer(invalidHeader), false);
  });

  it('rejects buffers with single corrupted byte in magic sequence', () => {
    const headerBytes = Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8');
    // Corrupt first byte
    headerBytes[0] = 0x58; // 'X' instead of 'S'
    assert.strictEqual(isValidSqliteBuffer(headerBytes), false);

    // Corrupt null terminator byte (byte 15)
    const validHeader = Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8');
    validHeader[15] = 0x20; // Space instead of null byte \0
    assert.strictEqual(isValidSqliteBuffer(validHeader), false);
  });

  it('rejects buffers whose length is less than the expected HTTP Content-Length', () => {
    const validHeader = Buffer.concat([
      Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8'),
      Buffer.alloc(100)
    ]);
    // Declared 500 bytes, but buffer only has 116 bytes (interrupted upload)
    assert.strictEqual(isValidSqliteBuffer(validHeader, 500), false);
    assert.strictEqual(isValidSqliteBuffer(validHeader, 200), false);
  });

  it('accepts valid SQLite buffers matching header and content-length', () => {
    const validBuffer = Buffer.concat([
      Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8'),
      Buffer.alloc(500)
    ]);
    assert.strictEqual(isValidSqliteBuffer(validBuffer, validBuffer.length), true);
    assert.strictEqual(isValidSqliteBuffer(validBuffer), true);
  });

  it('handles exact 16-byte header-only minimal buffer', () => {
    const minimalBuffer = Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8');
    assert.strictEqual(isValidSqliteBuffer(minimalBuffer), true);
    assert.strictEqual(isValidSqliteBuffer(minimalBuffer, 16), true);
    assert.strictEqual(isValidSqliteBuffer(minimalBuffer, 17), false);
  });

  it('correctly validates plain Uint8Array instances across WebAssembly boundaries', () => {
    const rawHeader = Buffer.from(SQLITE_MAGIC_HEADER, 'utf-8');
    const u8Array = new Uint8Array(rawHeader.buffer, rawHeader.byteOffset, rawHeader.length);
    assert.strictEqual(isValidSqliteBuffer(u8Array), true);
  });
});
