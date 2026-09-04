import type { DebugSystem } from '@/stores/debug'

import { useGameStore } from '@/stores/game'
import { useUIStore } from '@/stores/ui'
import { ONE_HOUR_MS, DURATION_24_HOURS_MS } from '@/logic/constants/items.ts'
import { BUFF_FIELDS, type BuffField } from '@/data/inventory/items'

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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      }
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
      const ONE_WEEK_MS = 7 * DURATION_24_HOURS_MS
      game.db.setTimeOffset(current + (w * ONE_WEEK_MS))
      ui.notify(`Debug: +${w} semanas añadidas`, '⏩')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      }
    },
    description: 'Añade semanas completas para simular cambios de estación.'
  })

  debug.register({
    id: 'time-advance-buff-seconds',
    label: 'ADELANTAR SEGUNDOS DE BUFF',
    command: 'advanceBuffSeconds',
    category: 'time',
    action: (seconds: number) => {
      const s = game.state
      const secs = Math.max(0, seconds)
      BUFF_FIELDS.forEach(field => {
        const current = s[field] || 0
        if (current > 0) {
          s[field] = Math.max(0, current - secs)
          if (s[field] === 0) {
            if (field === 'fishingRodSecs') s.fishingRodType = null
            if (field === 'pickaxeSecs') s.pickaxeType = null
            if (field === 'brushSecs') s.brushType = null
            if (field === 'incenseSecs') s.incenseType = null
          }
        }
      })
      game.saveGame(false)
      ui.notify(`Debug: -${secs}s en buffs activos`, '⏩')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('time-sync-update'))
      }
    },
    description: 'Adelanta una cantidad de segundos en todos los buffs temporales activos.'
  })

  debug.register({
    id: 'time-set-buff-duration',
    label: 'FIJAR DURACIÓN DE BUFF',
    command: 'setBuffDuration',
    category: 'time',
    action: (field: string, seconds: number) => {
      const s = game.state
      const buffField = field as BuffField
      if (BUFF_FIELDS.includes(buffField)) {
        s[buffField] = Math.max(0, seconds)
        if (s[buffField] === 0) {
          if (buffField === 'fishingRodSecs') s.fishingRodType = null
          if (buffField === 'pickaxeSecs') s.pickaxeType = null
          if (buffField === 'brushSecs') s.brushType = null
          if (buffField === 'incenseSecs') s.incenseType = null
        }
        game.saveGame(false)
        ui.notify(`Debug: ${buffField} fijado a ${seconds}s`, '⏱️')
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('time-sync-update'))
        }
      }
    },
    description: 'Fija los segundos restantes de un buff específico.'
  })
}
