import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  canRefreshCleanDatabaseTemplate,
  canUseDevDatabaseBridge
} from '../../../src/logic/db/sqliteEngine.ts'

describe('SQLite E2E isolation', () => {
  it('never permits the Vite database bridge for standard contexts without GTS simulation flag', () => {
    assert.equal(canUseDevDatabaseBridge(true, true), false)
    assert.equal(canUseDevDatabaseBridge(true, false), false)
  })

  it('only permits the development bridge during GTS simulation flag', () => {
    const originalWindow = globalThis.window
    try {
      globalThis.window = { __GTS_SIMULATION__: true } as unknown as Window & typeof globalThis
      assert.equal(canUseDevDatabaseBridge(true, true), true)
      assert.equal(canUseDevDatabaseBridge(true, false), true)
      assert.equal(canUseDevDatabaseBridge(false, true), false)
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('does not use the development bridge in production', () => {
    assert.equal(canUseDevDatabaseBridge(false, false), false)
  })

  it('only permits E2E to refresh the shared immutable clean template in development', () => {
    assert.equal(canRefreshCleanDatabaseTemplate(true, true), true)
    assert.equal(canRefreshCleanDatabaseTemplate(true, false), false)
    assert.equal(canRefreshCleanDatabaseTemplate(false, true), false)
  })
})
