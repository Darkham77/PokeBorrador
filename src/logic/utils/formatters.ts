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
