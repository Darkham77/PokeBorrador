// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModalStore } from '@/stores/modals'

// Mock the registry to avoid importing async components during store tests
vi.mock('@/logic/modals/registry', () => ({
  MODAL_REGISTRY: {
    TestA: { name: 'TestA' },
    TestB: { name: 'TestB' },
    DebugStackTest: { name: 'DebugStackTest' }
  }
}))

describe('ModalStore Stacking (LIFO)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should push modals onto the stack and maintain order', () => {
    const store = useModalStore()
    
    store.open('TestA', { val: 1 })
    store.open('TestB', { val: 2 })
    
    expect(store.stack.length).toBe(2)
    expect(store.stack[0].name).toBe('TestA')
    expect(store.stack[1].name).toBe('TestB')
  })

  it('should close the top-most modal (LIFO)', () => {
    const store = useModalStore()
    
    store.open('TestA')
    store.open('TestB')
    
    store.closeTop()
    
    expect(store.stack.length).toBe(1)
    expect(store.stack[0].name).toBe('TestA')
  })

  it('should close a specific modal by ID', () => {
    const store = useModalStore()
    
    const idA = store.open('TestA')
    store.open('TestB')
    
    store.close(idA)
    
    expect(store.stack.length).toBe(1)
    expect(store.stack[0].name).toBe('TestB')
  })

  it('should close all modals', () => {
    const store = useModalStore()
    
    store.open('TestA')
    store.open('TestB')
    store.closeAll()
    
    expect(store.stack.length).toBe(0)
  })

  it('should correctly report isOpen status', () => {
    const store = useModalStore()
    
    store.open('TestA')
    expect(store.isOpen('TestA')).toBe(true)
    expect(store.isOpen('TestB')).toBe(false)
  })
})
