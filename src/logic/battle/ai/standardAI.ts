import { getCombinedEffectiveness } from '../battleEngine.ts'
import type { Pokemon, Move } from '../../../types/pokemon/pokemon.ts'
import type { BattleStages } from '../../../types/battle/battle.ts'
import type { BattleContext } from '../../../types/battle/battleContext.ts'
import type { CombatAI } from './combatAI.ts'
import { calculateDamageRangePure, type PureMove, type PurePokemon } from '../battleMath.ts'
import { getDayCycle } from '../../utils/timeUtils.ts'
import { useBattleStore } from '@/stores/battle/battle'

export class StandardAI implements CombatAI {
  decideMove(enemy: Pokemon, player: Pokemon, playerStages: BattleStages, isWild = false, store?: BattleContext): Move | null {
    const enemyRequest = store?.activeBattle?.value?.enemyRequest ?? useBattleStore().state?.enemyRequest

    console.debug('[DEBUG-AI] StandardAI decideMove called for:', enemy.name, 'isWild:', isWild);

    const validMoves = enemy.moves.filter((m): m is Move => {
      if (!m || m.pp <= 0) return false
      if (enemy.disabledMove && m.id === enemy.disabledMove.id) return false
      
      interface ShowdownMoveRequest {
        id: string;
        disabled?: boolean;
      }
      interface ShowdownActiveRequest {
        moves?: ShowdownMoveRequest[];
      }
      interface ShowdownPlayerRequest {
        active?: ShowdownActiveRequest[];
      }

      const enemyReq = enemyRequest as ShowdownPlayerRequest | undefined;
      if (enemyReq && enemyReq.active?.[0]?.moves) {
        const reqMove = enemyReq.active[0].moves.find((rm: ShowdownMoveRequest) => rm.id === m.id);
        if (!reqMove || reqMove.disabled) return false;
      }
      
      return true
    })

    if (validMoves.length === 0) return null

    if (isWild) {
      return validMoves[Math.floor(Math.random() * validMoves.length)] || null
    }

    let bestMove = validMoves[0]
    let maxScore = -1

    validMoves.forEach((m) => {
      const s = this.scoreMove(m, enemy, player, playerStages, store)
      if (s > maxScore) {
        maxScore = s
        bestMove = m
      }
    })

    return bestMove || null
  }

  scoreMove(move: Move, attacker: Pokemon, defender: Pokemon, defStages: BattleStages, store?: BattleContext): number {
    const effectStr = typeof move.effect === 'string' ? move.effect : ''

    if (move.cat === 'status') {
      let score = 30

      if ((effectStr === 'sleep' || effectStr === 'paralyze') && !defender.status) {
        score = 60
      }

      const statusEffects = ['sleep', 'paralyze', 'poison', 'toxic', 'burn', 'freeze']
      if (statusEffects.includes(effectStr) && defender.status) {
        return 0
      }

      if (effectStr === 'lower_atk' && (defStages.atk || 0) <= -2) score = 5
      if (effectStr === 'lower_def' && (defStages.def || 0) <= -2) score = 5
      if (effectStr === 'lower_spa' && (defStages.spa || 0) <= -2) score = 5
      if (effectStr === 'lower_spd' && (defStages.spd || 0) <= -2) score = 5
      if (effectStr === 'lower_spe' && (defStages.spe || 0) <= -2) score = 5

      if (effectStr.startsWith('stat_up_self')) {
        const hpPct = attacker.hp / attacker.maxHp
        if (hpPct > 0.75) {
          score = 45
        } else {
          score = 20
        }
      }

      if (effectStr === 'heal_50') {
        const hpPct = attacker.hp / attacker.maxHp
        if (hpPct < 0.4) {
          score = 75
        } else if (hpPct > 0.8) {
          score = 5
        } else {
          score = 30
        }
      }

      return score * (0.8 + Math.random() * 0.4)
    }

    let score = move.power || 40

    const weather = store?.activeBattle?.value?.weather || null
    const cycle = getDayCycle()

    const pureMove: PureMove = {
      id: move.id,
      name: move.name,
      type: move.type || 'normal',
      power: move.power || 0,
      cat: move.cat as PureMove['cat'],
      effect: effectStr
    }

    const pureCtx = {
      atkStages: 0,
      defStages: defStages.def || 0,
      weather: weather ? { type: weather.type, turns: weather.turns } : null
    }

    const result = calculateDamageRangePure(
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon,
      pureMove,
      pureCtx,
      cycle
    )

    const eff = result.effectiveness?.value ?? 1
    if (eff === 0) return 0

    if (result.damageRange) {
      const minDmg = result.damageRange.normalMin
      const maxDmg = result.damageRange.normalMax
      const avgDmg = (minDmg + maxDmg) / 2
      const targetHp = defender.hp || 1

      if (minDmg >= targetHp) {
        score = 150
      } else if (maxDmg >= targetHp) {
        const diff = maxDmg - minDmg
        const prob = diff > 0 ? (maxDmg - targetHp) / diff : 0.5
        score = 80 + (70 * prob) 
      } else {
        const dmgPct = avgDmg / targetHp
        score = (move.power || 40) * eff * (1 + dmgPct)
      }
    } else {
      score *= eff
    }

    if (move.type === attacker.type || move.type === attacker.type2) {
      score *= 1.5
    }

    if (move.selfKO) {
      const hpPct = attacker.hp / attacker.maxHp
      const canKO = result.damageRange ? (result.damageRange.normalMax >= defender.hp) : false
      if (hpPct > 0.25 && !canKO) score *= 0.01 
      else if (canKO) score *= 1.5
      else score *= 0.8
    }

    if (move.priority && move.priority !== 0) {
      const pVal = move.priority
      if (pVal > 0) {
        const defHpPct = defender.hp / defender.maxHp
        if (defHpPct < 0.3) {
          const isSlower = (attacker.spe || 0) < (defender.spe || 0)
          score *= isSlower ? 2.0 : 1.5
        } else {
          score *= 1.1
        }
      } else if (pVal < 0) {
        const attHpPct = attacker.hp / attacker.maxHp
        if (attHpPct < 0.25) {
          score *= 0.1
        } else {
          score *= 0.8
        }
      }
    }

    return score * (0.8 + Math.random() * 0.4)
  }

