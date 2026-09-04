/**
 * Utilidades de formateo para el proyecto Poké Vicio
 */

/**
 * Simplifica valores numéricos grandes usando sufijos (K, M)
 * para ahorrar espacio en la UI.
 * 
 * @param val El número a formatear
 * @param threshold El umbral a partir del cual se simplifica (defecto 9.999.999)
 * @returns String formateado (ej: "10M", "1.234.567")
 */
const DEFAULT_CURRENCY_FORMAT_THRESHOLD = 999999
const ONE_MILLION_SCALE = 1000000

export const formatCurrency = (val: number, threshold: number = DEFAULT_CURRENCY_FORMAT_THRESHOLD): string => {
  if (val > threshold) {
    return `${Math.floor(val / ONE_MILLION_SCALE)}M`
  }
  return (val || 0).toLocaleString()
}

/**
 * Traduce y formatea el nombre de la clase de entrenador.
 */
export const formatPlayerClass = (playerClass: string | null | undefined): string => {
  if (!playerClass || 
      playerClass === 'null' || 
      playerClass === 'undefined' || 
      playerClass === 'Null' || 
      playerClass === 'NULL' || 
      !playerClass.trim()) {
    return 'SIN CLASE'
  }
  const clean = playerClass.toLowerCase().trim() // text-ok: UI text display localization string
  if (clean === 'entrenador') return 'Entrenador'
  if (clean === 'rocket') return 'Equipo Rocket'
  if (clean === 'cazabichos') return 'Cazabichos'
  if (clean === 'criador') return 'Criador'
  return playerClass.toUpperCase() // text-ok: UI text display localization string
}

/**
 * Traduce y formatea el nombre del bando (facción) del entrenador.
 */
export const formatFaction = (faction: string | null | undefined): string => {
  if (!faction || 
      faction === 'null' || 
      faction === 'undefined' || 
      faction === 'Null' || 
      faction === 'NULL' || 
      !faction.trim() || 
      faction.toLowerCase() === 'none') { // text-ok: UI text display localization string
    return 'SIN BANDO'
  }
  const clean = faction.toLowerCase().trim() // text-ok: UI text display localization string
  if (clean === 'union') return 'Bando Unión'
  if (clean === 'poder') return 'Bando Poder'
  return faction.toUpperCase() // text-ok: UI text display localization string
}
