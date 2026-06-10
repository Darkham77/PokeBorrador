/**
 * Global registry of trainer archetype definitions, sprites, and spawn pools.
 */

export interface TrainerTypeDefinition {
  readonly name: string;
  readonly sprite: string;
  readonly pool: readonly string[];
}

export const TRAINER_TYPES = {
  'caza_bichos': { name: 'Caza Bichos', sprite: 'cazabichos', pool: ['caterpie', 'metapod', 'weedle', 'kakuna', 'paras', 'venonat'] },
  'ornitologo': { name: 'Ornitólogo', sprite: 'birdkeeper', pool: ['pidgey', 'spearow', 'doduo'] },
  'cientifico': { name: 'Científico', sprite: 'scientist', pool: ['magnemite', 'voltorb', 'ditto', 'grimer'] },
  'luchador': { name: 'Luchador', sprite: 'blackbelt', pool: ['mankey', 'machop'] },
  'pescador': { name: 'Pescador', sprite: 'swimmer', pool: ['magikarp', 'goldeen', 'poliwag'] },
  'nadador': { name: 'Nadador', sprite: 'swimmer', pool: ['psyduck', 'tentacool', 'staryu', 'horsea'] },
  'domador': { name: 'Domador', sprite: 'tamer', pool: ['growlithe', 'vulpix', 'ponyta', 'ekans'] },
  'medium': { name: 'Médium', sprite: 'psychic', pool: ['abra', 'drowzee'] },
  'motorista': { name: 'Motorista', sprite: 'biker', pool: ['koffing', 'grimer', 'rattata'] },
  'montanero': { name: 'Montañero', sprite: 'hiker', pool: ['geodude', 'sandshrew', 'rhyhorn'] },
  'rocket': { name: 'Recluta Rocket', sprite: 'rocketgrunt', pool: ['koffing', 'ekans', 'zubat', 'rattata', 'meowth', 'drowzee', 'machop', 'grimer'] },
  'criador': { name: 'Criador Pokémon', sprite: 'pokemonbreeder', pool: ['eevee', 'pidgey', 'oddish', 'bellsprout', 'growlithe', 'poliwag', 'caterpie', 'weedle'] },
  'aristocrata': { name: 'Aristócrata', sprite: 'gentleman', pool: ['meowth', 'growlithe', 'eevee', 'clefairy', 'jigglypuff', 'vulpix'] },
  'ranger': { name: 'Ranger Pokémon', sprite: 'pokemonranger', pool: ['nidoran_f', 'nidoran_m', 'oddish', 'bellsprout', 'paras', 'tangela', 'exeggcute'] },
  'pokefan': { name: 'Pokéfan', sprite: 'pokefan', pool: ['pikachu', 'jigglypuff', 'clefairy', 'meowth', 'eevee', 'psyduck'] },
  'artista': { name: 'Artista', sprite: 'artist', pool: ['bellsprout', 'vulpix', 'oddish', 'jigglypuff', 'clefairy'] },
  'trainers': { name: 'Entrenador Élite', sprite: 'youngster-masters', pool: ['dragonite', 'charizard', 'alakazam', 'machamp', 'gengar', 'lapras'] },
  'default': { name: 'Joven', sprite: 'youngster', pool: ['rattata', 'pidgey', 'spearow', 'ekans', 'sandshrew', 'zubat'] }
} as const;

export type TrainerTypeKey = keyof typeof TRAINER_TYPES;
