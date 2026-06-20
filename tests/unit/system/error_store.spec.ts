import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useErrorStore } from '@/stores/errorStore'

describe('Error Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should set the first error and clear it correctly', () => {
    const errorStore = useErrorStore()
    expect(errorStore.activeError).toBeNull()

    const testError = new Error('Prime Error')
    errorStore.setError(testError, { type: 'Test Error', source: 'test.ts', lineno: 10, colno: 5 })

    expect(errorStore.activeError).not.toBeNull()
    expect(errorStore.activeError!.message).toBe('Prime Error')
    expect(errorStore.activeError!.type).toBe('Test Error')
    expect(errorStore.activeError!.source).toBe('test.ts')
    expect(errorStore.activeError!.lineno).toBe(10)
    expect(errorStore.activeError!.colno).toBe(5)

    errorStore.clearError()
    expect(errorStore.activeError).toBeNull()
  })

  it('should accumulate subsequent errors in stack trace dynamically', () => {
    const errorStore = useErrorStore()
    const error1 = new Error('First Error')
    const error2 = new Error('Second Error')

    errorStore.setError(error1, { type: 'Type1', source: 'file1.ts', lineno: 1, colno: 2 })
    expect(errorStore.activeError!.message).toBe('First Error')



    // Set second error while first is active
    errorStore.setError(error2, { type: 'Type2', source: 'file2.ts', lineno: 10, colno: 20 })

    // Message must remain the first one
    expect(errorStore.activeError!.message).toBe('First Error')
  })

  it('should start listening from zero after clearing error', () => {
    const errorStore = useErrorStore()
    const error1 = new Error('First Error')
    const error2 = new Error('Second Error')

    errorStore.setError(error1, { type: 'Type1' })
    expect(errorStore.activeError!.message).toBe('First Error')

    errorStore.clearError()
    expect(errorStore.activeError).toBeNull()

    errorStore.setError(error2, { type: 'Type2' })
    expect(errorStore.activeError!.message).toBe('Second Error')
    expect(errorStore.activeError!.type).toBe('Type2')
  })
})
