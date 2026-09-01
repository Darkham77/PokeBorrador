import type { SBCtx } from './showdownBridgeCtx.ts';
import type { Move, Pokemon } from '../../types/pokemon/pokemon.ts';
import { toID } from '@/logic/utils/strings.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requirePokemonSpeciesId } from '../../data/pokemon/pokedex.ts';

function applyTransformToUser(user: Pokemon, targetPoke: Pokemon): void {
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
}

function handleTransformToken(
  user: Pokemon | null | undefined,
  targetPoke: Pokemon | null | undefined,
  rawTargetName: string,
  store: SBCtx['store']
): boolean {
  if (user && targetPoke) {
    applyTransformToUser(user, targetPoke);
    store.addLog(`¡${user.name} se transformó en ${targetPoke.name}!`, 'log-info', user);
  } else if (user && rawTargetName) {
    store.addLog(`¡${user.name} se transformó en ${rawTargetName}!`, 'log-info', user);
  }
  return true;
}

function applySpeciesDetailsToTarget(target: Pokemon, newSpecies: string, rawDetails: string): void {
  const speciesId = requirePokemonSpeciesId(toID(newSpecies));
  target.species = speciesId;
  target.details = rawDetails;
  const data = pokemonDataProvider.getPokemonData(speciesId);
  if (!data) return;

  if (data.type) target.type = data.type;
  if (data.type2 !== undefined) target.type2 = data.type2;
  const ability = pokemonDataProvider.getSpeciesAbilities(speciesId)[0];
  if (ability) target.ability = requireAbilityId(ability);
  if (data.hp) target.maxHp = data.hp;
  target.atk = data.atk ?? target.atk;
  target.def = data.def ?? target.def;
  target.spa = data.spa ?? target.spa;
  target.spd = data.spd ?? target.spd;
  target.spe = data.spe ?? target.spe;
}

function handleDetailsChangeToken(
  type: string,
  target: Pokemon | null | undefined,
  rawDetails: string,
  store: SBCtx['store']
): boolean {
  if (target && rawDetails) {
    const newSpecies = rawDetails.split(',')[0]?.trim();
    if (newSpecies) {
      applySpeciesDetailsToTarget(target, newSpecies, rawDetails);
    }
    const msg = type === 'replace'
      ? `¡Era ${target.name} disfrazado!`
      : `¡${target.name} cambió de forma!`;
    store.addLog(msg, 'log-info', target);
  }
  return true;
}

function handleTerastallize(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  const teraType = ctx.parts[3] || '';
  if (target) ctx.store.addLog(`¡${target.name} ha Terastalizado${teraType ? ` a tipo ${teraType}` : ''}!`, 'log-info', '💎');
  return true;
}

function handleMega(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  const megaSpecies = ctx.parts[3] || '';
  if (target) {
    if (megaSpecies && megaSpecies !== 'Mega Stone') {
      target.species = requirePokemonSpeciesId(toID(megaSpecies));
    }
    ctx.store.addLog(`¡${target.name} megaevolucionó${megaSpecies ? ` en ${megaSpecies}` : ''}!`, 'log-info', '✨');
  }
  return true;
}

function handlePrimal(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (target) ctx.store.addLog(`¡${target.name} regresó a su forma Primigenia!`, 'log-info', '🌋');
  return true;
}

function handleZPower(ctx: SBCtx): boolean {
  const user = ctx.getPoke(ctx.parts[2] || '');
  const userName = user ? user.name : (ctx.parts[2] || 'El Pokémon');
  ctx.store.addLog(`¡${userName} desató el poder del Z-Move!`, 'log-info', '⭐');
  return true;
}

function handleZBroken(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (target) ctx.store.addLog(`¡El Z-Move rompió la protección de ${target.name}!`, 'log-info', '⭐');
  return true;
}

function handleBurst(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (target) ctx.store.addLog(`¡${target.name} ha Ultra Estallado!`, 'log-info', '🌟');
  return true;
}

function handleFormeChange(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  const rawSpecies = ctx.parts[3] || '';
  if (target && rawSpecies) {
    const cleanSpecies = rawSpecies.split(',')[0]?.trim() || rawSpecies;
    target.species = requirePokemonSpeciesId(toID(cleanSpecies));
    target.details = rawSpecies;
    ctx.store.addLog(`¡${target.name} cambió de forma a ${cleanSpecies}!`, 'log-info', target);
  }
  return true;
}

const GIMMICK_HANDLERS: Readonly<Record<string, (ctx: SBCtx) => boolean>> = {
  '-terastallize': handleTerastallize,
  '-mega': handleMega,
  '-primal': handlePrimal,
  '-zpower': handleZPower,
  '-zbroken': handleZBroken,
  '-burst': handleBurst,
  '-formechange': handleFormeChange,
  '-transform': (ctx) => handleTransformToken(ctx.getPoke(ctx.parts[2] || ''), ctx.getPoke(ctx.parts[3] || ''), ctx.parts[3] || '', ctx.store),
  'detailschange': (ctx) => handleDetailsChangeToken(ctx.type, ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3] || ctx.parts[2] || '', ctx.store),
  'replace': (ctx) => handleDetailsChangeToken(ctx.type, ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3] || ctx.parts[2] || '', ctx.store)
};

export function handleGimmickEvents(ctx: SBCtx): boolean {
  if (ctx.line.includes('[silent]')) return true;
  const handler = GIMMICK_HANDLERS[ctx.type];
  return handler ? handler(ctx) : false;
}
