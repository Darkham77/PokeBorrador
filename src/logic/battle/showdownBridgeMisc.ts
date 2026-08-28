import type { SBCtx } from './showdownBridgeCtx.ts';
import { isPokemonStatus, requireVolatileStatusKey, type Move } from '../../types/pokemon/pokemon.ts';
import { toID } from '@/logic/utils/strings.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requirePokemonSpeciesId } from '../../data/pokemon/pokedex.ts';
import { requireItemId } from '../../data/inventory/items.ts';
import { gameBus } from '@/logic/events/gameBus.ts';
import { getForcedExitConfig, isForcedSwitchMove } from './helpers/forcedSwitchRegistry.ts';


/**
 * Maneja eventos misceláneos, efectos de combate y mecánicas Gen 6-9:
 * -miss, -immune, -fail, cant, -crit, -supereffective, -resisted, -block,
 * -hitcount, -ohko, -activate, -ability, -enditem, -item,
 * -cureteam, -mustrecharge, -formechange, -transform,
 * -singlemove, -singleturn, -endability, detailschange, replace,
 * switch, drag, -terastallize, -mega, -primal, -zpower, -zbroken,
 * -burst, -candynamax
 */
export function handleMiscEvents(ctx: SBCtx): boolean | Promise<boolean> {
  const { store, type, parts, line, p, e, getPoke, getSide } = ctx;

  switch (type) {
    case 'gen':
    case 'gametype':
    case 'teamsize':
    case 'rated':
    case 'tier':
    case 'showteam':
    case 'debug':
    case 'bigerror':
    case 'event':
      return true;
    case '-notarget': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        store.addLog(`¡No hay objetivo para el movimiento de ${target.name}!`, 'log-info', target);
      } else {
        store.addLog('¡No hay objetivo válido!', 'log-info');
      }
      return true;
    }

    case '-hint':
    case '-message':
    case 'message': {
      if (line.includes('[silent]')) return true;
      const msg = parts[2] || parts[1] || '';
      if (msg && !msg.startsWith('http')) {
        store.addLog(msg, 'log-info');
      }
      return true;
    }

    case '-miss': {
      if (line.includes('[silent]')) return true;
      const attacker = getPoke(parts[2] || '');
      if (attacker) {
        const style = attacker === p ? 'log-player' : 'log-enemy';
        store.addLog(`¡El ataque de ${attacker.name} falló!`, style, attacker);
      }
      return true;
    }

    case '-immune': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡No afecta a ${target.name}!`, 'log-info', target);
      return true;
    }

    case '-fail': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        const style = target === p ? 'log-player' : 'log-enemy';
        const lastMoveId = target.lastMove?.id || store.activeMove?.value?.id || '';
        const isPlayerAttacking = target === p;
        const opponentTeam = isPlayerAttacking
          ? (store.activeBattle.value?.enemyTeam || (store.activeBattle.value?.enemy ? [store.activeBattle.value.enemy] : []))
          : (store.activeBattle.value?.playerTeam || (store.activeBattle.value?.player ? [store.activeBattle.value.player] : []));
        const currentOpponentUid = isPlayerAttacking
          ? store.activeBattle.value?.enemy?.uid
          : store.activeBattle.value?.player?.uid;
        const aliveOpponentsOnBench = opponentTeam.filter(mon => mon && mon.hp > 0 && mon.uid !== currentOpponentUid);

        if (isForcedSwitchMove(lastMoveId) && aliveOpponentsOnBench.length === 0) {
          store.addLog(`¡El movimiento de ${target.name} falló porque no hay ningún Pokémon en la banca para cambiar!`, style, target);
        } else {
          store.addLog(`¡El movimiento de ${target.name} falló!`, style, target);
        }
      }
      return true;
    }

    case 'cant': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const reason = parts[3] || '';
      
      if (reason === 'flinch') {
        const isPlayer = target === p;
        const activeBattle = store.activeBattle.value;
        if (isPlayer && activeBattle?.playerUsedItem) {
          return true;
        }
        if (!isPlayer && activeBattle?.enemyUsedItem) {
          return true;
        }
      }
      
      if (target) {
        if (target.volatileCounters) {
          delete target.volatileCounters['twoturnmove'];
        }
        const style = target === p ? 'log-player' : 'log-enemy';
        const cantMessages: Record<string, string> = {
          'par': 'está paralizado y no puede moverse',
          'slp': 'está dormido',
          'frz': 'está congelado',
          'attract': 'está enamorado y no puede atacar',
          'recharge': 'debe recargar',
          'disable': 'tiene el movimiento desactivado',
          'flinch': 'retrocedió',
          'ability: truant': 'está haraganeando (Truant)',
          'truant': 'está haraganeando (Truant)'
        };
        const cleanReason = reason.toLowerCase(); // text-ok
        const hint = cantMessages[cleanReason] ?? (cleanReason.includes('truant') ? 'está haraganeando (Truant)' : 'no puede moverse');
        store.addLog(`¡${target.name} ${hint}!`, style, target);
      }
      return true;
    }

    case '-crit': {
      if (!line.includes('[silent]')) {
        const target = getPoke(parts[2] || '');
        const msg = target ? `¡Golpe crítico contra ${target.name}!` : '¡Golpe crítico!';
        store.addLog(msg, 'log-info', target || '⚡');
      }
      return true;
    }

    case '-supereffective':
      if (!line.includes('[silent]')) store.addLog('¡Es súper efectivo!', 'log-info', '🔥');
      return true;

    case '-resisted':
      if (!line.includes('[silent]')) store.addLog('No es muy efectivo...', 'log-info', '💧');
      return true;

    case '-block': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} bloqueó el ataque!`, 'log-info', target);
      return true;
    }

    case '-hitcount': {
      if (line.includes('[silent]')) return true;
      const num = parseInt(parts[3] || '0');
      if (num > 0) store.addLog(`¡Golpeó ${num} ${num === 1 ? 'vez' : 'veces'}!`, 'log-info', '🎯');
      return true;
    }

    case '-ohko':
      if (!line.includes('[silent]')) store.addLog('¡Derrota instantánea!', 'log-info', '💀');
      return true;

    case '-activate': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawEffect = parts[3] || parts[2] || '';
      const isMoveEffect = rawEffect.startsWith('move: ');
      const isAbilityEffect = rawEffect.startsWith('ability: ');
      const effect = rawEffect.replace('move: ', '').replace('ability: ', '');
      if (target) {
        if (!target.volatileCounters) target.volatileCounters = {};
        const cleanEff = toID(effect);
        if (cleanEff !== 'mist') {
          target.volatileCounters[requireVolatileStatusKey(cleanEff)] = 1;
        }

        if (cleanEff.includes('confusion')) {
          store.addLog(`¡${target.name} está confundido y se lastimó!`, 'log-info', target);
        } else if (cleanEff.includes('mist')) {
          store.addLog(`¡El Velo Sagrado protegió a ${target.name}!`, 'log-info', target);
        } else if (cleanEff.includes('substitute')) {
          store.addLog(`¡El Sustituto de ${target.name} recibió el golpe!`, 'log-info', target);
        } else if (effect) {
          const logMsg = isAbilityEffect 
            ? `¡Habilidad ${effect} se activó en ${target.name}!`
            : isMoveEffect
              ? `¡Movimiento ${effect} se activó en ${target.name}!`
              : `¡${effect} se activó en ${target.name}!`;
          store.addLog(logMsg, 'log-info', target);
        }
      }
      return true;
    }

    case '-ability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawAbility = parts[3];
      if (!rawAbility) {
        throw new Error(`[ShowdownBridge] Log line |-ability| is missing ability parameter: "${line}"`);
      }
      const fromClause = parts.find(p => p.startsWith('[from]'));
      if (target) {
        const canonicalAbility = requireAbilityId(toID(rawAbility));
        target.ability = canonicalAbility;
        const fromText = fromClause ? ` (${fromClause.replace('[from]', '').trim()})` : '';
        store.addLog(`¡Habilidad: ${rawAbility} de ${target.name}!${fromText}`, 'log-info', target);
      }
      return true;
    }

    case '-enditem': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (!target) {
        throw new Error(`[ShowdownBridge] Target pokemon not found for -enditem line: "${line}"`);
      }
      const rawItem = parts[3];
      if (!rawItem) {
        throw new Error(`[ShowdownBridge] Log line |-enditem| is missing item parameter: "${line}"`);
      }
      const canonicalItem = requireItemId(toID(rawItem));
      target.lastItem = canonicalItem;
      target.heldItem = null;
      target.item = null;
      const verb = line.includes('[eat]') ? 'comió su' : 'perdió su';
      store.addLog(`¡${target.name} ${verb} ${rawItem}!`, 'log-info', target);
      return true;
    }

    case '-item': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (!target) {
        throw new Error(`[ShowdownBridge] Target pokemon not found for -item line: "${line}"`);
      }
      const rawItem = parts[3];
      if (!rawItem) {
        throw new Error(`[ShowdownBridge] Log line |-item| is missing item parameter: "${line}"`);
      }
      const canonicalItem = requireItemId(toID(rawItem));
      target.heldItem = canonicalItem;
      target.item = canonicalItem;
      target.lastItem = null;
      store.addLog(`¡${target.name} tiene ${rawItem}!`, 'log-info', target);
      return true;
    }

    case 'swap': {
      if (line.includes('[silent]')) return true;
      // Showdown format: |swap|POKEMON|POSITION
      const target = getPoke(parts[2] || '');
      const newPos = parseInt(parts[3] || '0', 10);
      if (target) {
        if (!isNaN(newPos)) {
          Reflect.set(target, 'position', newPos)
          target.slotIndex = newPos;
        }
        store.addLog(`¡${target.name} cambió de posición!`, 'log-info', target);
      }
      return true;
    }

    case '-cureteam': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      if (user) store.addLog(`¡El equipo de ${user.name} se curó de todos sus estados!`, 'log-info', user);
      return true;
    }

    case '-mustrecharge': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡${target.name} debe recargar!`, 'log-info', target);
      return true;
    }

    case '-formechange': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawSpecies = parts[3] || '';
      if (target && rawSpecies) {
        const cleanSpecies = rawSpecies.split(',')[0]?.trim() || rawSpecies;
        target.species = requirePokemonSpeciesId(toID(cleanSpecies));
        target.details = rawSpecies;
        store.addLog(`¡${target.name} cambió de forma a ${cleanSpecies}!`, 'log-info', target);
      }
      return true;
    }

    case '-transform': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      const targetPoke = getPoke(parts[3] || '');
      if (user && targetPoke) {
        if (!user.isTransformed) {
          user._originalMoves = Array.isArray(user.moves) ? [...user.moves] : [];
          user._originalSpecies = user.species;
          user._originalType = user.type;
          user._originalType2 = user.type2;
        }
        user.isTransformed = true;
        if (!targetPoke.species) {
          throw new Error(`[showdownBridgeMisc] Transform target has no species defined: ${targetPoke.name}`);
        }
        user.species = targetPoke.species;
        user.type = targetPoke.type;
        user.type2 = targetPoke.type2;
        if (targetPoke.moves) {
          user.moves = targetPoke.moves.map(m => {
            if (!m) return null;
            const copiedMax = Math.min(5, m.maxPP || 5);
            const builtMove: Move = {
              ...m,
              name: m.name ?? m.id ?? '',
              pp: copiedMax,
              maxPP: copiedMax
            }
            return builtMove;
          });
        }
        store.addLog(`¡${user.name} se transformó en ${targetPoke.name}!`, 'log-info', user);
      } else if (user && parts[3]) {
        store.addLog(`¡${user.name} se transformó en ${parts[3]}!`, 'log-info', user);
      }
      return true;
    }

    case '-singlemove':
    case '-singleturn': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const moveOrEffect = parts[3] || '';
      const cleanEffect = requireVolatileStatusKey(toID(moveOrEffect.startsWith('move:') ? moveOrEffect.replace('move:', '') : moveOrEffect));
      if (target) {
        if (!target.volatileCounters) target.volatileCounters = {};
        target.volatileCounters[cleanEffect] = 1;
        if (cleanEffect === 'protect' || cleanEffect === 'detect' || cleanEffect === 'endure') {
          store.addLog(`¡${target.name} se protegió!`, 'log-info', target);
        }
      }
      return true;
    }

    case '-candynamax':
    case '-center':
    case '-combine':
    case '-waiting':
    case 'custom':
      return true;

    case '-endability': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        target.ability = undefined;
        store.addLog(`¡La habilidad de ${target.name} fue suprimida!`, 'log-info', target);
      }
      return true;
    }

    case 'detailschange':
    case 'replace': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const rawDetails = parts[3] || parts[2] || '';
      if (target && rawDetails) {
        const newSpecies = rawDetails.split(',')[0]?.trim();
        if (newSpecies) {
          const speciesId = requirePokemonSpeciesId(toID(newSpecies));
          target.species = speciesId;
          target.details = rawDetails;
          const data = pokemonDataProvider.getPokemonData(speciesId);
          if (data) {
            if (data.type) target.type = data.type;
            if (data.type2 !== undefined) target.type2 = data.type2;
            const ability = pokemonDataProvider.getSpeciesAbilities(speciesId)[0];
            if (ability) target.ability = requireAbilityId(ability);
            if (data.hp) target.maxHp = data.hp;
            if (data.atk) target.atk = data.atk;
            if (data.def) target.def = data.def;
            if (data.spa) target.spa = data.spa;
            if (data.spd) target.spd = data.spd;
            if (data.spe) target.spe = data.spe;
          }
        }
        const msg = type === 'replace'
          ? `¡Era ${target.name} disfrazado!`
          : `¡${target.name} cambió de forma!`;
        store.addLog(msg, 'log-info', target);
      }
      return true;
    }

    case 'switch':
    case 'drag': {
      console.debug(`[E2E-DEBUG-BRIDGE-SWITCH] Entering switch/drag parser. type: ${type}, rawId: "${parts[2]}", hpString: "${parts[4]}"`);
      const target = getPoke(parts[2] || '');
      const rawDetails = parts[3] || '';
      const hpString = parts[4] || '';
      if (target) {
        if (target.volatileCounters) {
          target.volatileCounters = {};
        }
        if (rawDetails) {
          target.details = rawDetails;
        }
        const hpAndStatus = hpString.split(' ');
        const rawHp = hpAndStatus[0] || '0';
        const hpParts = rawHp.split('/');
        target.hp = parseInt(hpParts[0] || '0', 10);
        if (hpParts[1]) {
          const parsedMax = parseInt(hpParts[1], 10);
          if (!isNaN(parsedMax) && parsedMax > 0) target.maxHp = parsedMax;
        }
        const statusStr = hpAndStatus[1];
        if (statusStr === 'fnt') {
          target.hp = 0;
          target.fainted = true;
          target.status = '';
        } else if (statusStr && isPokemonStatus(statusStr)) {
          target.status = statusStr;
        }

        const side = getSide(parts[2] || '');
        const active = store.activeBattle?.value;
        const isSilent = line.includes('[silent]');

        if (active && side === 'enemy') {
          return (async () => {
            const currentEnemy = active.enemy;
            const isDifferentEnemy = !currentEnemy || currentEnemy.uid !== target.uid;

            if (isDifferentEnemy) {
              if (currentEnemy && currentEnemy.hp > 0 && !currentEnemy.fainted) {
                if (store.exitingEnemy) store.exitingEnemy.value = currentEnemy;
                if (type === 'drag') {
                  const triggeringMoveId = store.activeMove?.value?.id || p?.lastMove?.id || e?.lastMove?.id || 'whirlwind';
                  const forcedConfig = getForcedExitConfig(triggeringMoveId);
                  store.addLog(forcedConfig.getExpulsionLog(currentEnemy.name), 'log-enemy', 'enemy_trainer');
                  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
                  }
                  gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: forcedConfig.escapeType, pokemon: currentEnemy });
                  if (store.animations?.awaitTween) {
                    await store.animations.awaitTween('escape-enemy');
                  }
                } else {
                  store.addLog(`¡${active.trainerName || 'El entrenador'} retira a ${currentEnemy.name}!`, 'log-enemy', 'enemy_trainer');
                  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_RECALL);
                  }
                  if (store.animations?.handleWithdrawRequest) {
                    await store.animations.handleWithdrawRequest({ side: 'enemy', pokemon: currentEnemy });
                  }
                }
                if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                  await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.VACATE_SEAT);
                }
                if (store.exitingEnemy) store.exitingEnemy.value = null;
              }

              active.enemy = target;
              if (active.participants && !active.participants.includes(target.uid)) {
                active.participants.push(target.uid);
              }

              if (store.enemyStages?.value) {
                const s = store.enemyStages.value;
                store.enemyStages.value = {
                  ...s,
                  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0
                };
              }

              if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_CALL);
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.RENDER_BALL);
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.OCCUPY_SEAT);
              }

              if (type === 'drag') {
                store.addLog(`¡${target.name} fue arrastrado al campo!`, 'log-enemy', 'enemy_trainer');
              } else if (!isSilent) {
                store.addLog(`¡${active.trainerName || 'El entrenador'} envía a ${target.name}!`, 'log-enemy', 'enemy_trainer');
              }

              if (store.animations?.handleReleaseRequest) {
                await store.animations.handleReleaseRequest({ side: 'enemy', pokemon: target });
              }

              const { applyEntryHazards } = await import('./battleFlow.ts');
              applyEntryHazards(target, store.enemyStages?.value || {}, store.addLog);
            } else {
              active.enemy = target;
            }
            return true;
          })();
        } else if (active && side === 'player') {
          return (async () => {
            const currentPlayer = active.player;
            const isDifferentPlayer = !currentPlayer || currentPlayer.uid !== target.uid;

            if (isDifferentPlayer) {
              if (currentPlayer && currentPlayer.hp > 0 && !currentPlayer.fainted) {
                if (store.exitingPlayer) store.exitingPlayer.value = currentPlayer;
                if (type === 'drag') {
                  const triggeringMoveId = store.activeMove?.value?.id || e?.lastMove?.id || p?.lastMove?.id || 'whirlwind';
                  const forcedConfig = getForcedExitConfig(triggeringMoveId);
                  store.addLog(forcedConfig.getExpulsionLog(currentPlayer.name), 'log-player', 'player');
                  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
                  }
                  gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'player', type: forcedConfig.escapeType, pokemon: currentPlayer });
                  if (store.animations?.awaitTween) {
                    await store.animations.awaitTween('escape-player');
                  }
                } else {
                  store.addLog(`¡Bien hecho, ${currentPlayer.name}! ¡Regresa!`, 'log-info', 'player');
                  if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                    await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_RECALL);
                  }
                  if (store.animations?.handleWithdrawRequest) {
                    await store.animations.handleWithdrawRequest({ side: 'player', pokemon: currentPlayer });
                  }
                }
                if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                  await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.VACATE_SEAT);
                }
                if (store.exitingPlayer) store.exitingPlayer.value = null;
              }

              active.player = target;
              if (active.participants && !active.participants.includes(target.uid)) {
                active.participants.push(target.uid);
              }

              if (store.playerStages?.value) {
                const s = store.playerStages.value;
                store.playerStages.value = {
                  ...s,
                  atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0
                };
              }

              if (store.fsm && store.BATTLE_STATES && store.BATTLE_SUBSTATES) {
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.POKEMON_CALL);
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.RENDER_BALL);
                await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.OCCUPY_SEAT);
              }

              if (type === 'drag') {
                store.addLog(`¡${target.name} fue arrastrado al campo!`, 'log-player', target);
              } else if (!isSilent) {
                store.addLog(`¡Adelante, ${target.name}!`, 'log-player', target);
              }

              if (store.animations?.handleReleaseRequest) {
                await store.animations.handleReleaseRequest({ side: 'player', pokemon: target });
              }

              const { applyEntryHazards } = await import('./battleFlow.ts');
              applyEntryHazards(target, store.playerStages?.value || {}, store.addLog);
            } else {
              active.player = target;
              if (!isSilent && !Reflect.get(active, '_playerSwitchLogged')) {
                store.addLog(`¡Adelante, ${target.name}!`, 'log-player', target);
              }
              if (Reflect.get(active, '_playerSwitchLogged')) {
                Reflect.deleteProperty(active, '_playerSwitchLogged');
              }
            }
            return true;
          })();
        }
      }
      return true;
    }

    case '-terastallize': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const teraType = parts[3] || '';
      if (target) store.addLog(`¡${target.name} ha Terastalizado${teraType ? ` a tipo ${teraType}` : ''}!`, 'log-info', '💎');
      return true;
    }

    case '-mega': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const megaSpecies = parts[3] || '';
      if (target) {
        if (megaSpecies && megaSpecies !== 'Mega Stone') {
          target.species = requirePokemonSpeciesId(toID(megaSpecies));
        }
        store.addLog(`¡${target.name} megaevolucionó${megaSpecies ? ` en ${megaSpecies}` : ''}!`, 'log-info', '✨');
      }
      return true;
    }

    case '-primal': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        store.addLog(`¡${target.name} regresó a su forma Primigenia!`, 'log-info', '🌋');
      }
      return true;
    }

    case '-zpower': {
      if (line.includes('[silent]')) return true;
      const user = getPoke(parts[2] || '');
      const userName = user ? user.name : (parts[2] || 'El Pokémon');
      store.addLog(`¡${userName} desató el poder del Z-Move!`, 'log-info', '⭐');
      return true;
    }

    case '-zbroken': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) store.addLog(`¡El Z-Move rompió la protección de ${target.name}!`, 'log-info', '⭐');
      return true;
    }

    case '-burst': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      if (target) {
        store.addLog(`¡${target.name} ha Ultra Estallado!`, 'log-info', '🌟');
      }
      return true;
    }

    case '-anim': {
      // Registrar que la animación de movimiento fue recibida (y opcionalmente dispararla en UI)
      return true;
    }

    case 'turn':
    case 'upkeep': {
      if (store.activeBattle.value) {
        if (type === 'turn') {
          const turnNum = parseInt(parts[2] || '1', 10);
          store.activeBattle.value.turnCount = turnNum;
        }
        const seatKeys = ['player', 'playerB', 'enemy', 'enemyB', 'p1', 'p2', 'p3', 'p4'] as const;
        seatKeys.forEach(k => {
          const mon = Reflect.get(store.activeBattle.value!, k) as { volatileCounters?: Record<string, number> } | null | undefined;
          if (mon && mon.volatileCounters) {
            delete mon.volatileCounters['protect'];
            delete mon.volatileCounters['flinch'];
            delete mon.volatileCounters['endure'];
          }
        });
      }
      return true;
    }

    default:
      return false;
  }
}
