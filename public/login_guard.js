(function (global) {
  function shouldAbortSaveLoad(saveError) {
    if (!saveError) return false;
    // PGRST116 = "no rows returned" — normal para usuarios nuevos o sin partida guardada
    if (saveError.code === 'PGRST116') return false;
    return true;
  }

  function sanitizeLoadErrorMessage(err) {
    if (!err) return 'No se pudo cargar tu progreso. Reintentá en unos minutos.';
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    return 'No se pudo cargar tu progreso. Reintentá en unos minutos.';
  }

  global.LoginGuard = { shouldAbortSaveLoad, sanitizeLoadErrorMessage };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { shouldAbortSaveLoad, sanitizeLoadErrorMessage };
  }
})(typeof window !== 'undefined' ? window : globalThis);
