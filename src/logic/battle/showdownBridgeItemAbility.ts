import type { SBCtx } from './showdownBridgeCtx.ts';
import { requireVolatileStatusKey, type Pokemon } from '../../types/pokemon/pokemon.ts';
import { toID } from '@/logic/utils/strings.ts';
import { requireAbilityId } from '../../data/battle/abilities.ts';
import { requireItemId } from '../../data/inventory/items.ts';

const CANT_MESSAGES: Readonly<Record<string, string>> = {
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

function isItemUsedDuringFlinch(target: Pokemon | null | undefined, p: Pokemon | null | undefined, store: SBCtx['store']): boolean {
  const isPlayer = target === p;
  const activeBattle = store.activeBattle.value;
  return Boolean(isPlayer ? activeBattle?.playerUsedItem : activeBattle?.enemyUsedItem);
}

function handleCantToken(ctx: SBCtx): boolean {
  const { store, parts, p, getPoke } = ctx;
  const target = getPoke(parts[2] || '');
  const reason = parts[3] || '';
  
  if (reason === 'flinch' && isItemUsedDuringFlinch(target, p, store)) {
    return true;
  }
  
  if (target) {
    if (target.volatileCounters) {
      delete target.volatileCounters['twoturnmove'];
    }
    const style = target === p ? 'log-player' : 'log-enemy';
    const cleanReason = reason.toLowerCase(); // text-ok
    const hint = CANT_MESSAGES[cleanReason] ?? (cleanReason.includes('truant') ? 'está haraganeando (Truant)' : 'no puede moverse');
    store.addLog(`¡${target.name} ${hint}!`, style, target);
  }
  return true;
}

function formatActivateLog(target: Pokemon, cleanEff: string, effect: string, isAbility: boolean, isMove: boolean): string {
  if (cleanEff.includes('confusion')) return `¡${target.name} está confundido y se lastimó!`;
  if (cleanEff.includes('mist')) return `¡El Velo Sagrado protegió a ${target.name}!`;
  if (cleanEff.includes('substitute')) return `¡El Sustituto de ${target.name} recibió el golpe!`;
  if (!effect) return '';
  const prefix = isAbility ? 'Habilidad ' : isMove ? 'Movimiento ' : '';
  return `¡${prefix}${effect} se activó en ${target.name}!`;
}

function handleActivateToken(target: Pokemon | null | undefined, rawEffect: string, store: SBCtx['store']): boolean {
  if (!target) return true;
  const isMoveEffect = rawEffect.startsWith('move: ');
  const isAbilityEffect = rawEffect.startsWith('ability: ');
  const effect = rawEffect.replace('move: ', '').replace('ability: ', '');

  if (!target.volatileCounters) target.volatileCounters = {};
  const cleanEff = toID(effect);
  if (cleanEff !== 'mist') {
    target.volatileCounters[requireVolatileStatusKey(cleanEff)] = 1;
  }

  const logMsg = formatActivateLog(target, cleanEff, effect, isAbilityEffect, isMoveEffect);
  if (logMsg) {
    store.addLog(logMsg, 'log-info', target);
  }
  return true;
}

function handleItemToken(target: Pokemon | null | undefined, rawItem: string | undefined, line: string, store: SBCtx['store']): boolean {
  if (!target) {
    throw new Error(`[ShowdownBridge] Target pokemon not found for -item line: "${line}"`);
  }
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

function handleEndItemToken(target: Pokemon | null | undefined, rawItem: string | undefined, line: string, store: SBCtx['store']): boolean {
  if (!target) {
    throw new Error(`[ShowdownBridge] Target pokemon not found for -enditem line: "${line}"`);
  }
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

function handleSingleMoveOrTurnToken(target: Pokemon | null | undefined, moveOrEffect: string, store: SBCtx['store']): boolean {
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

function handleAbilityToken(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  const rawAbility = ctx.parts[3];
  if (!rawAbility) {
    throw new Error(`[ShowdownBridge] Log line |-ability| is missing ability parameter: "${ctx.line}"`);
  }
  const fromClause = ctx.parts.find(pKey => pKey.startsWith('[from]'));
  if (target) {
    const canonicalAbility = requireAbilityId(toID(rawAbility));
    target.ability = canonicalAbility;
    const fromText = fromClause ? ` (${fromClause.replace('[from]', '').trim()})` : '';
    ctx.store.addLog(`¡Habilidad: ${rawAbility} de ${target.name}!${fromText}`, 'log-info', target);
  }
  return true;
}

function handleEndAbilityToken(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (target) {
    target.ability = undefined;
    ctx.store.addLog(`¡La habilidad de ${target.name} fue suprimida!`, 'log-info', target);
  }
  return true;
}

function handleCureTeamToken(ctx: SBCtx): boolean {
  const user = ctx.getPoke(ctx.parts[2] || '');
  if (user) ctx.store.addLog(`¡El equipo de ${user.name} se curó de todos sus estados!`, 'log-info', user);
  return true;
}

function handleMustRechargeToken(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (target) ctx.store.addLog(`¡${target.name} debe recargar!`, 'log-info', target);
  return true;
}

function handleSwapToken(ctx: SBCtx): boolean {
  const target = ctx.getPoke(ctx.parts[2] || '');
  const newPos = parseInt(ctx.parts[3] || '0', 10);
  if (target) {
    if (!isNaN(newPos)) {
      Reflect.set(target, 'position', newPos);
      target.slotIndex = newPos;
    }
    ctx.store.addLog(`¡${target.name} cambió de posición!`, 'log-info', target);
  }
  return true;
}

const ITEM_ABILITY_HANDLERS: Readonly<Record<string, (ctx: SBCtx) => boolean>> = {
  'cant': handleCantToken,
  '-activate': (ctx) => handleActivateToken(ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3] || ctx.parts[2] || '', ctx.store),
  '-ability': handleAbilityToken,
  '-endability': handleEndAbilityToken,
  '-item': (ctx) => handleItemToken(ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3], ctx.line, ctx.store),
  '-enditem': (ctx) => handleEndItemToken(ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3], ctx.line, ctx.store),
  '-cureteam': handleCureTeamToken,
  '-mustrecharge': handleMustRechargeToken,
  '-singlemove': (ctx) => handleSingleMoveOrTurnToken(ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3] || '', ctx.store),
  '-singleturn': (ctx) => handleSingleMoveOrTurnToken(ctx.getPoke(ctx.parts[2] || ''), ctx.parts[3] || '', ctx.store),
  'swap': handleSwapToken
};

export function handleItemAndAbilityEvents(ctx: SBCtx): boolean {
  if (ctx.line.includes('[silent]')) return true;
  const handler = ITEM_ABILITY_HANDLERS[ctx.type];
  return handler ? handler(ctx) : false;
}
