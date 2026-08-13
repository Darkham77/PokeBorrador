import assert from 'node:assert/strict'
import { describe, it } from 'vitest'
import {
  canRefreshCleanDatabaseTemplate,
  canUseDevDatabaseBridge
} from '../../../src/logic/db/sqliteEngine.ts'

describe('SQLite E2E isolation', () => {
  it('never permits the Vite database bridge for an E2E in-memory context', () => {
    assert.equal(canUseDevDatabaseBridge(true, true), false)
  })

  it('keeps the development bridge available outside E2E', () => {
    assert.equal(canUseDevDatabaseBridge(true, false), true)
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
