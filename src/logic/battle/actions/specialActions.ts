import type { MoveAction } from '@/types/battle/battle';
import { STATUS_ACTIONS } from './statusActions.ts';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/events/gameBus';
import { getItemById } from '@/data/inventory/items';
import { callPokemonToBattle } from './specialActionsHelper.ts';

/**
 * Special Actions Dictionary.
 * Handles moves with unique logic that doesn't fit into standard stat/status/healing categories.
 */

export const SPECIAL_ACTIONS: Record<string, MoveAction> = {
  'leech_seed': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.type === 'grass' || tgt.type2 === 'grass') {
      addLogFn(`¡No afecta a ${tgt.name}!`, 'log-info', tgt);
    } else if (!tgt.seeded) {
      tgt.seeded = true;
      addLogFn(`¡${tgt.name} fue infectado por drenadoras!`, 'log-info', tgt);
    } else {
      addLogFn(`¡${tgt.name} ya está infectado!`, 'log-info', tgt);
    }
  },
  'roar': async (src, tgt, _srcStages, tgtStages, addLogFn, battleCtx) => {
    if (!battleCtx) return
    const { executeRoarAction } = await import('./specialActionsRoarHelper.ts')
    await executeRoarAction(src, tgt, tgtStages, addLogFn, battleCtx)
  },
  'curse': (src, tgt, srcStages, _tgtStages, addLogFn) => {
    if (src.type === 'ghost' || src.type2 === 'ghost') {
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
  'destiny_bond': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.destinyBond = true;
    addLogFn(`¡${src.name} intenta llevarse a su rival al destino común!`, 'log-info', src);
  },
  'perish_song': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (src.perishSongCount === undefined) src.perishSongCount = 3;
    if (tgt.perishSongCount === undefined) tgt.perishSongCount = 3;
    addLogFn('¡Todos los que escucharon el canto morirán en 3 turnos!', 'log-info', src);
  },
  'transform': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    const originalName = src.name;
    if (!src.originalDitto) {
      src.originalDitto = {
        id: src.id,
        name: src.name,
        type: src.type,
        type2: src.type2,
        atk: src.atk,
        def: src.def,
        spa: src.spa,
        spd: src.spd,
        spe: src.spe,
        moves: src.moves ? src.moves.map(m => m ? { ...m } : null) : [],
        ivs: src.ivs ? { ...src.ivs } : undefined,
        isShiny: src.isShiny,
        level: src.level,
        nature: src.nature,
        ability: src.ability,
        hp: src.hp,
        maxHp: src.maxHp
      };
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
    src.isTransformed = true;
    // Copy moves but with 5 PP
    src.moves = tgt.moves.map(m => {
      if (!m) return null;
      const newM = { ...m };
      newM.pp = 5;
      newM.maxPP = 5;
      return newM;
    });
    addLogFn(`¡${originalName} se transformó en ${tgt.name}!`, 'log-info', src);
  },
  'tri_attack': (src, tgt, srcStages, tgtStages, addLogFn) => {
    const roll = Math.random();
    if (roll < 0.066) STATUS_ACTIONS.burn?.(src, tgt, srcStages, tgtStages, addLogFn);
    else if (roll < 0.132) STATUS_ACTIONS.paralyze?.(src, tgt, srcStages, tgtStages, addLogFn);
    else if (roll < 0.20) STATUS_ACTIONS.freeze?.(src, tgt, srcStages, tgtStages, addLogFn);
  },
  'focus_energy': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.focusEnergy = true;
    addLogFn(`¡${src.name} se está concentrando!`, 'log-info', src);
  },
  'lock_on': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    src.lockOn = true;
    addLogFn(`¡${src.name} fijó el blanco en ${tgt.name}!`, 'log-info', src);
  },
  'mirror_move': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.lastMove && tgt.lastMove.name !== 'Movimiento Espejo') {
      const move = tgt.lastMove;
      addLogFn(`¡Movimiento Espejo copió ${move.name}!`, 'log-info', src);
      if (move.effect) {
        logger.debug('MirrorMove', `Triggering: ${move.effect}`);
      }
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'thrash': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!src.thrashTurns) {
      src.thrashTurns = 2 + Math.floor(Math.random() * 2);
      addLogFn(`¡${src.name} está entrando en un frenesí!`, 'log-info', src);
    }
  },
  'false_swipe': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡Un ataque contenido!`, 'log-info', src);
  },
  'trap': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    tgt.trapped = true;
    addLogFn(`¡${tgt.name} no puede escapar!`, 'log-info', tgt);
  },
  'ingrain': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.ingrain = true;
    addLogFn(`¡${src.name} echó raíces!`, 'log-info', src);
  },
  'endure': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.endure = true;
    addLogFn(`¡${src.name} aguantará el próximo golpe!`, 'log-info', src);
  },
  'protect': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.protect = true;
    addLogFn(`¡${src.name} se protegió!`, 'log-info', src);
  },
  'belly_drum': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    const cost = Math.floor(src.maxHp / 2);
    if (src.hp > cost && srcStages.atk < 6) {
      src.hp -= cost;
      srcStages.atk = 6;
      addLogFn(`¡${src.name} redujo su HP y maximizó su Ataque!`, 'log-info', src);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'teleport': async (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (!b) return;
    const isWild = !b.isTrainer && !b.isGym;
    
    if (isWild) {
      addLogFn(`¡${src.name} se teletransportó fuera del combate!`, 'log-info', src);
      gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'teleport' });
      b.fled = true;
      b.over = true;
    } else {
      const isPlayer = (src.uid === b.player?.uid);
      const team = isPlayer ? b.playerTeam : b.enemyTeam;
      const aliveOthers = (team || []).filter((p) => p.uid !== src.uid && p.hp > 0);
      
      if (aliveOthers.length === 0) {
        addLogFn(`¡${src.name} intentó teletransportarse!`, 'log-info', src);
        addLogFn("¡Pero no hay nadie para sustituirle!", 'log-info', src);
      } else {
        addLogFn(`¡${src.name} se teletransportó!`, 'log-info', src);
        const fsm = battleCtx.fsm;
        const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx;
        
        if (!isPlayer) {
          const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null;
          battleCtx.exitingEnemy.value = src;
          
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
          const withdrawPromise = battleCtx.animations?.handleCatchRequest
            ? battleCtx.animations.handleCatchRequest({ side: 'enemy', pokemon: src })
            : Promise.resolve();
            
          b.enemy = randomPick;
          await withdrawPromise;
          
          if (randomPick && battleCtx) {
            await callPokemonToBattle(
              'enemy',
              randomPick,
              `¡${randomPick.name} entra al combate!`,
              randomPick,
              addLogFn,
              battleCtx
            );
          }
          battleCtx.exitingEnemy.value = null;
        } else {
          battleCtx.exitingPlayer.value = src;
          
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
          const withdrawPromise = battleCtx.animations?.handleCatchRequest
            ? battleCtx.animations.handleCatchRequest({ side: 'player', pokemon: src })
            : Promise.resolve();
            
          const keys = Object.keys(battleCtx.playerStages.value) as (keyof typeof battleCtx.playerStages.value)[];
          keys.forEach(k => {
            battleCtx.playerStages.value[k] = 0;
          });
          
          await withdrawPromise;
          battleCtx.exitingPlayer.value = null;
          b.player = null;
          
          battleCtx.uiStore.isBattleSwitchForced = true;
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU);
        }
      }
    }
  },
  'rapid_spin': (src, _tgt, srcStages, _tgtStages, addLogFn) => {
    let cleared = false;
    if (src.seeded) { src.seeded = false; cleared = true; }
    if (src.bound) { src.bound = 0; cleared = true; }
    if (srcStages.spikes) { srcStages.spikes = 0; cleared = true; }
    
    if (cleared) {
      addLogFn(`¡${src.name} se libró de las trampas girando!`, 'log-info', src);
    }
  },
  'identify': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    tgt.identified = true;
    addLogFn(`¡${src.name} identificó a ${tgt.name}!`, 'log-info', src);
  },
  'swagger': (src, tgt, srcStages, tgtStages, addLogFn) => {
    tgtStages.atk = Math.min(6, (tgtStages.atk || 0) + 2);
    addLogFn(`¡Subió mucho el Ataque de ${tgt.name}!`, 'log-info', tgt);
    STATUS_ACTIONS.confuse?.(src, tgt, srcStages, tgtStages, addLogFn);
  },
  'recharge': (src, _tgt, _srcStages, _tgtStages, _addLogFn) => {
    src.mustRecharge = true;
  },
  'taunt': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    tgt.tauntTurns = 3;
    addLogFn(`¡${tgt.name} cayó en la mofa!`, 'log-info', tgt);
  },
  'torment': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    tgt.tormentActive = true;
    addLogFn(`¡${tgt.name} sufre de tormento!`, 'log-info', tgt);
  },
  'disable': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.lastMove && !tgt.disabledMove) {
      tgt.disabledMove = tgt.lastMove;
      tgt.disabledTurns = 4;
      addLogFn(`¡El movimiento ${tgt.lastMove.name} de ${tgt.name} ha sido desactivado!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'dream_eater': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (b && b.lastDamage) {
      const heal = Math.floor(b.lastDamage / 2);
      src.hp = Math.min(src.maxHp, src.hp + heal);
      addLogFn(`¡${src.name} absorbió los sueños de su rival! (+${heal} HP)`, 'log-info', src);
    }
  },
  'drain_50': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (b && b.lastDamage) {
      const heal = Math.max(1, Math.floor(b.lastDamage / 2));
      src.hp = Math.min(src.maxHp, src.hp + heal);
      addLogFn(`¡${src.name} recuperó salud absorbiendo energía! (+${heal} HP)`, 'log-info', src);
    }
  },
  'recoil_25': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (b && b.lastDamage) {
      const recoil = Math.max(1, Math.floor(b.lastDamage / 4));
      src.hp = Math.max(0, src.hp - recoil);
      addLogFn(`¡${src.name} recibió daño por el retroceso! (-${recoil} HP)`, 'log-info', src);
    }
  },
  'recoil_33': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (b && b.lastDamage) {
      const recoil = Math.max(1, Math.floor(b.lastDamage / 3));
      src.hp = Math.max(0, src.hp - recoil);
      addLogFn(`¡${src.name} recibió mucho daño por el retroceso! (-${recoil} HP)`, 'log-info', src);
    }
  },
  'metronome': (_src, _tgt, _srcStages, _tgtStages, _addLogFn) => {
    // Logic handled in battleTurn.ts
  },
  'encore': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.lastMove && !tgt.encoreMove) {
      tgt.encoreMove = tgt.lastMove;
      tgt.encoreTurns = 3;
      addLogFn(`¡${tgt.name} recibió un Otra Vez!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'fury_cutter': (src, _tgt, _srcStages, _tgtStages, _addLogFn) => {
    src.furyCutterCount = (src.furyCutterCount || 0) + 1;
  },
  'bind': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!tgt.bound) {
      tgt.bound = 4 + Math.floor(Math.random() * 2);
      addLogFn(`¡${tgt.name} fue atrapado!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'rage': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.rageActive = true;
    addLogFn(`¡${src.name} está furioso!`, 'log-info', src);
  },
  'future_sight_simple': (src, tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (!b) return;
    b.futureSightTurns = 3;
    b.futureSightTarget = tgt;
    addLogFn(`¡${src.name} lanzó una premonición!`, 'log-info', src);
  },
  'trick': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    const temp = src.heldItem;
    src.heldItem = tgt.heldItem;
    tgt.heldItem = temp;
    addLogFn(`¡${src.name} y ${tgt.name} intercambiaron objetos!`, 'log-info', src);
  },
  'steal_item': (src, tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    if (tgt.heldItem && !src.heldItem) {
      const stolenItem = tgt.heldItem;
      src.heldItem = stolenItem;
      tgt.heldItem = null;
      const itemDef = getItemById(stolenItem);
      const displayName = itemDef?.name || stolenItem;
      addLogFn(`¡${src.name} robó ${displayName} de ${tgt.name}!`, 'log-info', src);

      // Play steal sound
      import('@/stores/audio').then(m => m.useAudioStore().play('steal')).catch(() => {});

      const b = battleCtx?.activeBattle.value;
      if (b && battleCtx.gs) {
        const isPlayerSrc = (src.uid === b.player?.uid);
        const isPlayerTgt = (tgt.uid === b.player?.uid);
        
        if (isPlayerSrc) {
          if (!battleCtx.gs.state.inventory) battleCtx.gs.state.inventory = {};
          battleCtx.gs.state.inventory[stolenItem] = (battleCtx.gs.state.inventory[stolenItem] || 0) + 1;
          
          const itemDef = getItemById(stolenItem);
          const displayName = itemDef?.name || stolenItem;
          battleCtx.uiStore.notify(`¡Robaste un ${displayName}!`, '🎒');
        } else if (isPlayerTgt) {
          const itemDef = getItemById(stolenItem);
          const displayName = itemDef?.name || stolenItem;
          battleCtx.uiStore.notify(`¡Te robaron tu ${displayName}!`, '💸');
        }
      }
    }
  },
  'pay_day': (src, _tgt, _srcStages, _tgtStages, addLogFn, battleCtx) => {
    const b = battleCtx?.activeBattle.value;
    if (b && battleCtx.gs) {
      const isPlayerSrc = (src.uid === b.player?.uid);
      if (isPlayerSrc) {
        const amount = (src.level || 5) * 5;
        battleCtx.gs.state.money = (battleCtx.gs.state.money || 0) + amount;
        addLogFn(`¡Monedas esparcidas por todas partes! Se obtuvieron ₽${amount}.`, 'log-success', src);
        
        import('@/stores/audio').then(m => m.useAudioStore().play('steal')).catch(() => {});
        battleCtx.uiStore.notify(`¡Robaste/Obtuviste ₽${amount}!`, '💰');
      }
    }
  },
  'skill_swap': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    const temp = src.ability;
    src.ability = tgt.ability;
    tgt.ability = temp;
    addLogFn(`¡${src.name} y ${tgt.name} intercambiaron habilidades!`, 'log-info', src);
    addLogFn(`¡${src.name} tiene ${src.ability}!`, 'log-info', src);
    addLogFn(`¡${tgt.name} tiene ${tgt.ability}!`, 'log-info', tgt);
  },
  'snatch': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.snatching = true;
    addLogFn(`¡${src.name} espera para robar un movimiento!`, 'log-info', src);
  },
  'explosion': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.hp = 0;
    addLogFn(`¡${src.name} explotó!`, 'log-info', src);
  },
  'self_destruct': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    src.hp = 0;
    addLogFn(`¡${src.name} se autodestruyó!`, 'log-info', src);
  },
  'locked_move': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!src.volatileCounters) {
      src.volatileCounters = {};
    }
    if (!src.volatileCounters['lockedmove']) {
      src.volatileCounters['lockedmove'] = 2 + Math.floor(Math.random() * 2);
      addLogFn(`¡${src.name} está entrando en un frenesí!`, 'log-info', src);
    }
  },
  'partially_trapped': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!tgt.volatileCounters) {
      tgt.volatileCounters = {};
    }
    if (!tgt.volatileCounters['partiallytrapped']) {
      tgt.volatileCounters['partiallytrapped'] = 4 + Math.floor(Math.random() * 2);
      addLogFn(`¡${tgt.name} fue atrapado!`, 'log-info', tgt);
    } else {
      addLogFn("¡Pero falló!", 'log-info', src);
    }
  },
  'stockpile': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!src.volatileCounters) src.volatileCounters = {};
    const count = src.volatileCounters['stockpile'] || 0;
    if (count < 3) {
      src.volatileCounters['stockpile'] = count + 1;
      addLogFn(`¡${src.name} acumuló energía (Reserva: ${count + 1})!`, 'log-info', src);
    } else {
      addLogFn(`¡${src.name} no puede acumular más!`, 'log-info', src);
    }
  },
  'spit_up': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    if (!src.volatileCounters) src.volatileCounters = {};
    const count = src.volatileCounters['stockpile'] || 0;
    if (count > 0) {
      addLogFn(`¡${src.name} liberó la energía acumulada!`, 'log-info', src);
      src.volatileCounters['stockpile'] = 0;
    } else {
      addLogFn("¡Pero falló porque no tenía energía acumulada!", 'log-info', src);
    }
  },
  'future_sight': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡${src.name} previó un ataque para el futuro!`, 'log-info', src);
  },
  'grudge': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡${src.name} quiere vengarse del enemigo!`, 'log-info', src);
  },
  'charge': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡${src.name} comenzó a cargarse de electricidad!`, 'log-info', src);
  },
  'brick_break': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡${src.name} destruyó las pantallas reflectoras!`, 'log-info', src);
  },
  'covet': (src, tgt, srcStages, tgtStages, addLogFn, battleCtx) => {
    SPECIAL_ACTIONS['steal_item']?.(src, tgt, srcStages, tgtStages, addLogFn, battleCtx);
  },
  'hp_scale': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡La potencia del ataque depende de los PS de ${src.name}!`, 'log-info', src);
  },
  'stat_down_self_def': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    // Manejador genérico para Close Combat, Shell Smash, etc. que bajan defensas
    addLogFn(`¡Las defensas de ${src.name} bajaron!`, 'log-info', src);
  },
  'stat_up_enemy_atk': (_src, tgt, _srcStages, _tgtStages, addLogFn) => {
    // Aullido (howl) / etc.
    addLogFn(`¡El ataque de ${tgt.name} subió!`, 'log-info', tgt);
  },
  'stat_down_self_spe': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    // Hammer Arm / etc.
    addLogFn(`¡La velocidad de ${src.name} bajó!`, 'log-info', src);
  },
  'focus_punch': (src, _tgt, _srcStages, _tgtStages, addLogFn) => {
    addLogFn(`¡${src.name} se está concentrando!`, 'log-info', src);
  }
};
