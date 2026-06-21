import { describe, it, expect } from 'vitest'
import { STATUS_NAME_MAP, STATUS_EMOJI_MAP, STATUS_SHORT_LABEL_MAP } from '@/logic/battle/battleUiUtils'

describe('battleUiUtils', () => {
  it('should have all primary status names translated to Spanish', () => {
    expect(STATUS_NAME_MAP.brn).toBe('QUEMADURA')
    expect(STATUS_NAME_MAP.psn).toBe('VENENO')
    expect(STATUS_NAME_MAP.slp).toBe('SUEÑO')
    expect(STATUS_NAME_MAP.par).toBe('PARÁLISIS')
    expect(STATUS_NAME_MAP.frz).toBe('CONGELACIÓN')
  })

  it('should have consistent emoji mappings', () => {
    expect(STATUS_EMOJI_MAP.brn).toBe('🔥')
    expect(STATUS_EMOJI_MAP.slp).toBe('💤')
  })

  it('should have consistent short label mappings', () => {
    expect(STATUS_SHORT_LABEL_MAP.brn).toBe('BRN')
    expect(STATUS_SHORT_LABEL_MAP.frz).toBe('FRZ')
  })
})
