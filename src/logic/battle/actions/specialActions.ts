import type { MoveAction } from '@/types/battle';
import { STATUS_ACTIONS } from './statusActions.ts';
import { logger } from '@/logic/utils/logger';
import { gameBus } from '@/logic/gameBus';

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
    const b = battleCtx?.activeBattle.value;
    if (!b) return;
    
    if (tgt.ability === 'Succión' || tgt.ability === 'Ventosa') {
      addLogFn(`¡La ${tgt.ability} de ${tgt.name} impidió ser arrastrado!`, 'log-info', tgt);
      return;
    }

    const isPlayerAttacking = (src.uid === b.player?.uid);
    const fsm = battleCtx.fsm;
    const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx;
    
    if (isPlayerAttacking) {
      if (!b.isTrainer && !b.isGym) {
        addLogFn(`¡El ${tgt.name} salvaje huyó asustado!`, 'log-player', tgt);
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'flee' });
        b.fled = true;
        b.over = true;
      } else {
        const team = b.enemyTeam || [];
        const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0);
        if (aliveOthers.length === 0) {
          addLogFn('¡Pero no hay nadie para sustituirle!', 'log-info', tgt);
          return;
        }
        const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null;
        addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-player', 'player');
        
        battleCtx.exitingEnemy.value = tgt;
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
        
        const withdrawPromise = battleCtx.animations?.handleCatchRequest
          ? battleCtx.animations.handleCatchRequest({ side: 'enemy', pokemon: tgt })
          : Promise.resolve();

        b.enemy = randomPick;
        Object.keys(tgtStages).forEach(k => {
          tgtStages[k] = 0;
        });

        await withdrawPromise;
        
        if (randomPick) {
          addLogFn(`¡${randomPick.name} entra al combate!`, 'log-info', 'enemy_trainer');
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT);
          if (battleCtx.animations?.handleReleaseRequest) {
            await battleCtx.animations.handleReleaseRequest({ side: 'enemy', pokemon: randomPick });
          } else {
            gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: randomPick });
            const { gsapSleep } = await import('@/logic/utils/gsapHelpers');
            await gsapSleep(800);
          }
        }
        battleCtx.exitingEnemy.value = null;
      }
    } else {
      if (!b.isTrainer && !b.isGym) {
        addLogFn(`¡${src.name} expulsó a ${tgt.name} del combate!`, 'log-enemy', src);
        gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player', type: 'flee' });
        b.fled = true;
        b.over = true;
      } else {
        const team = b.playerTeam || [];
        const aliveOthers = team.filter((p) => p.uid !== tgt.uid && p.hp > 0);
        if (aliveOthers.length === 0) {
          addLogFn('¡Pero no surtió efecto!', 'log-enemy', src);
          return;
        }
        const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null;
        addLogFn(`¡${tgt.name} fue expulsado del campo!`, 'log-enemy', 'enemy_trainer');
        
        battleCtx.exitingPlayer.value = tgt;
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
        
        const withdrawPromise = battleCtx.animations?.handleCatchRequest
          ? battleCtx.animations.handleCatchRequest({ side: 'player', pokemon: tgt })
          : Promise.resolve();

        b.player = randomPick;
        if (randomPick) {
          b.playerTeamIndex = b.playerTeam?.findIndex(p => p.uid === randomPick.uid) ?? b.playerTeamIndex;
        }
        Object.keys(tgtStages).forEach(k => {
          tgtStages[k] = 0;
        });

        await withdrawPromise;

        if (randomPick) {
          addLogFn(`¡Envía a ${randomPick.name}!`, 'log-info', 'player');
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);
          await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT);
          if (battleCtx.animations?.handleReleaseRequest) {
            await battleCtx.animations.handleReleaseRequest({ side: 'player', pokemon: randomPick });
          } else {
            gameBus.emit('PLAY_SEND_OUT', { side: 'player', pokemon: randomPick });
            const { gsapSleep } = await import('@/logic/utils/gsapHelpers');
            await gsapSleep(800);
          }
        }
        battleCtx.exitingPlayer.value = null;
      }
    }
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
          
          if (randomPick) {
            addLogFn(`¡${randomPick.name} entra al combate!`, 'log-info', randomPick);
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);
            await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT);
            if (battleCtx.animations?.handleReleaseRequest) {
              await battleCtx.animations.handleReleaseRequest({ side: 'enemy', pokemon: randomPick });
            } else {
              gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: randomPick });
              const { gsapSleep } = await import('@/logic/utils/gsapHelpers');
              await gsapSleep(800);
            }
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
  'steal_item': (src, tgt, _srcStages, _tgtStages, addLogFn) => {
    if (tgt.heldItem && !src.heldItem) {
      src.heldItem = tgt.heldItem;
      const stolenItem = tgt.heldItem;
      tgt.heldItem = null;
      addLogFn(`¡${src.name} robó ${stolenItem} de ${tgt.name}!`, 'log-info', src);
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
  }
};
