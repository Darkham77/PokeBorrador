export interface HealButtonStateParams {
  isHealing: boolean
  teamCount: number
  cost: number
  money: number
}

export interface HealButtonState {
  disabled: boolean
  text: string
}

export function resolveClassSurcharge(playerClass: string | null | undefined): string | null {
  if (playerClass === 'rocket') {
    return 'Recargo: Miembro del Equipo Rocket (2x)'
  }
  if (playerClass === 'criador') {
    return 'Recargo: Criador Profesional'
  }
  return null
}

export function resolveHealButtonState(params: HealButtonStateParams): HealButtonState {
  const isPendingMoney = params.cost > 0 && params.money < params.cost
  const disabled = params.isHealing || params.teamCount === 0 || isPendingMoney
  const text = params.isHealing ? 'CURANDO...' : 'CURAR EQUIPO'
  return { disabled, text }
}
