import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLibraryStore } from '@/stores/library'

describe('LibraryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with closed state', () => {
    const library = useLibraryStore()
    expect(library.isOpen).toBe(false)
    expect(library.currentTab).toBe('gimnasios')
  })

  it('should open and set tab', () => {
    const library = useLibraryStore()
    library.open('captura')
    expect(library.isOpen).toBe(true)
    expect(library.currentTab).toBe('captura')
  })

  it('should close', () => {
    const library = useLibraryStore()
    library.open()
    library.close()
    expect(library.isOpen).toBe(false)
  })

  it('should switch tabs', () => {
    const library = useLibraryStore()
    library.switchTab('clases')
    expect(library.currentTab).toBe('clases')
  })
})
