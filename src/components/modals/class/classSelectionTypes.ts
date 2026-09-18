/**
 * src/components/modals/class/classSelectionTypes.ts
 *
 * Domain display contracts for trainer class selection.
 */
import { PLAYER_CLASSES, type PlayerClassId } from '@/data/player/playerClasses';

type PlayerClassDefinition = (typeof PLAYER_CLASSES)[keyof typeof PLAYER_CLASSES];

export interface RenderPlayerClass {
  readonly id: PlayerClassId;
  readonly name: string;
  readonly color: string;
  readonly description: string;
  readonly bonuses: readonly string[];
  readonly penalties: readonly string[];
  readonly technicalBonuses: readonly string[];
  readonly technicalPenalties: readonly string[];
  readonly spriteId: PlayerClassDefinition['showdownSpriteId'];
}
