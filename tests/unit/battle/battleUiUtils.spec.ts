import { describe, it, expect } from 'vitest'
import { STATUS_NAME_MAP, STATUS_EMOJI_MAP, STATUS_SHORT_LABEL_MAP } from '@/logic/battle/battleUiUtils'

describe('battleUiUtils', () => {
  it('should have all primary status names translated to Spanish', () => {
    expect(STATUS_NAME_MAP.burn).toBe('QUEMADURA')
    expect(STATUS_NAME_MAP.poison).toBe('VENENO')
    expect(STATUS_NAME_MAP.sleep).toBe('SUEÑO')
    expect(STATUS_NAME_MAP.paralysis).toBe('PARÁLISIS')
    expect(STATUS_NAME_MAP.freeze).toBe('CONGELACIÓN')
  })

  it('should have consistent emoji mappings', () => {
    expect(STATUS_EMOJI_MAP.burn).toBe('🔥')
    expect(STATUS_EMOJI_MAP.sleep).toBe('💤')
  })

  it('should have consistent short label mappings', () => {
    expect(STATUS_SHORT_LABEL_MAP.burn).toBe('BRN')
    expect(STATUS_SHORT_LABEL_MAP.freeze).toBe('FRZ')
  })
})
