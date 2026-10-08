import type { SBCtx } from './showdownBridgeCtx.ts';

function handleCombatResultFeedback(ctx: SBCtx): boolean {
  const { store, type, parts, getPoke } = ctx;
  switch (type) {
    case '-crit': {
      const target = getPoke(parts[2] || '');
      store.addLog(target ? `¡Golpe crítico contra ${target.name}!` : '¡Golpe crítico!', 'log-info', target || '⚡');
      return true;
    }
    case '-supereffective':
      store.addLog('¡Es súper efectivo!', 'log-info', '🔥');
      return true;
    case '-resisted':
      store.addLog('No es muy efectivo...', 'log-info', '💧');
      return true;
    case '-hitcount': {
      const num = parseInt(parts[3] || '0', 10);
      if (num > 0) store.addLog(`¡Golpeó ${num} ${num === 1 ? 'vez' : 'veces'}!`, 'log-info', '🎯');
      return true;
    }
    case '-ohko':
      store.addLog('¡Derrota instantánea!', 'log-info', '💀');
      return true;
    default:
      return false;
  }
}

function handleMissFeedback(ctx: SBCtx): void {
  const attacker = ctx.getPoke(ctx.parts[2] || '');
  if (!attacker) return;
  const style = attacker === ctx.p ? 'log-player' : 'log-enemy';
  ctx.store.addLog(`¡El ataque de ${attacker.name} falló!`, style, attacker);
}

function handleMessageFeedback(ctx: SBCtx): void {
  const msg = ctx.parts[2] || ctx.parts[1] || '';
  if (msg && !msg.startsWith('http')) {
    ctx.store.addLog(msg, 'log-info');
  }
}

function handleTargetEventFeedback(ctx: SBCtx): void {
  const target = ctx.getPoke(ctx.parts[2] || '');
  if (ctx.type === '-notarget') {
    const text = target ? `¡No hay objetivo para el movimiento de ${target.name}!` : '¡No hay objetivo válido!';
    ctx.store.addLog(text, 'log-info', target || undefined);
    return;
  }
  if (!target) return;
  if (ctx.type === '-immune') {
    ctx.store.addLog(`¡No afecta a ${target.name}!`, 'log-info', target);
  } else if (ctx.type === '-block') {
    ctx.store.addLog(`¡${target.name} bloqueó el ataque!`, 'log-info', target);
  }
}

function handleActionFeedback(ctx: SBCtx): boolean {
  switch (ctx.type) {
    case '-notarget':
    case '-immune':
    case '-block':
      handleTargetEventFeedback(ctx);
      return true;
    case '-hint':
    case '-message':
    case 'message':
      handleMessageFeedback(ctx);
      return true;
    case '-miss':
      handleMissFeedback(ctx);
      return true;
    default:
      return false;
  }
}

export function handleFeedbackEvent(ctx: SBCtx): boolean {
  if (ctx.line.includes('[silent]')) return true;
  return handleCombatResultFeedback(ctx) || handleActionFeedback(ctx);
}