  shouldSwitch(enemy: Pokemon, player: Pokemon, enemyTeam: Pokemon[] | undefined, _store?: BattleContext): boolean {
    if (!enemyTeam || enemyTeam.filter((p) => p.hp > 0).length <= 1) return false

    const playerEff = getCombinedEffectiveness(player.type, enemy)
    const isBadMatch = playerEff >= 2

    if (isBadMatch && Math.random() < 0.3) {
      return true
    }

    return false
  }

  findBestSwitchIndex(enemyTeam: Pokemon[], player: Pokemon, currentEnemyUid: string, _store?: BattleContext): number {
    let bestIdx = -1
    let bestScore = -1
    
    enemyTeam.forEach((p, idx) => {
      if (p.hp <= 0 || p.uid === currentEnemyUid) return

      let score = 0
      const playerEff = getCombinedEffectiveness(player.type, p)
      score += (2 - playerEff) * 50

      const maxOffense = Math.max(...p.moves.map((m) => {
        if (!m) return 0
        const eff = getCombinedEffectiveness(m.type || 'normal', player, p)
        return eff * (m.power || 40)
      }))
      score += maxOffense

      if (score > bestScore) {
        bestScore = score
        bestIdx = idx
      }
    })

    return bestIdx
  }

  async evaluateAndUseItem(ctx: BattleContext, e: Pokemon): Promise<boolean> {
    const battleState = ctx.activeBattle.value;
    if (!battleState || !battleState.enemyInventory) return false;

    const enemyInventory = battleState.enemyInventory;
    const hasItems = Object.values(enemyInventory).some(qty => qty > 0);
    if (!hasItems) return false;

    const npcName = battleState.isGym ? `Líder ${battleState.trainerName || 'de Gimnasio'}` : `${battleState.trainerName || 'Entrenador'}`;

    const triggerFXAndSound = async (onlySound = false) => {
      if (!onlySound) {
        if (ctx.animations?.handleHealRequest) {
          await ctx.animations.handleHealRequest({ side: 'enemy' });
        } else {
          const { gameBus } = await import('../../events/gameBus');
          gameBus.emit('PLAY_HEAL', { side: 'enemy' });
        }
      }
      const audioStore = await import('../../../stores/audio').then(m => m.useAudioStore());
      audioStore.play('heal');
    };

    // 1. Revive Check
    const fainted = (battleState.enemyTeam || []).filter((poke): poke is Pokemon => !!poke && poke.hp <= 0);
    if (fainted.length > 0 && e.hp >= e.maxHp * 0.5) {
      if (enemyInventory['revivemax'] && enemyInventory['revivemax'] > 0) {
        const target = fainted[0]!;
        target.hp = target.maxHp;
        target.status = undefined;
        enemyInventory['revivemax']--;
        if (enemyInventory['revivemax'] <= 0) delete enemyInventory['revivemax'];

        ctx.addLog(`¡${npcName} usó Revivir Máximo en ${target.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${target.name} revivió por completo!`, 'log-info', target, 'enemy');
        await triggerFXAndSound(true);
        return true;
      }
      if (enemyInventory['revive'] && enemyInventory['revive'] > 0) {
        const target = fainted[0]!;
        target.hp = Math.floor(target.maxHp * 0.5);
        target.status = undefined;
        enemyInventory['revive']--;
        if (enemyInventory['revive'] <= 0) delete enemyInventory['revive'];

        ctx.addLog(`¡${npcName} usó Revivir en ${target.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${target.name} revivió con la mitad de su salud!`, 'log-info', target, 'enemy');
        await triggerFXAndSound(true);
        return true;
      }
    }

    // 2. Status Check
    if (e.status) {
      let cured = false;

      if (enemyInventory['fullrestore'] && enemyInventory['fullrestore'] > 0) {
        e.hp = e.maxHp;
        e.status = undefined;
        enemyInventory['fullrestore']--;
        if (enemyInventory['fullrestore'] <= 0) delete enemyInventory['fullrestore'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Restaurar Todo en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó toda su salud y curó sus problemas de estado!`, 'log-info', e, 'enemy');
      } else if (enemyInventory['fullheal'] && enemyInventory['fullheal'] > 0) {
        e.status = undefined;
        enemyInventory['fullheal']--;
        if (enemyInventory['fullheal'] <= 0) delete enemyInventory['fullheal'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Cura Total en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} curó sus problemas de estado!`, 'log-info', e, 'enemy');
      } else if ((e.status === 'psn' || e.status === 'tox') && enemyInventory['antidote'] && enemyInventory['antidote'] > 0) {
        e.status = undefined;
        enemyInventory['antidote']--;
        if (enemyInventory['antidote'] <= 0) delete enemyInventory['antidote'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Antídoto en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡El envenenamiento de ${e.name} fue curado!`, 'log-info', e, 'enemy');
      } else if (e.status === 'brn' && enemyInventory['burnheal'] && enemyInventory['burnheal'] > 0) {
        e.status = undefined;
        enemyInventory['burnheal']--;
        if (enemyInventory['burnheal'] <= 0) delete enemyInventory['burnheal'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Cura Quemadura en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡La quemadura de ${e.name} fue curada!`, 'log-info', e, 'enemy');
      } else if (e.status === 'par' && enemyInventory['paralyzeheal'] && enemyInventory['paralyzeheal'] > 0) {
        e.status = undefined;
        enemyInventory['paralyzeheal']--;
        if (enemyInventory['paralyzeheal'] <= 0) delete enemyInventory['paralyzeheal'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Antiparaliz en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡La parálisis de ${e.name} fue curada!`, 'log-info', e, 'enemy');
      } else if (e.status === 'slp' && enemyInventory['awakening'] && enemyInventory['awakening'] > 0) {
        e.status = undefined;
        enemyInventory['awakening']--;
        if (enemyInventory['awakening'] <= 0) delete enemyInventory['awakening'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Despertar en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} se despertó!`, 'log-info', e, 'enemy');
      } else if (e.status === 'frz' && enemyInventory['iceheal'] && enemyInventory['iceheal'] > 0) {
        e.status = undefined;
        enemyInventory['iceheal']--;
        if (enemyInventory['iceheal'] <= 0) delete enemyInventory['iceheal'];
        cured = true;
        ctx.addLog(`¡${npcName} usó Anticongelante en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} se descongeló!`, 'log-info', e, 'enemy');
      }

      if (cured) {
        await triggerFXAndSound();
        return true;
      }
    }

    // 3. HP Check
    if (e.hp < e.maxHp * 0.25) {
      let healed = 0;

      if (enemyInventory['fullrestore'] && enemyInventory['fullrestore'] > 0) {
        e.hp = e.maxHp;
        e.status = undefined;
        enemyInventory['fullrestore']--;
        if (enemyInventory['fullrestore'] <= 0) delete enemyInventory['fullrestore'];
        ctx.addLog(`¡${npcName} usó Restaurar Todo en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó toda su salud y curó sus problemas de estado!`, 'log-info', e, 'enemy');
        healed = e.maxHp;
      } else if (enemyInventory['maxpotion'] && enemyInventory['maxpotion'] > 0) {
        e.hp = e.maxHp;
        enemyInventory['maxpotion']--;
        if (enemyInventory['maxpotion'] <= 0) delete enemyInventory['maxpotion'];
        ctx.addLog(`¡${npcName} usó Poción Máxima en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó toda su salud!`, 'log-info', e, 'enemy');
        healed = e.maxHp;
      } else if (enemyInventory['hyperpotion'] && enemyInventory['hyperpotion'] > 0) {
        const prev = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + 200);
        enemyInventory['hyperpotion']--;
        if (enemyInventory['hyperpotion'] <= 0) delete enemyInventory['hyperpotion'];
        ctx.addLog(`¡${npcName} usó Hiper Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
        healed = e.hp - prev;
      } else if (enemyInventory['superpotion'] && enemyInventory['superpotion'] > 0) {
        const prev = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + 50);
        enemyInventory['superpotion']--;
        if (enemyInventory['superpotion'] <= 0) delete enemyInventory['superpotion'];
        ctx.addLog(`¡${npcName} usó Súper Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
        healed = e.hp - prev;
      } else if (enemyInventory['potion'] && enemyInventory['potion'] > 0) {
        const prev = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + 20);
        enemyInventory['potion']--;
        if (enemyInventory['potion'] <= 0) delete enemyInventory['potion'];
        ctx.addLog(`¡${npcName} usó Poción en ${e.name}!`, 'log-enemy', 'enemy_trainer');
        ctx.addLog(`¡${e.name} recuperó salud!`, 'log-info', e, 'enemy');
        healed = e.hp - prev;
      }

      if (healed > 0) {
        await triggerFXAndSound();
        return true;
      }
    }

    return false;
  }
}
