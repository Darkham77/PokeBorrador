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
export const formatCurrency = (val: number, threshold: number = 999999): string => {
  if (val > threshold) {
    return `${Math.floor(val / 1000000)}M`
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
  const clean = playerClass.toLowerCase().trim() // text-ok
  if (clean === 'entrenador') return 'Entrenador'
  if (clean === 'rocket') return 'Equipo Rocket'
  if (clean === 'cazabichos') return 'Cazabichos'
  if (clean === 'criador') return 'Criador'
  return playerClass.toUpperCase() // text-ok
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
      faction.toLowerCase() === 'none') { // text-ok
    return 'SIN BANDO'
  }
  const clean = faction.toLowerCase().trim() // text-ok
  if (clean === 'union') return 'Bando Unión'
  if (clean === 'poder') return 'Bando Poder'
  return faction.toUpperCase() // text-ok
}
