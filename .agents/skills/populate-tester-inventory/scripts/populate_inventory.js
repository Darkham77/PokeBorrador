/**
 * Script de apoyo para la habilidad populate-tester-inventory (v4 - Reality & Persistence).
 * Genera 20 Pokémon con stats REALES y asegura la persistencia mediante el nuevo router.
 */
(async () => {
  if (typeof state === 'undefined' || typeof makePokemon !== 'function') {
    console.error('No se detectó el motor del juego o la función makePokemon.');
    return;
  }

  // 1. Detección de sesión robusta
  const user = window.currentUser;
  if (!user) {
    alert('❌ Error: Debes estar logueado para poblar el inventario persistente.');
    return;
  }

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const count = 20;

  console.log(`[Populate] Generando ${count} Pokémon REALES para: ${user.id}`);

  let successCount = 0;
  for (let i = 0; i < count; i++) {
    // IDs del 1 al 386 (Gen 1-3)
    const pokeId = randomInt(1, 386);
    // Traducir ID a slug de POKEMON_DB si es necesario (el motor a veces usa slugs)
    const slug = Object.keys(POKEMON_DB)[pokeId - 1] || 'pidgey';
    
    const level = randomInt(5, 55);
    
    // GENERACIÓN REAL: Usa la lógica del juego (IVs, Naturaleza, Movimientos por nivel)
    const p = makePokemon(slug, level);
    
    // Inyectar usando el helper global (maneja Pokedex, Caja y Persistencia)
    const res = await window.injectPokemonToBox(p, true); // true = silent para no spamear notificaciones
    if (res.success) successCount++;
  }

  // 2. Guardado Final y Feedback
  if (typeof saveGame === 'function') {
    await saveGame(true); // Ver el indicador de guardado final
  }

  console.log(`[Populate] ¡Éxito! ${successCount} Pokémon inyectados con stats reales.`);
  
  if (typeof updateHud === 'function') updateHud();
  if (typeof renderBox === 'function') renderBox(); // Refrescar vista de caja si está abierta

  alert(`✅ Se han añadido ${successCount} Pokémon REALES a tu caja.\n\nStats: Calculados según Gen 3.\nPersistencia: Sincronizada con ${user.id}.\n\nRefresca la página para verificar.`);
})();
