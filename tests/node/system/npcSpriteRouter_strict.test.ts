import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { resolveNpcSprite, type NpcSpriteId } from '../../../src/logic/utils/npcSpriteRouter.ts'
import { VALID_NPC_SPRITES } from '../../../src/data/pokemon/npcSpriteCatalog.ts'

describe('npcSpriteRouter strict validation', () => {
  it('should resolve valid catalog sprites without error', () => {
    const sprite = resolveNpcSprite('youngster')
    assert.equal(sprite, 'youngster')
    assert.ok(VALID_NPC_SPRITES.includes('youngster'))
  })

  it('should throw an explicit Error when an invalid sprite identifier is passed (runtime cast simulates unknown input)', () => {
    assert.throws(() => {
      resolveNpcSprite('Simulador E2E' as NpcSpriteId)
    }, /Invalid NPC sprite identifier: 'Simulador E2E'/)
  })
})
