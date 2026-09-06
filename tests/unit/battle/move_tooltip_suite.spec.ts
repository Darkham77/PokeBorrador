import { describe, it, expect } from 'vitest';
import {
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance
} from '@/logic/battle/moveTooltipMath';
import { parseStatusEffectInfo } from '@/logic/battle/tooltip/moveTooltipConditions';
import {
  buildKoText,
  calculateAttackerStatDisplay,
  buildTooltipDamageRange,
  buildTooltipSpeedInfo
} from '@/composables/battle/moveTooltipCalculator';
import {
  formatPowerDisplay,
  formatAccuracyValue,
  formatAccuracyDisplay,
  formatStatValueDisplay,
  getArrowForClass,
  getArrowForStage
} from '@/components/battle/moveTooltipStatsGridHelper';
import {
  getTargetCssClass,
  getDirectionCssClass,
  getTargetArrow,
  getDirectionArrow,
  formatStageValue,
  getStageRangeLabel
} from '@/components/battle/moveTooltipStatusHelper';
import type { Move } from '@/types/pokemon/pokemon';
import type { PurePokemon } from '@/logic/battle/battleMath';
import type { SmogonTooltipResult } from '@/logic/battle/smogonAdapter';

describe('Move Tooltip Suite', () => {
  describe('moveTooltipMath & moveTooltipConditions - O(1) Lookups & Modifiers', () => {
    const dummyAttacker: PurePokemon = {
      id: 'charizard',
      name: 'Charizard',
      level: 50,
      type: 'fire',
      type2: 'flying',
      hp: 100,
      maxHp: 100,
      atk: 84,
      def: 78,
      spa: 109,
      spd: 85,
      spe: 100,
      ability: 'blaze',
      heldItem: 'charcoal'
    };

    const dummyDefender: PurePokemon = {
      id: 'venusaur',
      name: 'Venusaur',
      level: 50,
      type: 'grass',
      type2: 'poison',
      hp: 100,
      maxHp: 100,
      atk: 82,
      def: 83,
      spa: 100,
      spd: 100,
      spe: 80,
      ability: 'overgrow',
      heldItem: undefined
    };

    it('should calculate base power with STAB and held item charcoal in O(1)', () => {
      const move: Move = {
        id: 'flamethrower',
        name: 'Lanzallamas',
        type: 'fire',
        cat: 'special',
        power: 90,
        acc: 100,
        pp: 15,
        maxPP: 15
      };

      const res = calculateMovePower(
        move,
        dummyAttacker,
        dummyDefender,
        'clear',
        undefined,
        90
      );

      // 90 * 1.5 (STAB) = 135 * 1.2 (charcoal) = 162
      expect(res.final).toBe(162);
      expect(res.list.some(l => l.label.includes('STAB'))).toBe(true);
      expect(res.list.some(l => l.label.includes('charcoal'))).toBe(true);
    });

    it('should calculate move accuracy with weather modifications in O(1)', () => {
      const move: Move = {
        id: 'thunder',
        name: 'Trueno',
        type: 'electric',
        cat: 'special',
        power: 110,
        acc: 70,
        pp: 10,
        maxPP: 10
      };

      const rainAcc = calculateMoveAccuracy(
        move,
        { type: 'rain', turns: 5 },
        'rain',
        undefined,
        70,
        0,
        0
      );
      expect(rainAcc.final).toBe(100);
    });

    it('should calculate crit chance accurately', () => {
      const crit = calculateCritChance(dummyAttacker, dummyDefender);
      expect(crit.value).toBeDefined();
      expect(crit.class).toBe('neutral');
    });

    it('should parse secondary status effects from moveTooltipConditions', () => {
      const moveWithStatus: Move = {
        id: 'toxic',
        name: 'Tóxico',
        type: 'poison',
        cat: 'status',
        power: 0,
        acc: 90,
        pp: 10,
        maxPP: 10,
        status: 'tox'
      };

      const effectInfo = parseStatusEffectInfo(
        moveWithStatus,
        dummyAttacker,
        dummyDefender,
        null,
        null
      );

      expect(effectInfo).not.toBeNull();
      expect(effectInfo?.isCondition).toBe(true);
      expect(effectInfo?.label).toBe('Envenenamiento Grave');
    });
  });

  describe('Move Tooltip Math Helpers', () => {
    it('should calculate weather ball adaptation correctly', () => {
      const move = { id: 'weatherball', name: 'Weather Ball', type: 'normal', cat: 'special' } as Move;
      const attacker = { id: 'charmander', type: 'fire', maxHp: 100, hp: 100 } as unknown as PurePokemon;
      const res = calculateMovePower(move, attacker, null, 'sun', undefined, 50);
      expect(res.final).toBeGreaterThan(50);
      expect(res.list.some(l => l.label.includes('Weather Ball'))).toBe(true);
    });

    it('should calculate thunder in rain as 100% accuracy', () => {
      const move = { id: 'thunder', name: 'Thunder', type: 'electric' } as Move;
      const res = calculateMoveAccuracy(move, null, 'rain', undefined, 70, 0, 0);
      expect(res.final).toBe(100);
      expect(res.class).toBe('boosted');
    });

    it('should calculate crit rate with scopelens', () => {
      const attacker = { heldItem: 'scopelens' } as unknown as PurePokemon;
      const res = calculateCritChance(attacker, null);
      expect(res.value).toBe('12');
      expect(res.class).toBe('boosted');
    });
  });

  describe('moveTooltipCalculator', () => {
    it('formats KO chance correctly with buildKoText', () => {
      expect(buildKoText({ n: 1, chance: 1 })).toBe('OHKO garantizado');
      expect(buildKoText({ n: 2, chance: 0.8 })).toBe('2HKO posible (80%)');
      expect(buildKoText({ n: 0, chance: 0 })).toBe('');
    });

    it('calculates attacker stat display for physical and special moves', () => {
      const dummyAttacker = {
        atk: 100,
        spa: 80,
        level: 50,
        name: 'Charizard',
        types: ['Fire', 'Flying'],
      } as unknown as PurePokemon;

      const stat = calculateAttackerStatDisplay(
        dummyAttacker,
        null,
        true,
        false,
        { atk: 2 },
        null,
        'day',
        false
      );

      expect(stat).not.toBeNull();
      expect(stat?.name).toBe('ATAQUE');
      expect(stat?.base).toBe(100);
      expect(stat?.stage).toBe(2);
      expect(stat?.class).toBe('boosted');
    });

    it('builds tooltip damage range structure accurately', () => {
      const mockSmogonResult: SmogonTooltipResult = {
        minDmg: 50,
        maxDmg: 70,
        minPercent: 40.2,
        maxPercent: 55.8,
        critMinDmg: 75,
        critMaxDmg: 105,
        critMinPercent: 60.3,
        critMaxPercent: 83.7,
        koChance: { n: 2, chance: 0.9 },
        outspeeds: true,
        attackerSpeed: 120,
        defenderSpeed: 100,
        smogonDesc: '50-70 (40.2 - 55.8%) -- 2HKO',
        recovery: { min: 0, max: 0, text: '' },
        recoil: { min: 0, max: 0, text: '' },
        hasAssaultVest: false,
        hasEviolite: false,
        attackerWeight: 50,
        defenderWeight: 50,
        overrideOffensiveStat: undefined,
        overrideDefensiveStat: undefined,
        ignoreDefensive: false,
        breaksProtect: false,
        hasCrashDamage: false,
        terrainReductions: [],
        isLeechSeedActive: false,
        isForesightActive: false,
        attackerTera: undefined,
        defenderTera: undefined,
      };

      const range = buildTooltipDamageRange(mockSmogonResult);
      expect(range).not.toBeNull();
      expect(range?.normalMin).toBe(50);
      expect(range?.normalMax).toBe(70);
      expect(range?.normalPctMin).toBe(40);
      expect(range?.normalPctMax).toBe(56);
      expect(range?.koChanceText).toBe('2HKO posible (90%)');

      const speedInfo = buildTooltipSpeedInfo(mockSmogonResult, 1);
      expect(speedInfo?.priority).toBe(1);
      expect(speedInfo?.outspeeds).toBe(true);
    });
  });

  describe('moveTooltipStatsGridHelper', () => {
    it('formats power display correctly', () => {
      expect(formatPowerDisplay(80, 80)).toBe('80');
      expect(formatPowerDisplay('-', '-')).toBe('-');
      expect(formatPowerDisplay(80, 120)).toBe('80 ➔ 120');
    });

    it('formats accuracy value and display correctly', () => {
      expect(formatAccuracyValue(1000)).toBe('♾️');
      expect(formatAccuracyValue(85)).toBe('85%');
      expect(formatAccuracyDisplay(100, 100)).toBe('100%');
      expect(formatAccuracyDisplay(85, 100)).toBe('85% ➔ 100%');
      expect(formatAccuracyDisplay(1000, 1000)).toBe('♾️');
    });

    it('formats stat value display correctly', () => {
      expect(formatStatValueDisplay(150, 150)).toBe('150');
      expect(formatStatValueDisplay(150, 225)).toBe('150 ➔ 225');
    });

    it('resolves arrows for CSS classes', () => {
      expect(getArrowForClass('boosted')).toEqual({ show: true, isUp: true });
      expect(getArrowForClass('penalized')).toEqual({ show: true, isUp: false });
      expect(getArrowForClass('normal')).toEqual({ show: false, isUp: false });
      expect(getArrowForClass(undefined)).toEqual({ show: false, isUp: false });
    });

    it('resolves arrows for stages', () => {
      expect(getArrowForStage(2)).toEqual({ show: true, isUp: true });
      expect(getArrowForStage(-1)).toEqual({ show: true, isUp: false });
      expect(getArrowForStage(0)).toEqual({ show: false, isUp: false });
    });
  });

  describe('moveTooltipStatusHelper', () => {
    it('correctly maps target CSS class and arrow for self vs opponent', () => {
      expect(getTargetCssClass(true)).toBe('boosted');
      expect(getTargetCssClass(false)).toBe('penalized');
      expect(getTargetArrow(true)).toBe('▲');
      expect(getTargetArrow(false)).toBe('▼');
    });

    it('correctly maps direction CSS class and arrow for up vs down', () => {
      expect(getDirectionCssClass('up')).toBe('boosted');
      expect(getDirectionCssClass('down')).toBe('penalized');
      expect(getDirectionCssClass(undefined)).toBe('penalized');
      expect(getDirectionArrow('up')).toBe('▲');
      expect(getDirectionArrow('down')).toBe('▼');
      expect(getDirectionArrow(undefined)).toBe('▼');
    });

    it('formats positive and negative stages correctly', () => {
      expect(formatStageValue(2)).toBe('+2');
      expect(formatStageValue(0)).toBe('+0');
      expect(formatStageValue(-1)).toBe('-1');
      expect(formatStageValue(undefined)).toBe('+0');
    });

    it('formats stage range label correctly', () => {
      expect(getStageRangeLabel(0, 1)).toBe('+0 ➔ +1');
      expect(getStageRangeLabel(1, -2)).toBe('+1 ➔ -2');
    });
  });
});
