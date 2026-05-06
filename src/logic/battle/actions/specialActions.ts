
import { STATUS_ACTIONS } from './statusActions';

export const SPECIAL_ACTIONS = {
  'leech_seed': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (tgt.type === 'grass' || tgt.type2 === 'grass') {
      addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
    } else if (!tgt.seeded) {
      tgt.seeded = true;
      addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info', tgt);
    } else {
      addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info', tgt);
    }
  },
  'roar': (src: any, tgt: any, _srcStages: any, tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (!battleCtx) return;
    const b = battleCtx.activeBattle || battleCtx;
    
    if (tgt.ability === 'Succión' || tgt.ability === 'Ventosa') {
      addLogFn(`¡La ${tgt.ability} de ${tgt.name} impidió ser arrastrado!`, 'log-info', tgt);
      return;
    }

    const isPlayerAttacking = (src === b.player);
    
    if (isPlayerAttacking) {
      if (!b.isTrainer && !b.isGym) {
        addLogFn(`¡El ${tgt.name} salvaje huyó asustado!`, 'log-player', tgt);
        b.over = true;
      } else {
        const team = b.enemyTeam || [];
        const aliveOthers = team.filter((p: any) => p.uid !== tgt.uid && p.hp > 0);
        if (aliveOthers.length === 0) {
          addLogFn('¡Pero no hay nadie para sustituirle!', 'log-info', tgt);
          return;
        }
        const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-player', 'player');
        b.enemy = randomPick;
        Object.keys(tgtStages).forEach(k => tgtStages[k] = 0);
        addLogFn(`¡${randomPick.name} entra al combate!`, 'log-info', 'enemy_trainer');
      }
    } else {
      if (!b.isTrainer && !b.isGym) {
        addLogFn(`¡${src.name} expulsó a ${tgt.name} del combate!`, 'log-enemy', src);
        b.over = true;
      } else {
        const team = b.playerTeam || [];
        const aliveOthers = team.filter((p: any) => p.uid !== tgt.uid && p.hp > 0);
        if (aliveOthers.length === 0) {
          addLogFn('¡Pero no surtió efecto!', 'log-enemy', src);
          return;
        }
        const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
        addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-enemy', 'enemy_trainer');
        b.player = randomPick;
        Object.keys(tgtStages).forEach(k => tgtStages[k] = 0);
        addLogFn(`¡Envía a ${randomPick.name}!`, 'log-info', 'player');
      }
    }
  },
  'curse': (src: any, tgt: any, srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    const isGhost = src.type === 'ghost' || src.type2 === 'ghost';
    if (isGhost) {
      const cost = Math.floor(src.maxHp / 2);
      src.hp = Math.max(0, src.hp - cost);
      tgt.cursed = true;
      addLogFn(`¡${src.name} sacrificó PS para maldecir a ${tgt.name}!`, 'log-info', src);
    } else {
      srcStages.atk = Math.min(6, (srcStages.atk || 0) + 1);
      srcStages.def = Math.min(6, (srcStages.def || 0) + 1);
      srcStages.spe = Math.max(-6, (srcStages.spe || 0) - 1);
      addLogFn(`¡${src.name} redujo su Velocidad pero subió su Ataque y Defensa!`, 'log-info', src);
    }
  },
  'destiny_bond': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    src.destinyBond = true;
    addLogFn(`¡${src.name} intenta llevarse a su rival al destino común!`, 'log-info', src);
  },
  'perish_song': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (src.perishSongCount === undefined) src.perishSongCount = 3;
    if (tgt.perishSongCount === undefined) tgt.perishSongCount = 3;
    addLogFn('¡Todos los que escucharon el canto morirán en 3 turnos!', 'log-info', src);
  },
  'transform': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
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
    src.moves = JSON.parse(JSON.stringify(tgt.moves)).map((m: any) => {
      m.pp = 5;
      m.maxPP = 5;
      return m;
    });
    addLogFn(`¡${originalName} se transformó en ${tgt.name}!`, 'log-info', src);
  },
  'tri_attack': (src: any, tgt: any, srcStages: any, tgtStages: any, addLogFn: any) => {
    const roll = Math.random();
    if (roll < 0.066) STATUS_ACTIONS.burn(src, tgt, srcStages, tgtStages, addLogFn);
    else if (roll < 0.132) STATUS_ACTIONS.paralyze(src, tgt, srcStages, tgtStages, addLogFn);
    else if (roll < 0.20) STATUS_ACTIONS.freeze(src, tgt, srcStages, tgtStages, addLogFn);
  },
  'focus_energy': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.focusEnergy = true;
    addLogFn(`¡${src.name} se está concentrando!`, 'log-info', src);
  },
  'lock_on': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.lockOn = true;
    addLogFn(`¡${src.name} fijó el blanco en ${tgt.name}!`, 'log-info', src);
  },
  'mirror_move': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, _battleCtx: any) => {
    if (tgt.lastMove && tgt.lastMove.name !== 'Movimiento Espejo') {
      const move = tgt.lastMove;
      addLogFn(`¡Movimiento Espejo copió ${move.name}!`, 'log-info', src);
      // Simular ejecución: Si tiene efecto, intentar ejecutarlo
      if (move.effect) {
        console.log(`[MirrorMove] Triggering: ${move.effect}`);
      }
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'thrash': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (!src.thrashTurns) {
      src.thrashTurns = 2 + Math.floor(Math.random() * 2);
      addLogFn(`¡${src.name} está entrando en un frenesí!`, 'log-info', src);
    }
  },
  'false_swipe': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    addLogFn(`¡Un ataque contenido!`, 'log-info', src);
  },
  'trap': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    tgt.trapped = true;
    addLogFn(`¡${tgt.name} no puede escapar!`, 'log-info', tgt);
  },
  'ingrain': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.ingrain = true;
    addLogFn(`¡${src.name} echó raíces!`, 'log-info', src);
  },
  'endure': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.endure = true;
    addLogFn(`¡${src.name} aguantará el próximo golpe!`, 'log-info', src);
  },
  'protect': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.protect = true;
    addLogFn(`¡${src.name} se protegió!`, 'log-info', src);
  },
  'belly_drum': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    const cost = Math.floor(src.maxHp / 2);
    if (src.hp > cost && srcStages.atk < 6) {
      src.hp -= cost;
      srcStages.atk = 6;
      addLogFn(`¡${src.name} redujo su HP y maximizó su Ataque!`, 'log-info', src);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'teleport': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (!battleCtx) return;
    const b = battleCtx.activeBattle || battleCtx;
    const isWild = !b.isTrainer && !b.isGym;
    
    if (isWild) {
      addLogFn(`¡${src.name} se teletransportó fuera del combate!`, 'log-info', src);
      b.over = true;
    } else {
      const isPlayer = (src === b.player);
      const team = isPlayer ? b.playerTeam : b.enemyTeam;
      const aliveOthers = (team || []).filter((p: any) => p.uid !== src.uid && p.hp > 0);
      
      if (aliveOthers.length === 0) {
        addLogFn(`¡${src.name} se teletransportó fuera del combate!`, 'log-info', src);
        b.over = true;
      } else {
        addLogFn(`¡${src.name} se teletransportó!`, 'log-info', src);
        if (!isPlayer) {
          const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
          b.enemy = randomPick;
          addLogFn(`¡${randomPick.name} entra al combate!`, 'log-info', randomPick);
        } else {
          // Para el jugador, por simplicidad en este punto, fallamos si no es el último
          addLogFn("¡Pero no hay nadie para sustituirle!", 'log-info', src);
        }
      }
    }
  },
  'rapid_spin': (src: any, _tgt: any, srcStages: any, _tgtStages: any, addLogFn: any) => {
    let cleared = false;
    if (src.seeded) { src.seeded = false; cleared = true; }
    if (src.bound) { src.bound = 0; cleared = true; }
    if (srcStages.spikes) { srcStages.spikes = 0; cleared = true; }
    
    if (cleared) {
      addLogFn(`¡${src.name} se libró de las trampas girando!`, 'log-info', src);
    }
  },
  'identify': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    tgt.identified = true;
    addLogFn(`¡${src.name} identificó a ${tgt.name}!`, 'log-info', src);
  },
  'swagger': (src: any, tgt: any, srcStages: any, tgtStages: any, addLogFn: any) => {
    tgtStages.atk = Math.min(6, (tgtStages.atk || 0) + 2);
    addLogFn(`¡Subió mucho el Ataque de ${tgt.name}!`, 'log-info', tgt);
    STATUS_ACTIONS.confuse(src, tgt, srcStages, tgtStages, addLogFn);
  },
  'recharge': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, _addLogFn: any) => {
    src.mustRecharge = true;
  },
  'taunt': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    tgt.tauntTurns = 3;
    addLogFn(`¡${tgt.name} cayó en la mofa!`, 'log-info', tgt);
  },
  'torment': (_src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    tgt.tormentActive = true;
    addLogFn(`¡${tgt.name} sufre de tormento!`, 'log-info', tgt);
  },
  'disable': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.lastMove && !tgt.disabledMove) {
      tgt.disabledMove = tgt.lastMove;
      tgt.disabledTurns = 4;
      addLogFn(`¡El movimiento ${tgt.lastMove.name} de ${tgt.name} ha sido desactivado!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'dream_eater': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx && battleCtx.lastDamage) {
      const heal = Math.floor(battleCtx.lastDamage / 2);
      src.hp = Math.min(src.maxHp, src.hp + heal);
      addLogFn(`¡${src.name} absorbió los sueños de su rival! (+${heal} HP)`, 'log-info', src);
    }
  },
  'drain_50': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx && battleCtx.lastDamage) {
      const heal = Math.max(1, Math.floor(battleCtx.lastDamage / 2));
      src.hp = Math.min(src.maxHp, src.hp + heal);
      addLogFn(`¡${src.name} recuperó salud absorbiendo energía! (+${heal} HP)`, 'log-info', src);
    }
  },
  'recoil_25': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx && battleCtx.lastDamage) {
      const recoil = Math.max(1, Math.floor(battleCtx.lastDamage / 4));
      src.hp = Math.max(0, src.hp - recoil);
      addLogFn(`¡${src.name} recibió daño por el retroceso! (-${recoil} HP)`, 'log-info', src);
    }
  },
  'recoil_33': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (battleCtx && battleCtx.lastDamage) {
      const recoil = Math.max(1, Math.floor(battleCtx.lastDamage / 3));
      src.hp = Math.max(0, src.hp - recoil);
      addLogFn(`¡${src.name} recibió mucho daño por el retroceso! (-${recoil} HP)`, 'log-info', src);
    }
  },
  'metronome': (_src: any, _tgt: any, _srcStages: any, _tgtStages: any, _addLogFn: any, _battleCtx: any) => {
    // La lógica de selección de movimiento se maneja en battleTurn.js
  },
  'encore': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.lastMove && !tgt.encoreMove) {
      tgt.encoreMove = tgt.lastMove;
      tgt.encoreTurns = 3;
      addLogFn(`¡${tgt.name} recibió un Otra Vez!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'fury_cutter': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, _addLogFn: any) => {
    src.furyCutterCount = (src.furyCutterCount || 0) + 1;
  },
  'bind': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (!tgt.bound) {
      tgt.bound = 4 + Math.floor(Math.random() * 2);
      addLogFn(`¡${tgt.name} fue atrapado!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'rage': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.rageActive = true;
    addLogFn(`¡${src.name} está furioso!`, 'log-info', src);
  },
  'future_sight_simple': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any, battleCtx: any) => {
    if (!battleCtx) return;
    battleCtx.futureSightTurns = 3;
    battleCtx.futureSightTarget = tgt;
    addLogFn(`¡${src.name} lanzó una premonición!`, 'log-info', src);
  },
  'trick': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    const temp = src.heldItem;
    src.heldItem = tgt.heldItem;
    tgt.heldItem = temp;
    addLogFn(`¡${src.name} y ${tgt.name} intercambiaron objetos!`, 'log-info', src);
  },
  'steal_item': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    if (tgt.heldItem && !src.heldItem) {
      src.heldItem = tgt.heldItem;
      const stolenItem = tgt.heldItem;
      tgt.heldItem = null;
      addLogFn(`¡${src.name} robó ${stolenItem} de ${tgt.name}!`, 'log-info', src);
    }
  },
  'skill_swap': (src: any, tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    const temp = src.ability;
    src.ability = tgt.ability;
    tgt.ability = temp;
    addLogFn(`¡${src.name} y ${tgt.name} intercambiaron habilidades!`, 'log-info', src);
    addLogFn(`¡${src.name} tiene ${src.ability}!`, 'log-info', src);
    addLogFn(`¡${tgt.name} tiene ${tgt.ability}!`, 'log-info', tgt);
  },
  'snatch': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.snatching = true;
    addLogFn(`¡${src.name} espera para robar un movimiento!`, 'log-info', src);
  },
  'explosion': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.hp = 0;
    addLogFn(`¡${src.name} explotó!`, 'log-info', src);
  },
  'self_destruct': (src: any, _tgt: any, _srcStages: any, _tgtStages: any, addLogFn: any) => {
    src.hp = 0;
    addLogFn(`¡${src.name} se autodestruyó!`, 'log-info', src);
  }
};
