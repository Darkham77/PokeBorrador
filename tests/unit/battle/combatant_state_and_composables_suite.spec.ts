// @vitest-environment jsdom
/**
 * tests/unit/battle/combatant_state_and_composables_suite.spec.ts
 * Consolidated domain test suite for combatant state, hooks, and composables:
 * Sprite loop animation speeds & modes, spatial ball coordinates & floating detection,
 * and unified status / weather badge filtering.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import {
  POKEMON_SPRITE_IDLE_FPS,
  POKEMON_SPRITE_VARIATION_FPS
} from '@/logic/constants/animations';
import { useBattleCombatantSpriteLoop } from '@/components/battle/useBattleCombatantSpriteLoop';
import { useBattleCombatantState } from '@/components/battle/useBattleCombatantState';
import { useBattleStore } from '@/stores/battle/battle';
import { useCombatantStatus } from '@/composables/battle/useCombatantStatus';
import { WORLD_CONSTANTS } from '@/logic/combat/spatialCoordinator';
import type { BattleCombatantProps, BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn((type, id) => `mock-url-${type}-${id}`),
  ASSET_TYPES: {
    POKEMON: 'pokemon',
    TRAINER: 'trainer',
    ITEM: 'item'
  }
}));

vi.mock('@/data/system/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/system/constants')>();
  return {
    ...actual,
    ACTIVE_GENERATION: 4,
    MAX_DEX_NUMS: { 3: 386, 4: 493 }
  };
});

// =============================================================================
// 1. Pokemon Sprite Loop Animation Speed & Modes
// =============================================================================
describe('Pokemon Sprite Loop Animation Speed - Unit Tests', () => {
  it('should have 30% accelerated FPS constants for idle and variation modes', () => {
    const BASE_IDLE_FPS = 8;
    const BASE_VARIATION_FPS = 10;
    const ACCELERATION_FACTOR = 1.3;

    expect(POKEMON_SPRITE_IDLE_FPS).toBeCloseTo(BASE_IDLE_FPS * ACCELERATION_FACTOR, 2);
    expect(POKEMON_SPRITE_VARIATION_FPS).toBeCloseTo(BASE_VARIATION_FPS * ACCELERATION_FACTOR, 2);
  });

  it('should initialize useBattleCombatantSpriteLoop with idle mode and cycles target', () => {
    const dummyEl = document.createElement('div');
    const imgIdle = document.createElement('div');
    imgIdle.className = 'pokemon-combat-image pokemon-image-idle';
    dummyEl.appendChild(imgIdle);

    const spriteRef = ref<HTMLElement | null>(dummyEl);
    const isAnimated = ref(true);
    const frames = ref(20);
    const variationMeta = ref<{ frames: number } | null>(null);

    const props: BattleCombatantProps = {
      side: 'player',
      position: { x: 0, y: 0 },
      baseSize: 100,
      pokemon: {
        id: 'p1_0',
        name: 'Pikachu',
        species: 'pikachu',
        hp: 100,
        maxHp: 100,
        level: 50,
        status: null,
        gender: 'M',
        types: ['Electric'],
        isShiny: false
      } as any,
      animState: null
    };

    let hookResult!: ReturnType<typeof useBattleCombatantSpriteLoop>;
    const wrapper = mount(defineComponent({
      setup() {
        hookResult = useBattleCombatantSpriteLoop({
          props,
          spriteRef,
          isAnimated,
          frames,
          variationMeta
        });
        return () => null;
      }
    }));

    const { currentMode, idleCyclesTarget, animateSpritesheet } = hookResult;

    expect(currentMode.value).toBe('idle');
    expect(idleCyclesTarget.value).toBeGreaterThanOrEqual(2);

    // Trigger animation
    animateSpritesheet();
    expect(currentMode.value).toBe('idle');

    wrapper.unmount();
  });
});

// =============================================================================
// 2. useBattleCombatantState Helpers & Spatial Coordinates
// =============================================================================
describe('useBattleCombatantState helpers', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('correctly calculates dynamic ball target coordinates for grounded player pokemon', () => {
    const mockPokemon: Pokemon = {
      id: 'pikachu',
      uid: 'p1_pikachu_001',
      name: 'Pikachu',
      level: 50,
      hp: 100,
      maxHp: 100,
      status: null
    } as any;

    const props: BattleCombatantProps = {
      side: 'player',
      pokemon: mockPokemon,
      position: { x: 100, y: 200 },
      baseSize: WORLD_CONSTANTS.BASE_ENTITY_SIZE_PLAYER,
      groundY: '75%',
      animState: 'releasing',
      hasSeat: true
    };

    const spriteRef = ref<HTMLElement | null>(null);
    const emit = () => {};

    const state = useBattleCombatantState(props, emit, spriteRef);

    expect(state.cacheKey.value).toBe('player-100-200-p1_pikachu_001');
    expect(state.isFloating.value).toBe(false);

    const coords = state.getBallTargetCoords();
    expect(coords.x).toBe(0);
    const expectedY = -WORLD_CONSTANTS.POKEBALL_SIZE_PLAYER * 0.35;
    expect(coords.y).toBeCloseTo(expectedY, 2);
  });

  it('correctly calculates dynamic ball target coordinates with floatOffset for floating species', () => {
    const mockFlyingPokemon: Pokemon = {
      id: 'butterfree',
      uid: 'enemy_butterfree_002',
      name: 'Butterfree',
      level: 50,
      hp: 100,
      maxHp: 100,
      status: null
    } as any;

    const props: BattleCombatantProps = {
      side: 'enemy',
      pokemon: mockFlyingPokemon,
      position: { x: 500, y: 300 },
      baseSize: WORLD_CONSTANTS.BASE_ENTITY_SIZE_ENEMY,
      groundY: '75%',
      animState: 'releasing',
      hasSeat: true
    };

    const spriteRef = ref<HTMLElement | null>(null);
    const emit = () => {};

    const state = useBattleCombatantState(props, emit, spriteRef);

    expect(state.cacheKey.value).toBe('enemy-500-300-enemy_butterfree_002');
    expect(state.isFloating.value).toBe(true);

    const coords = state.getBallTargetCoords();
    expect(coords.x).toBe(0);
    const expectedY = -WORLD_CONSTANTS.POKEBALL_SIZE_ENEMY * 0.35;
    expect(coords.y).toBeCloseTo(expectedY, 2);
  });

  it('isolates cacheKey between seats in 2v2 battles even with identical pokemon species', () => {
    const pokemonA: Pokemon = { id: 'pikachu', uid: 'uid_seat1', name: 'Pikachu' } as any;
    const pokemonB: Pokemon = { id: 'pikachu', uid: 'uid_seat3', name: 'Pikachu' } as any;

    const spriteRef = ref<HTMLElement | null>(null);
    const emit = () => {};

    const stateSeat1 = useBattleCombatantState({
      side: 'player',
      pokemon: pokemonA,
      position: { x: 100, y: 200 },
      baseSize: 300
    } as any, emit, spriteRef);

    const stateSeat3 = useBattleCombatantState({
      side: 'ally',
      pokemon: pokemonB,
      position: { x: 150, y: 250 },
      baseSize: 300
    } as any, emit, spriteRef);

    expect(stateSeat1.cacheKey.value).toBe('player-100-200-uid_seat1');
    expect(stateSeat3.cacheKey.value).toBe('ally-150-250-uid_seat3');
    expect(stateSeat1.cacheKey.value).not.toBe(stateSeat3.cacheKey.value);
  });
});

// =============================================================================
// 3. useCombatantStatus - Weather & Status Display Filtering
// =============================================================================
describe('useCombatantStatus - Weather display filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not show a weather status tag if the weather in Gen 3 is none', () => {
    const battleStore = useBattleStore();
    
    battleStore.state = {
      weather: {
        type: 'none',
        visual: 'fog',
        turns: -1
      },
      player: {
        id: 'charmeleon',
        name: 'Charmeleon',
        hp: 52,
        maxHp: 52,
        type: 'fire',
        moves: [{ name: 'Tackle' }]
      } as unknown as Pokemon,
      enemy: null,
      locationId: 'route1',
      turnCount: 1,
      turn: 'player',
      over: false,
      isGym: false
    } as unknown as BattleState;

    const pokemonRef = () => battleStore.state?.player;
    const isPlayer = () => true;

    const { unifiedStatuses } = useCombatantStatus(pokemonRef, battleStore, isPlayer);

    const weatherStatus = unifiedStatuses.value.find(s => s.id === 'fog' || s.title?.toLowerCase().includes('niebla'));
    expect(weatherStatus).toBeUndefined();
  });

  it('should show a weather status tag if the weather in Gen 4+ is fog', () => {
    const battleStore = useBattleStore();

    battleStore.state = {
      weather: {
        type: 'fog',
        visual: 'fog',
        turns: -1
      },
      player: {
        id: 'charmeleon',
        name: 'Charmeleon',
        hp: 52,
        maxHp: 52,
        type: 'fire',
        moves: [{ name: 'Tackle', accuracy: 100 }]
      } as unknown as Pokemon,
      enemy: null,
      locationId: 'route1',
      turnCount: 1,
      turn: 'player',
      over: false,
      isGym: false
    } as unknown as BattleState;

    const pokemonRef = () => battleStore.state?.player;
    const isPlayer = () => true;

    const { unifiedStatuses } = useCombatantStatus(pokemonRef, battleStore, isPlayer);

    const weatherStatus = unifiedStatuses.value.find(s => 
      s.description?.toLowerCase().includes('niebla') || 
      s.description?.toLowerCase().includes('bruma') ||
      s.title?.toLowerCase().includes('niebla') ||
      s.title?.toLowerCase().includes('bruma')
    );
    expect(weatherStatus).toBeDefined();
  });
});
