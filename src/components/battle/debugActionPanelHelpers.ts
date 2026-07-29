import { PDEX_ORDER, GEN2_PDEX_ORDER, requirePokemonSpeciesId, type PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { hasPokemonSpriteId, requirePokemonSpriteValue } from '@/data/pokemon/spriteMapping'

const ALL_PDEX: readonly PokemonSpeciesId[] = [...PDEX_ORDER, ...GEN2_PDEX_ORDER]

const resolveToSpriteNumber = (fullId: string): { numId: string; rest: string[] } => {
  const parts = fullId.split('_')

  for (let i = parts.length; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('_').toLowerCase()
    if (hasPokemonSpriteId(candidate)) {
      return { numId: String(requirePokemonSpriteValue(candidate)), rest: parts.slice(i) }
    }
  }

  if (parts[0] !== undefined && /^\d+$/.test(parts[0])) {
    return { numId: parts[0], rest: parts.slice(1) }
  }

  throw new Error(`[DebugActionPanel] Unknown pokemon id: ${fullId}`)
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

function requireSpeciesFromDebugBase(baseId: string): PokemonSpeciesId {
  const cleanBase = baseId.trim().toLowerCase()
  if (/^\d+$/.test(cleanBase)) {
    const species = ALL_PDEX[Number(cleanBase) - 1]
    if (species) return species
    throw new Error(`[DebugActionPanel] Unknown pokedex number: ${baseId}`)
  }
  return requirePokemonSpeciesId(cleanBase)
}

export const constructPokemonId = (baseId: string, variant: string, gender: string): PokemonSpeciesId => {
  let id = requireSpeciesFromDebugBase(baseId)
  const cleanVariant = variant.trim().toLowerCase()
  const cleanGender = gender.trim().toLowerCase()

  if (cleanVariant) {
    id += `_${cleanVariant}`
  }
  if (cleanGender) {
    id += `_${cleanGender}`
  }
  return requirePokemonSpeciesId(id)
}
