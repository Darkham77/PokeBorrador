import type { DebugSystem } from '@/stores/debug'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { ONE_HOUR_MS, ONE_DAY_MS } from '@/logic/constants/items.ts'

export function registerTimeTools(debug: DebugSystem) {
  const game = useGameStore()
  const ui = useUIStore()

  debug.register({
    id: 'core-set-mock-time',
    label: 'SET MOCK TIME',
    command: 'setMockTime',
    category: 'time',
    action: (d: string) => game.db.setMockTime(d),
    description: 'Simula una fecha/hora específica.'
  })

  debug.register({
    id: 'core-reset-time',
    label: 'RESET TIME',
    command: 'resetTime',
    category: 'time',
    action: () => game.db.resetTime(),
    description: 'Restaura la hora real.'
  })

  debug.register({
    id: 'time-add-hours',
    label: 'AÑADIR HORAS',
    command: 'addHours',
    category: 'time',
    action: (h: number) => {
      const current = game.db.getTimeOffset()
      game.db.setTimeOffset(current + (h * ONE_HOUR_MS))
      ui.notify(`Debug: +${h} horas añadidas`, '⏩')
      window.dispatchEvent(new CustomEvent('time-sync-update'))
    },
    description: 'Añade una cantidad de horas al offset de tiempo actual.'
  })

  debug.register({
    id: 'time-add-weeks',
    label: 'AÑADIR SEMANAS',
    command: 'addWeeks',
    category: 'time',
    action: (w: number) => {
      const current = game.db.getTimeOffset()
      const ONE_WEEK_MS = 7 * ONE_DAY_MS
      game.db.setTimeOffset(current + (w * ONE_WEEK_MS))
      ui.notify(`Debug: +${w} semanas añadidas`, '⏩')
      window.dispatchEvent(new CustomEvent('time-sync-update'))
    },
    description: 'Añade semanas completas para simular cambios de estación.'
  })
}
