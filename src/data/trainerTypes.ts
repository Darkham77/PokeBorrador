/**
 * Global registry of trainer archetype definitions, sprites, and spawn pools.
 */
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter';

export interface TrainerTypeDefinition {
  readonly name: string;
  readonly sprite: string;
  readonly archetype: NpcArchetype;
  readonly pool: readonly string[];
}

export const TRAINER_TYPES = {
  'caza_bichos': { name: 'Caza Bichos', sprite: 'bugcatcher', archetype: 'caza_bichos' as NpcArchetype, pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
  'ornitologo': { name: 'Ornitólogo', sprite: 'birdkeeper', archetype: 'ornitologo' as NpcArchetype, pool: ['pidgey', 'spearow', 'doduo'] },
  'cientifico': { name: 'Científico', sprite: 'scientist', archetype: 'cientifico' as NpcArchetype, pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
  'luchador': { name: 'Luchador', sprite: 'blackbelt', archetype: 'luchador' as NpcArchetype, pool: ['mankey', 'machop'] },
  'pescador': { name: 'Pescador', sprite: 'fisherman', archetype: 'pescador' as NpcArchetype, pool: ['magikarp', 'goldeen', 'poliwag'] },
  'nadador': { name: 'Nadador', sprite: 'swimmer', archetype: 'nadador' as NpcArchetype, pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
  'domador': { name: 'Domador', sprite: 'tamer-gen3', archetype: 'domador' as NpcArchetype, pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
  'medium': { name: 'Médium', sprite: 'psychic', archetype: 'medium' as NpcArchetype, pool: ['abra', 'drowzee'] },
  'motorista': { name: 'Motorista', sprite: 'biker', archetype: 'motorista' as NpcArchetype, pool: ['koffing', 'grimer', 'rattata'] },
  'montanero': { name: 'Montañero', sprite: 'hiker', archetype: 'montanero' as NpcArchetype, pool: ['geodude', 'sandshrew', 'rhyhorn'] },
  'rocket': { name: 'Recluta Rocket', sprite: 'rocketgrunt', archetype: 'rocket' as NpcArchetype, pool: ['koffing', 'ekans', 'zubat', 'rattata', 'meowth', 'drowzee', 'machop', 'grimer'] },
  'criador': { name: 'Criador Pokémon', sprite: 'pokemonbreeder', archetype: 'criador' as NpcArchetype, pool: ['eevee', 'pidgey', 'oddish', 'bellsprout', 'growlithe', 'poliwag', 'caterpie', 'weedle'] },
  'aristocrata': { name: 'Aristócrata', sprite: 'gentleman', archetype: 'aristocrata' as NpcArchetype, pool: ['meowth', 'growlithe', 'eevee', 'clefairy', 'jigglypuff', 'vulpix'] },
  'ranger': { name: 'Ranger Pokémon', sprite: 'pokemonranger', archetype: 'ranger' as NpcArchetype, pool: ['nidoran_f', 'nidoran_m', 'oddish', 'bellsprout', 'paras', 'tangela', 'exeggcute'] },
  'pokefan': { name: 'Pokéfan', sprite: 'pokefan', archetype: 'pokefan' as NpcArchetype, pool: ['pikachu', 'jigglypuff', 'clefairy', 'meowth', 'eevee', 'psyduck'] },
  'artista': { name: 'Artista', sprite: 'artist', archetype: 'artista' as NpcArchetype, pool: ['bellsprout', 'vulpix', 'oddish', 'jigglypuff', 'clefairy'] },
  'trainers': { name: 'Entrenador Élite', sprite: 'youngster-masters', archetype: 'trainers' as NpcArchetype, pool: ['dragonite', 'charizard', 'alakazam', 'machamp', 'gengar', 'lapras'] },
  'default': { name: 'Joven', sprite: 'youngster', archetype: 'default' as NpcArchetype, pool: ['rattata', 'pidgey', 'spearow', 'ekans', 'sandshrew', 'zubat'] }
} as const;

export type TrainerTypeKey = keyof typeof TRAINER_TYPES;
