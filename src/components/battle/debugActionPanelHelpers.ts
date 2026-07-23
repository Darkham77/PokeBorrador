import { PDEX_ORDER, GEN2_PDEX_ORDER, POKEMON_SPRITE_IDS } from '@/data/pokemon/pokedex'

const ALL_PDEX = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

export const resolveToSpriteNumber = (fullId: string): { numId: string; rest: string[] } => {
  const parts = fullId.split('_')
  const spriteIds = POKEMON_SPRITE_IDS as Record<string, number | string>

  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('_').toLowerCase()
    if (spriteIds[candidate] !== undefined) {
      return { numId: String(spriteIds[candidate]), rest: parts.slice(i) }
    }
  }

  if (parts[0] !== undefined && /^\d+$/.test(parts[0])) {
    return { numId: parts[0], rest: parts.slice(1) }
  }

  const idx = ALL_PDEX.indexOf((parts[0] || '').toLowerCase())
  return { numId: idx !== -1 ? String(idx + 1) : '1', rest: parts.slice(1) }
}

export const deconstructPokemonId = (fullId: string) => {
  const { numId, rest } = resolveToSpriteNumber(fullId)
  let variant = ''
  let gender = ''

  if (rest.length === 2) {
    variant = rest[0] || ''
    gender = rest[1] || ''
  } else if (rest.length === 1) {
    const lastPart = (rest[0] || '').toLowerCase()
    if (lastPart === 'm' || lastPart === 'f') {
      gender = lastPart
    } else {
      variant = rest[0] || ''
    }
  }

  return { baseId: numId, variant, gender }
}

export const constructPokemonId = (baseId: string, variant: string, gender: string) => {
  let id = baseId.trim().toLowerCase()
  const cleanVariant = variant.trim().toLowerCase()
  const cleanGender = gender.trim().toLowerCase()

  if (cleanVariant) {
    id += `_${cleanVariant}`
  }
  if (cleanGender) {
    id += `_${cleanGender}`
  }
  return id
}
