import type { SBCtx } from './showdownBridgeCtx.ts';
import { isPokemonStatus, requireVolatileStatusKey, type Move } from '../../types/pokemon/pokemon.ts';
import { toID } from '@pkmn/sim';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requirePokemonSpeciesId } from '../../data/pokemon/pokedex.ts';


/**
 * Maneja eventos misceláneos, efectos de combate y mecánicas Gen 6-9:
 * -miss, -immune, -fail, cant, -crit, -supereffective, -resisted, -block,
 * -hitcount, -ohko, -activate, -ability, -enditem, -item,
 * -cureteam, -mustrecharge, -formechange, -transform,
 * -singlemove, -singleturn, -endability, detailschange, replace,
 * switch, drag, -terastallize, -mega, -primal, -zpower, -zbroken,
 * -burst, -candynamax
 */
export function handleMiscEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, p, getPoke, getSide } = ctx;

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
        store.addLog(`¡El movimiento de ${target.name} falló!`, style, target);
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
      const ability = parts[3] || '';
      const fromClause = parts.find(p => p.startsWith('[from]'));
      if (target && ability) {
        target.ability = requireAbilityId(toID(ability));
        const fromText = fromClause ? ` (${fromClause.replace('[from]', '').trim()})` : '';
        store.addLog(`¡Habilidad: ${ability} de ${target.name}!${fromText}`, 'log-info', target);
      }
      return true;
    }

    case '-enditem': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const item = parts[3] || '';
      if (target) {
        if (item || target.item) target.lastItem = item || target.item;
        target.heldItem = '';
        target.item = '';
        const verb = line.includes('[eat]') ? 'comió su' : 'perdió su';
        store.addLog(`¡${target.name} ${verb} ${item || 'objeto'}!`, 'log-info', target);
      }
      return true;
    }

    case '-item': {
      if (line.includes('[silent]')) return true;
      const target = getPoke(parts[2] || '');
      const item = parts[3] || '';
      if (target && item) {
        target.heldItem = item;
        target.item = item;
        target.lastItem = '';
        store.addLog(`¡${target.name} tiene ${item}!`, 'log-info', target);
      }
      return true;
    }

    case 'swap': {
      if (line.includes('[silent]')) return true;
      // Showdown format: |swap|POKEMON|POSITION
      const target = getPoke(parts[2] || '');
      const newPos = parseInt(parts[3] || '0', 10);
      if (target) {
        if (!isNaN(newPos)) {
          (target as unknown as { position?: number; slotIndex?: number }).position = newPos;
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
        target.hp = parseInt(hpParts[0] || '0');
        if (hpParts[1]) {
          const parsedMax = parseInt(hpParts[1]);
          if (!isNaN(parsedMax)) target.maxHp = parsedMax;
        }
        const statusStr = hpAndStatus[1];
        if (statusStr && isPokemonStatus(statusStr)) {
          target.status = statusStr;
        } else {
          target.status = '';
        }

        const side = getSide(parts[2] || '');
        if (store.activeBattle.value) {
          const sub = store.fsm?.currentSubState;
          const subName = String(sub?.value || sub || '');
          const isFsmAnimActive = Boolean(store.isIntroAnimating?.value) || ['POKEMON_RECALL', 'POKEMON_CALL', 'ENEMY_REPLACEMENT_SEQ', 'ENTRY_ANIM', 'PARALLEL_JUMP'].includes(subName);
          const bState = store.activeBattle.value as unknown as Record<string, unknown>;
          if (side === 'player') {
            if (!isFsmAnimActive) {
              store.activeBattle.value.player = target;
            } else {
              bState.switchingToPlayer = target;
            }
            const team = store.activeBattle.value.playerTeam || [];
            const idx = team.findIndex(p => p && p.uid === target.uid);
            if (idx !== -1) {
              store.activeBattle.value.playerTeamIndex = idx;
            }
          } else if (side === 'enemy') {
            if (!isFsmAnimActive) {
              store.activeBattle.value.enemy = target;
            } else {
              bState.switchingToEnemy = target;
            }
            const team = store.activeBattle.value.enemyTeam || [];
            const idx = team.findIndex(p => p && p.uid === target.uid);
            if (idx !== -1) {
              store.activeBattle.value.enemyTeamIndex = idx;
            }
          }
        }
      }
      if (type === 'drag' && !line.includes('[silent]')) {
        if (target) store.addLog(`¡${target.name} fue arrastrado al campo!`, 'log-info', target);
      } else if (type === 'switch' && !line.includes('[silent]')) {
        if (target) {
          const side = getSide(parts[2] || '');
          const msg = side === 'player' ? `¡Adelante, ${target.name}! ` : `¡El rival envió a ${target.name}!`;
          const style = side === 'player' ? 'log-player' : 'log-enemy';
          store.addLog(msg, style, target);
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
        const b = store.activeBattle.value as unknown as Record<string, unknown>;
        const seatKeys = ['player', 'playerB', 'enemy', 'enemyB', 'p1', 'p2', 'p3', 'p4'] as const;
        seatKeys.forEach(k => {
          const mon = b[k] as { volatileCounters?: Record<string, number> } | null | undefined;
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
