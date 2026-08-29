import type { Pokemon, PokemonStatus } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleSide } from '@/types/battle/battle';

const BAD_POISON_DENOMINATOR = 16;

export function getStatusIcon(status: PokemonStatus): string {
  if (!status) return '';
  const icons: Record<string, string> = {
    brn: '🔥',
    psn: '☠️',
    par: '⚡',
    slp: '💤',
    frz: '🧊',
    tox: '☠️'
  };
  return icons[status] || '';
}

export async function processPrimaryStatusDamage(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info' = 'info'
): Promise<boolean> {
  if (!pokemon.status) return false;

  const addLogFn = ctx.addLog;
  const side = role === 'player' ? 'player' : 'enemy';
  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';

  switch (pokemon.status) {
    case 'brn': {
      const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre quemaduras! (-${dmg} HP)`, logCls, pokemon);
      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side });
      }
      return true;
    }
    case 'psn':
    case 'tox': {
      let dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      if (pokemon.status === 'tox' && pokemon.badPoison) {
        dmg = Math.max(1, Math.floor((pokemon.maxHp * pokemon.badPoison) / BAD_POISON_DENOMINATOR));
        pokemon.badPoison++;
      }
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre el veneno! (-${dmg} HP)`, logCls, pokemon);
      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side });
      }
      return true;
    }
  }

  return false;
}
