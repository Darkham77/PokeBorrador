import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move } from '../../types/pokemon/pokemon.ts';
import { toID } from '@/logic/utils/strings.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requirePokemonSpeciesId } from '../../data/pokemon/pokedex.ts';

export function handleGimmickEvents(ctx: SBCtx): boolean {
  const { store, type, parts, line, getPoke } = ctx;

  switch (type) {
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
            };
            return builtMove;
          });
        }
        store.addLog(`¡${user.name} se transformó en ${targetPoke.name}!`, 'log-info', user);
      } else if (user && parts[3]) {
        store.addLog(`¡${user.name} se transformó en ${parts[3]}!`, 'log-info', user);
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

    default:
      return false;
  }
}
