export const DEBUG_PANEL_CATEGORIES = [
  { id: 'stats', label: 'STATS', desc: 'Atributos del jugador, dinero, elo y facción.' },
  { id: 'class', label: 'CLASE', desc: 'Control de clase del jugador, nivel y reputación.' },
  { id: 'items', label: 'ITEMS', desc: 'Añadir objetos al inventario.' },
  { id: 'pokes', label: 'POKES', desc: 'Gestión de Pokedex y equipo.' },
  { id: 'trainers', label: 'ENTREN', desc: 'Simular combates contra entrenadores, policías y líderes.' },
  { id: 'map', label: 'MAPA', desc: 'Visualización de grilla y rendimiento.' },
  { id: 'missions', label: 'MISI', desc: 'Control de misiones de guardería.' },
  { id: 'time', label: 'TIEMPO', desc: 'Simulación de ciclos y climas.' },
  { id: 'modals', label: 'MODAL', desc: 'Tests de ventanas y errores.' },
  { id: 'audio', label: 'EFECTOS', desc: 'Efectos de combate, estados, animaciones y sonido.' },
] as const

export type DebugPanelCategoryId = (typeof DEBUG_PANEL_CATEGORIES)[number]['id']
