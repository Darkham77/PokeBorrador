import { 
  EGG_GROUPS, 
  BABY_MAP, 
  EGG_MOVES_DB 
} from '@/data/breedingData';
import { POKEMON_DB } from '@/data/pokemonDB';

/**
 * Normalizes species ID by removing gender suffixes.
 */
export function breedingBaseId(id) {
  if (!id) return id;
  if (id === 'nidoran_f' || id === 'nidoran_m') return id;
  return id.endsWith('_m') || id.endsWith('_f') ? id.slice(0, -2) : id;
}

/**
 * Gets egg groups for a species.
 */
export function getSpeciesEggGroups(id) {
  const base = breedingBaseId(id);
  return EGG_GROUPS[base] || [];
}

/**
 * Recursively finds the base evolution of a species.
 * (Static map for now, as in legacy)
 */
export function getBaseEvolution(id) {
  const b = {
    ivysaur: 'bulbasaur', venusaur: 'bulbasaur',
    charmeleon: 'charmander', charizard: 'charmander',
    wartortle: 'squirtle', blastoise: 'squirtle',
    metapod: 'caterpie', butterfree: 'caterpie',
    kakuna: 'weedle', beedrill: 'weedle',
    pidgeotto: 'pidgey', pidgeot: 'pidgey',
    raticate: 'rattata', fearow: 'spearow', arbok: 'ekans',
    raichu: 'pikachu', sandslash: 'sandshrew',
    nidorina: 'nidoran_f', nidoqueen: 'nidoran_f',
    nidorino: 'nidoran_m', nidoking: 'nidoran_m',
    clefable: 'clefairy', ninetales: 'vulpix',
    wigglytuff: 'jigglypuff', golbat: 'zubat',
    gloom: 'oddish', vileplume: 'oddish',
    parasect: 'paras', venomoth: 'venonat', dugtrio: 'diglett',
    persian: 'meowth', golduck: 'psyduck', primeape: 'mankey',
    arcanine: 'growlithe', poliwhirl: 'poliwag', poliwrath: 'poliwag',
    kadabra: 'abra', alakazam: 'abra', machoke: 'machop', machamp: 'machop',
    weepinbell: 'bellsprout', victreebel: 'bellsprout', tentacruel: 'tentacool',
    graveler: 'geodude', golem: 'geodude', rapidash: 'ponyta',
    slowbro: 'slowpoke', magneton: 'magnemite', dodrio: 'doduo',
    dewgong: 'seel', muk: 'grimer', cloyster: 'shellder',
    haunter: 'gastly', gengar: 'gastly', hypno: 'drowzee',
    kingler: 'krabby', electrode: 'voltorb', exeggutor: 'exeggcute',
    marowak: 'cubone', weezing: 'koffing', rhydon: 'rhyhorn',
    seadra: 'horsea', seaking: 'goldeen', starmie: 'staryu',
    vaporeon: 'eevee', jolteon: 'eevee', flareon: 'eevee',
    kabutops: 'kabuto', omastar: 'omanyte',
    dragonair: 'dratini', dragonite: 'dratini', gyarados: 'magikarp'
  };
  return b[id] || id;
}

/**
 * Returns the correct egg species for a mother.
 */
export function getBabyOrBase(motherId) {
  const base = getBaseEvolution(motherId);
  const baby = BABY_MAP[base];
  if (baby && baby in EGG_GROUPS) return baby;
  return base;
}

/**
 * Checks compatibility between two Pokémon.
 */
export function checkCompatibility(pA, pB) {
  const idA = breedingBaseId(pA.id);
  const idB = breedingBaseId(pB.id);
  const gA = getSpeciesEggGroups(idA);
  const gB = getSpeciesEggGroups(idB);
  const shared = gA.filter(g => gB.includes(g) && g !== 'ditto');
  const LEGENDARIES = ['mewtwo', 'mew', 'articuno', 'zapdos', 'moltres'];
  
  const hasNoEggs = gA.includes('no-eggs') || gB.includes('no-eggs');
  if (hasNoEggs) return { level: 0, reason: 'No se puede criar', sharedGroups: shared };

  const aDitto = idA === 'ditto', bDitto = idB === 'ditto';
  if (aDitto !== bDitto) {
    const other = aDitto ? pB : pA;
    const eggSpecies = getBabyOrBase(breedingBaseId(other.id));
    return { level: 2, eggSpecies, motherId: breedingBaseId(other.id), reason: 'OK', sharedGroups: shared };
  }

  const genderA = pA.gender || null;
  const genderB = pB.gender || null;
  if (!genderA || !genderB) return { level: 0, reason: 'Sin género', sharedGroups: shared };
  if (LEGENDARIES.includes(idA) || LEGENDARIES.includes(idB)) return { level: 0, reason: 'Legendario', sharedGroups: shared };

  const aFemale = genderA === 'F', bFemale = genderB === 'F';
  const aMale = genderA === 'M', bMale = genderB === 'M';
  if (!((aFemale && bMale) || (bFemale && aMale))) return { level: 0, reason: 'Requiere macho y hembra', sharedGroups: shared };

  if (shared.length === 0) return { level: 0, reason: 'Sin grupo huevo común', sharedGroups: shared };

  const mother = aFemale ? pA : pB;
  const eggSpecies = getBabyOrBase(breedingBaseId(mother.id));
  const level = (idA === idB) ? 3 : 2;
  return { level, eggSpecies, motherId: mother.id, reason: 'OK', sharedGroups: shared };
}

/**
 * Calculates breeding cost based on perfect IVs.
 */
export function calculateBreedingCost(pA, pB) {
  const isPerfect = (v) => v === 30 || v === 31;
  let perfectCount = 0;
  if (pA?.ivs) Object.values(pA.ivs).forEach(v => { if (isPerfect(v)) perfectCount++; });
  if (pB?.ivs) Object.values(pB.ivs).forEach(v => { if (isPerfect(v)) perfectCount++; });
  
  if (perfectCount <= 2) return 2000;
  if (perfectCount <= 5) return 5000;
  if (perfectCount <= 8) return 12000;
  if (perfectCount <= 11) return 25000;
  return 50000;
}

/**
 * Calculates inherited IVs.
 */
export function calculateInheritance(pA, pB, itemA = '', itemB = '', playerClass = '') {
  const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
  const ivs = {}; 
  STATS.forEach(s => ivs[s] = Math.floor(Math.random() * 32));
  
  const powerMap = {
    'Pesa Recia': 'hp', 'Brazal Recio': 'atk', 'Cinto Recio': 'def',
    'Lente Recia': 'spa', 'Banda Recia': 'spd', 'Franja Recia': 'spe'
  };
  
  const forcedA = powerMap[itemA];
  const forcedB = powerMap[itemB];
  
  if (forcedA) ivs[forcedA] = pA.ivs[forcedA];
  if (forcedB) {
    if (forcedB !== forcedA) ivs[forcedB] = pB.ivs[forcedB];
    else ivs[forcedB] = Math.random() < 0.5 ? pA.ivs[forcedB] : pB.ivs[forcedB];
  }
  
  const forcedCount = (forcedA && forcedB && forcedA !== forcedB) ? 2 : ((forcedA || forcedB) ? 1 : 0);
  const baseInheritCount = (playerClass === 'criador') ? 4 : 3;
  let count = Math.max(0, baseInheritCount - forcedCount);
  
  const rem = STATS.filter(s => s !== forcedA && s !== forcedB).sort(() => Math.random() - 0.5).slice(0, count);
  rem.forEach(s => ivs[s] = Math.random() < 0.5 ? pA.ivs[s] : pB.ivs[s]);
  
  return ivs;
}
