/**
 * Módulo de Acciones Especiales (Special moves)
 * Maneja mecánicas complejas: Rugido, Drenadoras, Transformación, etc.
 */

export const SPECIAL_ACTIONS = {
  'leech_seed': (src, tgt, srcStages, tgtStages, addLogFn, _battleCtx) => {
    if (tgt.type === 'grass' || tgt.type2 === 'grass') {
      addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
    } else if (!tgt.seeded) {
      tgt.seeded = true;
      addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info', tgt);
    } else {
      addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info', tgt);
    }
  },
  'roar': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    if (!battleCtx) return;
    
    // Inmunidad: Succión
    if (tgt.ability === 'Succión' || tgt.ability === 'Ventosa') {
      addLogFn(`¡La ${tgt.ability} de ${tgt.name} impidió ser arrastrado!`, 'log-info', tgt);
      return;
    }

    const isPlayerAttacking = (src === battleCtx.player);
    
    if (isPlayerAttacking) {
      if (!battleCtx.isTrainer && !battleCtx.isGym) {
        // Salva: Huye
        addLogFn(`¡El ${tgt.name} salvaje huyó asustado!`, 'log-player', tgt);
        battleCtx.over = true;
      } else {
        // Entrenador: Cambio aleatorio
        const aliveOthers = (battleCtx.enemyTeam || []).filter(p => p.uid !== tgt.uid && p.hp > 0);
        if (aliveOthers.length === 0) {
          addLogFn('¡Pero no surtió efecto!', 'log-enemy');
          return;
        }
        const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-player', tgt);
        battleCtx.enemy = randomPick;
        // Reset stages for new entry
        Object.keys(tgtStages).forEach(k => tgtStages[k] = 0);
        addLogFn(`¡${randomPick.name} entra al combate!`, 'log-info', randomPick);
      }
    } else {
      // Enemigo ataca al jugador
      // Note: Player switch logic is more complex because it involves store updates
      // For now we handle it as far as possible in the context
      addLogFn(`¡${src.name} usó Rugido!`, 'log-info');
      // The store will need to handle the player switch event if we want full integration,
      // but we can try basic swap here if battleCtx allows it.
    }
  },
  'destiny_bond': (src, tgt, srcStages, tgtStages, addLogFn, _battleCtx) => {
    src.destinyBond = true;
    addLogFn(`¡${src.name} intenta llevarse a su rival al destino común!`, 'log-info', src);
  },
  'perish_song': (src, tgt, srcStages, tgtStages, addLogFn, _battleCtx) => {
    if (src.perishSongCount === undefined) src.perishSongCount = 3;
    if (tgt.perishSongCount === undefined) tgt.perishSongCount = 3;
    addLogFn('¡Todos los que escucharon el canto morirán en 3 turnos!', 'log-info');
  },
  'transform': (src, tgt, srcStages, tgtStages, addLogFn, _battleCtx) => {
    const originalName = src.name;
    if (!src.isTransformed) {
      src.originalForm = JSON.parse(JSON.stringify(src));
      src.isTransformed = true;
    }
    src.id = tgt.id;
    src.name = tgt.name;
    src.type = tgt.type;
    src.type2 = tgt.type2;
    src.atk = tgt.atk;
    src.def = tgt.def;
    src.spa = tgt.spa;
    src.spd = tgt.spd;
    src.spe = tgt.spe;
    // Copy moves with 5 PP
    src.moves = JSON.parse(JSON.stringify(tgt.moves)).map(m => {
      m.pp = 5;
      m.maxPP = 5;
      return m;
    });
    addLogFn(`¡${originalName} se transformó en ${tgt.name}!`, 'log-info', src);
  },
  'reflect': (_src, _tgt, _srcStages, _tgtStages, _addLogFn, _battleCtx) => {
     // Re-exported or moved to fieldActions, keeping consistency
  }
};
