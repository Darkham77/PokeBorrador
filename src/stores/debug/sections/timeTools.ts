export function registerTimeTools(debug: any, { game, ui }: { game: any, ui: any }) {
  debug.register({
    id: 'core-set-mock-time',
    label: 'SET MOCK TIME',
    command: 'setMockTime',
    category: 'time',
    action: (d: any) => game.db.setMockTime(d),
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
      game.db.setTimeOffset(current + (h * 3600 * 1000))
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
      // 1 week = 7 days * 24 hours * 3600 seconds * 1000 ms
      game.db.setTimeOffset(current + (w * 7 * 24 * 3600 * 1000))
      ui.notify(`Debug: +${w} semanas añadidas`, '⏩')
      window.dispatchEvent(new CustomEvent('time-sync-update'))
    },
    description: 'Añade semanas completas para simular cambios de estación.'
  })
}
