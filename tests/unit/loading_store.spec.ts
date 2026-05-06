// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLoadingStore } from '@/stores/loading'

describe('Loading Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should start a loading operation', () => {
    const store = useLoadingStore()
    store.start('test', 'Loading...')
    expect(store.isActive).toBe(true)
    expect(store.current.id).toBe('test')
    expect(store.current.message).toBe('Loading...')
  })

  it('should finish a loading operation', () => {
    const store = useLoadingStore()
    store.start('test', 'Loading...')
    store.finish('test')
    expect(store.isActive).toBe(false)
    expect(store.current).toBe(null)
  })

  it('should handle a stack of loading states', () => {
    const store = useLoadingStore()
    store.start('op1', 'First')
    store.start('op2', 'Second')
    expect(store.current.id).toBe('op2')
    
    store.finish('op2')
    expect(store.current.id).toBe('op1')
  })

  it('should prioritize global overlays', () => {
    const store = useLoadingStore()
    store.start('op1', 'Non-Global', 'Sub', false)
    store.start('op2', 'Global', 'Sub', true)
    store.start('op3', 'Most Recent Non-Global', 'Sub', false)
    
    // op2 is global, so it should be prioritized over op3 even if op3 is more recent
    expect(store.current.id).toBe('op2')
  })

  it('should update progress', () => {
    const store = useLoadingStore()
    store.start('test', 'Initial')
    store.setProgress('test', 'Updated', 'Sub')
    expect(store.current.message).toBe('Updated')
    expect(store.current.subMessage).toBe('Sub')
  })
})
