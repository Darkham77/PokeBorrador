/**
 * Script de apoyo para la habilidad populate-tester-inventory (v3 - Robust Session).
 * Este script se ejecuta en el contexto del navegador para añadir 20 Pokémon.
 * Maneja la persistencia automática detectando el usuario actual.
 */
(async () => {
  if (typeof state === 'undefined' || typeof saveGame !== 'function') {
    console.error('No se detectó el motor del juego en esta página.');
    return;
  }

  // --- NUEVA LÓGICA DE ROBUSTEZ DE SESIÓN ---
  // Si currentUser es null, intentamos reconstruirlo desde el HUD para asegurar persistencia local
  if (!window.currentUser) {
    const hudName = document.getElementById('hud-name')?.textContent?.trim().toLowerCase() || 'ash';
    console.warn(`[Populate] window.currentUser es null. Derivando sesión de HUD: ${hudName}`);
    window.currentUser = {
      id: 'local_' + hudName,
      email: hudName + '@local',
      user_metadata: { username: hudName }
    };
    // Sincronizamos con el motor legacy
    state.trainer = hudName;
  }

  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const generateIVs = () => ({
    hp: randomInt(0, 31), atk: randomInt(0, 31), def: randomInt(0, 31),
    spa: randomInt(0, 31), spd: randomInt(0, 31), spe: randomInt(0, 31)
  });

  const count = 20;
  console.log(`[Populate] Generando ${count} Pokémon para el usuario: ${window.currentUser.id}`);

  for (let i = 0; i < count; i++) {
    const pokeId = randomInt(1, 386); 
    const level = randomInt(30, 50);
    const ivs = generateIVs();
    
    const newPoke = {
      uid: crypto.randomUUID(),
      id: pokeId,
      name: `Test_${pokeId}`,
      level: level,
      hp: 100, maxHp: 100,
      atk: 50, def: 50, spa: 50, spd: 50, spe: 50,
      ivs: ivs,
      nature: 'Hardy',
      ability: 'None',
      moves: [1, 33, 45],
      isShiny: Math.random() < 0.2, // 20% shiny para facilitar pruebas visuales
      exp: 0,
      expNeeded: 100,
      friendship: 70
    };

    state.box.push(newPoke);
    
    if (!state.pokedex.includes(pokeId)) state.pokedex.push(pokeId);
    if (!state.seenPokedex.includes(pokeId)) state.seenPokedex.push(pokeId);
  }

  console.log(`[Populate] ¡Éxito! 20 Pokémon añadidos a la caja.`);
  
  // Guardar cambios formalmente
  await saveGame(true);
  
  // Sincronizar con Vue (StateBridge) y UI
  if (typeof updateHud === 'function') updateHud();
  if (typeof updateProfilePanel === 'function') updateProfilePanel(window.currentUser, { username: state.trainer });
  
  alert(`Se han añadido 20 Pokémon a tu caja (Usuario: ${window.currentUser.id}).\n\nRECUERDA: Si refrescas la página, los Pokémon se mantendrán guardados en tu navegador, pero deberás entrar de nuevo en la pestaña LOCAL con el nombre "${state.trainer}" para cargarlos.`);
})();
