import { gsapSleep } from '@/logic/utils/gsapHelpers';
import { processExpGain, processEvGain } from '../battleRewards.ts';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move, PokemonStatKey } from '@/types/pokemon/pokemon';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';

const POKERUS_SPREAD_PROBABILITY = 0.33;

const STAT_NAMES_ES: Record<PokemonStatKey, string> = {
  hp: 'PS',
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Esp.',
  spd: 'Def. Esp.',
  spe: 'Velocidad',
};

export interface ExpEvDistributorParams {
  combatants: Pokemon[];
  participantsSet: Set<string>;
  classMult: number;
  totalExpMult: number;
  totalExpMultWithoutEvent: number;
  eventExpMultiplier: number;
}

export async function processCombatantExpAndEvs(
  ctx: BattleContext,
  params: ExpEvDistributorParams
) {
  const active = ctx.activeBattle.value;
  if (!active) return;

  const { combatants, participantsSet, classMult, totalExpMult, totalExpMultWithoutEvent, eventExpMultiplier } = params;
  const expGainedMap = new Map<string, number>();
  const eventExpExtraMap = new Map<string, number>();
  const levelUpMap = new Map<string, { levelsGained: number; moves: Move[] }>();

  const { calculateBaseExp } = await import('../battleRewards.ts');

  for (const e of combatants) {
    if (active.isCapture) {
      await ctx.eventStore.submitCompetitionEntry('hourly_competition', e.uid);
    }

    const baseExp = calculateBaseExp(e);
    for (const p of ctx.gs.state.team) {
      // Canonical Rule: A newly captured Pokemon never gains Exp/EVs from its own capture
      if (active.isCapture && p.uid === e.uid) continue;

      const reward = processExpGain(p, baseExp, participantsSet, {
        isActive: p.uid === active.player?.uid,
        classMult,
        totalExpMult,
        participantsSet
      });
      if (!reward) continue;

      expGainedMap.set(p.uid, (expGainedMap.get(p.uid) || 0) + reward.gained);

      if (eventExpMultiplier > 1) {
        const share = p.uid === active.player?.uid ? 1 : 0.5;
        const gainedWithoutEvent = Math.floor(baseExp * share * classMult * totalExpMultWithoutEvent);
        const eventExtra = Math.max(0, reward.gained - gainedWithoutEvent);
        if (eventExtra > 0) {
          eventExpExtraMap.set(p.uid, (eventExpExtraMap.get(p.uid) || 0) + eventExtra);
        }
      }

      if (reward.levelUp) {
        if (!levelUpMap.has(p.uid)) {
          levelUpMap.set(p.uid, { levelsGained: 0, moves: [] });
        }
        const lvlData = levelUpMap.get(p.uid)!;
        lvlData.levelsGained += reward.levelsGained;

        const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
        for (let i = 0; i < reward.levelsGained; i++) {
          const pendingMoves = levelUpPokemon(p);
          if (pendingMoves) {
            lvlData.moves.push(...pendingMoves);
          }
        }

        const { calculateFriendshipLevelUpDelta, applyFriendshipDelta } = await import('@/logic/pokemon/friendshipLogic');
        const hasSootheBell = p.heldItem === 'soothebell';
        const friendshipGain = calculateFriendshipLevelUpDelta(p.friendship ?? 50, hasSootheBell) * reward.levelsGained;
        applyFriendshipDelta(p, friendshipGain, ctx.addLog);
      }
    }

    // Process EV gains
    for (const p of ctx.gs.state.team) {
      // Canonical Rule: A newly captured Pokemon never gains Exp/EVs from its own capture
      if (active.isCapture && p.uid === e.uid) continue;

      const evReward = processEvGain(p, e, participantsSet);
      if (evReward && evReward.totalGained > 0) {
        recalcPokemonStats(p);
        const statGainParts = Object.entries(evReward.statGains)
          .filter(([, v]) => (v || 0) > 0)
          .map(([k, v]) => `+${v} ${STAT_NAMES_ES[k as PokemonStatKey] || k.toUpperCase()}`)
          .join(', ');
        ctx.addLog(`¡${p.nickname || p.name} ganó ${statGainParts} (EVs)!`, 'log-info', p);
      }
    }
  }

  // Process Pokérus transmission
  spreadPokerus(ctx);

  // Print consolidated EXP and trigger Level Ups
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;

  for (const p of ctx.gs.state.team) {
    const gained = expGainedMap.get(p.uid) || 0;
    if (gained > 0) {
      const eventExtra = eventExpExtraMap.get(p.uid) || 0;
      const eventExtraText = eventExtra > 0 ? ` (+${eventExtra} EXP evento)` : '';
      ctx.addLog(`${p.name} ganó ${gained} EXP${eventExtraText}.`, 'log-player', p);
    }

    const lvlData = levelUpMap.get(p.uid);
    if (lvlData) {
      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING);
      ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p);

      if (lvlData.moves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE);
        p.pendingMoves = lvlData.moves;

        const uiStore = useUIStore();
        uiStore.addToLearnQueue(lvlData.moves.map(m => ({ pokemon: p, move: m })));
      }

      // Check level-up evolution
      if (p.heldItem === 'everstone') {
        ctx.addLog(`${p.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', p);
      } else {
        const { checkLevelUpEvolution } = await import('@/logic/evolution/evolutionLogic.ts');
        const targetId = checkLevelUpEvolution(p);
        if (targetId) {
          const uiStore = useUIStore();
          uiStore.startEvolution(p, targetId, '');
          const modalStore = useModalStore();
          while (modalStore.isOpen('Evolution')) {
            await gsapSleep(100);
          }
        }
      }
    }
  }
}

function spreadPokerus(ctx: BattleContext) {
  const infectedMonIndices: number[] = [];
  ctx.gs.state.team.forEach((p, idx) => {
    if (p.pokerus === 'infected') {
      infectedMonIndices.push(idx);
    }
  });

  if (infectedMonIndices.length === 0) return;

  const newlyInfectedNames: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const idx of infectedMonIndices) {
    if (Math.random() < POKERUS_SPREAD_PROBABILITY) {
      const leftIdx = idx - 1;
      const leftMon = leftIdx >= 0 ? ctx.gs.state.team[leftIdx] : undefined;
      if (leftMon && (!leftMon.pokerus || leftMon.pokerus === 'uninfected')) {
        leftMon.pokerus = 'infected';
        newlyInfectedNames.push(leftMon.nickname || leftMon.name);
      }
      const rightIdx = idx + 1;
      const rightMon = rightIdx < ctx.gs.state.team.length ? ctx.gs.state.team[rightIdx] : undefined;
      if (rightMon && (!rightMon.pokerus || rightMon.pokerus === 'uninfected')) {
        rightMon.pokerus = 'infected';
        newlyInfectedNames.push(rightMon.nickname || rightMon.name);
      }
    }
  }
  if (newlyInfectedNames.length > 0) {
    ctx.addLog(`¡El Pokérus se ha contagiado a ${newlyInfectedNames.join(', ')}!`, 'log-success', 'player');
  }
}
