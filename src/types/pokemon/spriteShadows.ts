/**
 * src/types/pokemon/spriteShadows.ts
 *
 * Domain contracts for sprite shadow calibration and manual overrides.
 */

import type { GenderName } from '@pkmn/types';
import type { GenderId, TrainerAssetView } from '@/types/system/game';
import { TRAINER_ASSET_VIEWS } from '@/types/system/game';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import { isPlayerClassId, type PlayerClassId } from '@/data/player/playerClasses';
import type { NpcSpriteId, NpcArchetypeId } from '@/data/pokemon/npcSpriteCatalog';

export interface SpriteShadowOverride {
  readonly feetX: number;
  readonly feetY: number;
  readonly isFlying: boolean;
  readonly shadowScale?: number;
}

export interface ShadowCalibrationSnapshot {
  readonly feetX: number;
  readonly feetY: number;
  readonly isFlying: boolean;
  readonly shadowScale: number;
}

export interface GlobalShadowConfig {
  readonly widthRatio: number;
  readonly heightRatio: number;
  readonly pixelation: number;
}

export const DEFAULT_SHADOW_WIDTH_RATIO = 1.0;
export const MIN_SHADOW_WIDTH_RATIO = 0.5;
export const MAX_SHADOW_WIDTH_RATIO = 1.5;
export const SHADOW_WIDTH_RATIO_STEP = 0.05;

export const DEFAULT_SHADOW_HEIGHT_RATIO = 0.28;
export const MIN_SHADOW_HEIGHT_RATIO = 0.10;
export const MAX_SHADOW_HEIGHT_RATIO = 0.50;
export const SHADOW_HEIGHT_RATIO_STEP = 0.01;

export const DEFAULT_SHADOW_PIXELATION = 14;
export const MIN_SHADOW_PIXELATION = 6;
export const MAX_SHADOW_PIXELATION = 50;
export const SHADOW_PIXELATION_STEP = 1;

export const SHADOW_SLIDER_FIELDS = ['x', 'y', 'scale'] as const;
export type ShadowSliderField = (typeof SHADOW_SLIDER_FIELDS)[number];

export type SpriteShadowOverridesMap = Record<string, SpriteShadowOverride>; // open-record: Generic key-value data dictionary container

export type PackedFeetTuple = readonly [feetY: number, feetX: number, isFlying?: number, shadowScale?: number];

export const SHADOW_ENTITY_CATEGORIES = ['all', 'pokemon', 'npc', 'trainer'] as const;
export type ShadowEntityCategory = (typeof SHADOW_ENTITY_CATEGORIES)[number];
export type EditorEntityCategory = Exclude<ShadowEntityCategory, 'all'>;

export interface BaseEditorEntity {
  readonly key: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly spriteUrl: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly defaultFeetX: number;
  readonly defaultFeetY: number;
  readonly defaultIsFlying: boolean;
  readonly defaultShadowScale?: number;
}

export const SPRITE_SHADOW_VIEWS = ['front', 'back'] as const;
export type SpriteShadowView = (typeof SPRITE_SHADOW_VIEWS)[number];

export interface PokemonEditorEntity extends BaseEditorEntity {
  readonly category: 'pokemon';
  readonly pokemonSpeciesId: PokemonSpeciesId;
  readonly dexNumber: number;
  readonly gen: number;
  readonly gender: Extract<GenderName, 'M' | 'F'>;
  readonly view: SpriteShadowView;
}

export interface NpcEditorEntity extends BaseEditorEntity {
  readonly category: 'npc';
  readonly npcSpriteId?: NpcSpriteId;
  readonly archetype: NpcArchetypeId;
}

export interface TrainerEditorEntity extends BaseEditorEntity {
  readonly category: 'trainer';
  readonly trainerClass: PlayerClassId;
  readonly gender: GenderId;
  readonly view: SpriteShadowView;
}

export type EditorEntity = PokemonEditorEntity | NpcEditorEntity | TrainerEditorEntity;

const TRAINER_ASSET_VIEWS_SET: ReadonlySet<string> = new Set<string>(TRAINER_ASSET_VIEWS);

export function isTrainerAssetView(value: unknown): value is TrainerAssetView {
  return typeof value === 'string' && TRAINER_ASSET_VIEWS_SET.has(value);
}

/**
 * Parses and validates a trainer sprite key in constant O(1) time.
 * Keys in pokemonFeetDatabase.json follow the pattern: `${classId}_${gender}_${view}`
 * (e.g., 'rocket_m_front', 'cazabichos_h_avatar').
 */
export function parseTrainerSpriteKey(name: string): {
  readonly trainerClass: PlayerClassId;
  readonly gender: GenderId;
  readonly view: SpriteShadowView;
} | null {
  const parts = name.split('_');
  if (parts.length !== 3) return null;

  const [classPart, genderPart, viewPart] = parts;

  if (!isPlayerClassId(classPart)) return null;
  if (genderPart !== 'm' && genderPart !== 'h') return null;
  if (viewPart !== 'front' && viewPart !== 'back') return null;

  return {
    trainerClass: classPart,
    gender: genderPart,
    view: viewPart
  };
}

