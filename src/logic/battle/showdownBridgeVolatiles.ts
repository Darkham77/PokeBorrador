import { SHOWDOWN_DISABLE_DURATION_TURNS } from '../../data/system/constants.ts';
import { toID } from '@/logic/utils/strings.ts';
import type { SBCtx } from './showdownBridgeCtx.ts';
import { pokemonDataProvider } from '../providers/pokemonDataProvider.ts';
import { toPokemonType } from '@/data/battle/types.ts';
import { isPokemonMoveId, requirePokemonMoveId } from '@/data/battle/moves.ts';
import { requireVolatileStatusKey } from '@/types/pokemon/pokemon.ts';

type VolatileTarget = NonNullable<ReturnType<SBCtx['getPoke']>>;
type VolatileStartHandler = (ctx: SBCtx, target: VolatileTarget, parts: string[], line: string) => void;
type VolatileEndHandler = (ctx: SBCtx, target: VolatileTarget, line: string) => void;

const VOLATILE_START_HANDLERS: Record<string, VolatileStartHandler> = {
  typechange: (_ctx, target, parts) => {
    const newType = parts[4] || '';
    if (newType && !newType.startsWith('[')) target.type = toPokemonType(toID(newType));
  },
  typeadd: (_ctx, target, parts) => {
    const addedType = parts[4] || parts[3] || '';
    if (addedType) target.addedType = toPokemonType(toID(addedType));
  },
  confusion: ({ store }, target, _parts, line) => {
    target.volatileCounters!['confusion'] = 1;
    delete target.volatileCounters!['lockedmove'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se confundió!`, 'log-info', target);
  },
  disable: ({ store }, target, parts, line) => {
    const moveName = parts[4] || '';
    const cleanMoveId = toID(moveName);
    if (isPokemonMoveId(cleanMoveId)) {
      const moveId = requirePokemonMoveId(cleanMoveId);
      const moveData = pokemonDataProvider.getMoveData(moveId);
      const translatedName = moveData?.name || moveName;
      target.disabledMove = { id: moveId, name: translatedName, pp: 0, maxPP: 0 };
      target.disabledTurns = SHOWDOWN_DISABLE_DURATION_TURNS;
      if (!line.includes('[silent]')) store.addLog(`¡El ataque ${translatedName} de ${target.name} ha sido desactivado temporalmente!`, 'log-info', target);
    }
  },
  leechseed: ({ store }, target, _parts, line) => {
    target.volatileCounters!['leechseed'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} fue infectado con Drenadoras!`, 'log-info', target);
  },
  substitute: ({ store }, target, _parts, line) => {
    target.volatileCounters!['substitute'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} creó un sustituto!`, 'log-info', target);
  },
  attract: ({ store }, target, _parts, line) => {
    target.volatileCounters!['attract'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se enamoró!`, 'log-info', target);
  },
  taunt: ({ store }, target, _parts, line) => {
    target.volatileCounters!['taunt'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} cayó bajo la mofa!`, 'log-info', target);
  },
  encore: ({ store }, target, _parts, line) => {
    target.volatileCounters!['encore'] = 1;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} recibió un Bis!`, 'log-info', target);
  }
};

const VOLATILE_END_HANDLERS: Record<string, VolatileEndHandler> = {
  confusion: ({ store }, target, line) => {
    delete target.volatileCounters!['confusion'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está confundido!`, 'log-info', target);
  },
  disable: ({ store }, target, line) => {
    target.disabledMove = null;
    target.disabledTurns = 0;
    if (target.moves) target.moves.forEach(m => { if (m) m.disabled = false; });
    if (!line.includes('[silent]')) store.addLog(`¡El movimiento de ${target.name} volvió a estar disponible!`, 'log-info', target);
  },
  leechseed: ({ store }, target, line) => {
    delete target.volatileCounters!['leechseed'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} se liberó de las Drenadoras!`, 'log-info', target);
  },
  substitute: ({ store }, target, line) => {
    delete target.volatileCounters!['substitute'];
    if (!line.includes('[silent]')) store.addLog(`¡El sustituto de ${target.name} se rompió!`, 'log-info', target);
  },
  attract: ({ store }, target, line) => {
    delete target.volatileCounters!['attract'];
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} ya no está enamorado!`, 'log-info', target);
  },
  taunt: ({ store }, target, line) => {
    delete target.volatileCounters!['taunt'];
    if (!line.includes('[silent]')) store.addLog(`¡El efecto de Mofa sobre ${target.name} terminó!`, 'log-info', target);
  },
  encore: ({ store }, target, line) => {
    delete target.volatileCounters!['encore'];
    if (!line.includes('[silent]')) store.addLog(`¡El efecto de Bis sobre ${target.name} terminó!`, 'log-info', target);
  }
};

export function handleStartVolatileEvent(ctx: SBCtx, parts: string[], line: string): boolean {
  const { store, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const effect = parts[3] || '';
  if (!target || !effect) return true;

  const cleanEffect = toID(effect);
  if (!target.volatileCounters) target.volatileCounters = {};

  const specificHandler = VOLATILE_START_HANDLERS[cleanEffect];
  if (specificHandler) {
    specificHandler(ctx, target, parts, line);
    return true;
  }

  if (cleanEffect.startsWith('perish')) {
    const perishCount = parseInt(cleanEffect.slice(-1), 10);
    target.volatileCounters['perishsong'] = perishCount;
    if (!line.includes('[silent]')) store.addLog(`¡${target.name} escucha el Canto Mortal! (${perishCount} turnos)`, 'log-info', target);
    return true;
  }

  const isAbilityEffect = effect.startsWith('ability:');
  const isMoveEffect = effect.startsWith('move:');
  const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
  const cleanEffectKey = toID(rawEffectId);
  const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));

  if (isLockedEffect) {
    target.volatileCounters['lockedmove'] = 1;
  } else if (cleanEffectKey) {
    target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)] = 1;
  }
  if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡${target.name} se vio afectado por ${cleanEffectKey}!`, 'log-info', target);

  return true;
}

export function handleEndVolatileEvent(ctx: SBCtx, parts: string[], line: string): boolean {
  const { store, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const effect = parts[3] || '';
  if (!target || !effect || !target.volatileCounters) return true;

  const cleanEffect = toID(effect);
  const specificHandler = VOLATILE_END_HANDLERS[cleanEffect];
  if (specificHandler) {
    specificHandler(ctx, target, line);
    return true;
  }

  if (cleanEffect.startsWith('perish')) {
    delete target.volatileCounters['perishsong'];
    return true;
  }

  const isAbilityEffect = effect.startsWith('ability:');
  const isMoveEffect = effect.startsWith('move:');
  const rawEffectId = isMoveEffect ? effect.replace(/^move:\s*/i, '') : isAbilityEffect ? effect.replace(/^ability:\s*/i, '') : effect;
  const cleanEffectKey = toID(rawEffectId);
  const isLockedEffect = !isAbilityEffect && (cleanEffectKey === 'lockedmove' || (isPokemonMoveId(cleanEffectKey) && pokemonDataProvider.getMoveData(rawEffectId).self?.volatileStatus === 'lockedmove'));

  if (isLockedEffect) {
    delete target.volatileCounters['lockedmove'];
  } else if (cleanEffectKey) {
    delete target.volatileCounters[requireVolatileStatusKey(cleanEffectKey)];
  }
  if (!isAbilityEffect && !line.includes('[silent]')) store.addLog(`¡El efecto de ${cleanEffectKey} sobre ${target.name} terminó!`, 'log-info', target);

  return true;
}
