import { requireWeatherId, resolveCurrentWeather } from '../weather/weatherRegistry.ts';
import type { BattleWeather, BattleState } from '@/types/battle/battle';
import { tickStatus, tickLeechSeed } from './battleStatus.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import { applyEndTurnWeather } from './battleFlowWeatherHelper.ts';

export { updateCastformForm, handleEntryAbilities } from './battleFlowFormHelper.ts';
export { applyEntryHazards } from './battleFlowHazardsHelper.ts';

async function processPendingSlotEffects(active: BattleState, ctx: BattleContext): Promise<void> {
  if (!active.pendingSlotEffects?.length) return;
  const resolved: typeof active.pendingSlotEffects = [];
  for (const effect of active.pendingSlotEffects) {
    effect.turnsLeft--;
    if (effect.turnsLeft <= 0) {
      const fsTarget = effect.side === 'player' ? active.player : active.enemy;
      if (fsTarget && fsTarget.hp > 0) {
        fsTarget.hp = Math.max(0, fsTarget.hp - effect.damage);
        const fromText = effect.sourceName ? ` de ${effect.sourceName}` : '';
        ctx.addLog(`¡Se cumplió la premonición${fromText}! ${fsTarget.name} recibió daño.`, 'log-info', fsTarget);
        const side = effect.side;
        if (ctx.animations?.handleBlinkRequest) {
          await ctx.animations.handleBlinkRequest({ side });
        }
      }
    } else {
      resolved.push(effect);
    }
  }
  active.pendingSlotEffects = resolved;
}

function processEndTurnWeatherFade(w: BattleWeather | undefined, ctx: BattleContext): void {
  if (w && w.turns > 0) {
    w.turns--;
    if (w.turns === 0) {
      ctx.addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info');
      w.type = requireWeatherId(resolveCurrentWeather() || 'clear');
      w.turns = -1;
    }
  }
}

function processFieldScreensDecay(ctx: BattleContext): void {
  const fieldEffects = ['reflect', 'lightScreen', 'safeguard', 'mist'] as const;
  const sides = [
    { stages: ctx.playerStages, name: 'Jugador', log: 'log-player' as const },
    { stages: ctx.enemyStages, name: 'Enemigo', log: 'log-enemy' as const }
  ];
  sides.forEach(side => {
    fieldEffects.forEach(effect => {
      const stages = side.stages.value;
      if (stages[effect] > 0) {
        stages[effect]--;
        if (stages[effect] === 0) {
          const effectLabel = effect === 'reflect' ? 'Reflejo' : effect === 'lightScreen' ? 'Pantalla Luz' : effect;
          ctx.addLog(`¡El efecto de ${effectLabel} del ${side.name} se desvaneció!`, side.log);
        }
      }
    });
  });
}

export async function applyEndTurnEffects(ctx: BattleContext): Promise<void> {
  const active = ctx.activeBattle.value;
  const p = active?.player;
  const e = active?.enemy;
  if (!p || !e || !active || ctx.fsm.currentState.value !== 'ACTIVE_BATTLE') return;

  const { getShowdownWorker } = await import('./showdownWorkerClient.ts');
  if (getShowdownWorker()) {
    return;
  }

  await processPendingSlotEffects(active, ctx);

  await tickStatus(p, ctx, 'player');
  await tickStatus(e, ctx, 'enemy');
  await tickLeechSeed(p, e, ctx);
  await tickLeechSeed(e, p, ctx);
  
  processEndTurnWeatherFade(active.weather, ctx);
  processFieldScreensDecay(ctx);

  await applyEndTurnWeather(p, e, active.weather, ctx);
  
  if (p.hp <= 0) await ctx.handleFaint('player');
  if (ctx.isBattleActive.value && e.hp <= 0) await ctx.handleFaint('enemy');
  
  ctx.persistBattle();
  if (active && !active.over) {
    active.turnCount++;
  }
}
