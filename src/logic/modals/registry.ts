import { BATTLE_MODAL_REGISTRY } from './registries/battleModals.ts';
import { POKEMON_MODAL_REGISTRY } from './registries/pokemonModals.ts';
import { SHOP_MODAL_REGISTRY } from './registries/shopModals.ts';
import { SYSTEM_MODAL_REGISTRY } from './registries/systemModals.ts';

/**
 * Modal Registry
 * Maps modal names to their lazy-loaded components, decomposed into domain registries.
 */
export const MODAL_REGISTRY = {
  ...BATTLE_MODAL_REGISTRY,
  ...POKEMON_MODAL_REGISTRY,
  ...SHOP_MODAL_REGISTRY,
  ...SYSTEM_MODAL_REGISTRY
};

export type ModalRegistryKey = keyof typeof MODAL_REGISTRY;
