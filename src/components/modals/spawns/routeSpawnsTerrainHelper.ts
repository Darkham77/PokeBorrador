export interface ActivityTerrainFeature {
  isAvailable: boolean
  emoji: string
  levelText?: string
  fallbackText?: string
}

export interface SpecialRouteBonus {
  type: 'official' | 'extorted'
  label: string
  description: string
  cssClass: string
}

export type ClassRouteActionKind = 'cooldown' | 'button-official' | 'button-extort'

export interface ClassRouteAction {
  kind: ClassRouteActionKind
  text: string
  buttonId?: string // infra-id-ok: HTML button element identifier
  buttonClass?: string
}

export interface ResolveClassRouteActionParams {
  playerClass: string | null
  isOfficialActive: boolean
  isOfficialCooldown: boolean
  cooldownText: string
  isExtortedActive: boolean
  extortedOtherRoute: boolean
}

export function resolveActivityTerrainFeature(
  activity: { lv?: readonly number[] | number[] } | undefined,
  _activeChance: number,
  _baseChance: number,
  emoji: string
): ActivityTerrainFeature {
  if (activity && activity.lv) {
    const minLv = activity.lv[0] ?? 1
    const maxLv = activity.lv[1] ?? minLv
    return {
      isAvailable: true,
      emoji,
      levelText: `Nv. ${minLv}-${maxLv}`
    }
  }
  return {
    isAvailable: false,
    emoji,
    fallbackText: 'No disponible'
  }
}

export function resolveSpecialRouteBonus(
  isOfficialActive: boolean,
  isExtortedActive: boolean,
  timeRemainingText: string
): SpecialRouteBonus | null {
  if (isOfficialActive) {
    return {
      type: 'official',
      label: '📍 Ruta Oficial:',
      description: `+1 REP por victoria (Restan: ${timeRemainingText})`,
      cssClass: 'text-primary'
    }
  }
  if (isExtortedActive) {
    return {
      type: 'extorted',
      label: '🏴‍☠️ Extorsionada:',
      description: `x1.5 ₽ por victoria (Restan: ${timeRemainingText})`,
      cssClass: 'text-danger'
    }
  }
  return null
}

export function resolveClassRouteAction(
  params: ResolveClassRouteActionParams
): ClassRouteAction | null {
  if (params.playerClass === 'entrenador') {
    if (params.isOfficialCooldown && !params.isOfficialActive) {
      return { kind: 'cooldown', text: `📍 Cooldown Oficial: ${params.cooldownText}` }
    }
    if (!params.isOfficialActive) {
      return {
        kind: 'button-official',
        text: '📍 MARCAR RUTA OFICIAL',
        buttonId: 'btn-establish-official-route',
        buttonClass: 'btn-vicio-info btn-vicio-sm w-full btn-establish-route'
      }
    }
  }

  if (params.playerClass === 'rocket') {
    if (params.extortedOtherRoute) {
      return { kind: 'cooldown', text: '🏴‍☠️ Ya extorsionaste otra ruta hoy' }
    }
    if (!params.isExtortedActive) {
      return {
        kind: 'button-extort',
        text: '🏴‍☠️ EXTORSIONAR RUTA',
        buttonId: 'btn-extort-route',
        buttonClass: 'btn-vicio-danger btn-vicio-sm w-full btn-establish-route'
      }
    }
  }

  return null
}
