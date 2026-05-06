/**
 * LoginGuard: Utilidades para manejo de errores de sesión y carga de datos.
 * Migrado desde public/login_guard.js
 */

/**
 * Determina si un error de Supabase debe abortar la carga del juego.
 * @param {Object} saveError - El objeto de error retornado por Supabase.
 * @returns {boolean} True si el error es crítico y se debe abortar.
 */
export function shouldAbortSaveLoad(saveError) {
  if (!saveError) return false;
  // PGRST116 = "no rows returned" — normal para usuarios nuevos o sin partida guardada en single()
  if (saveError.code === 'PGRST116') return false;
  return true;
}

/**
 * Sanitiza mensajes de error para mostrar al usuario final.
 * @param {any} err - Error capturado.
 * @returns {string} Mensaje amigable.
 */
export function sanitizeLoadErrorMessage(err) {
  if (!err) return 'No se pudo cargar tu progreso. Reintentá en unos minutos.';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  return 'No se pudo cargar tu progreso. Reintentá en unos minutos.';
}

export const LoginGuard = {
  shouldAbortSaveLoad,
  sanitizeLoadErrorMessage
};
