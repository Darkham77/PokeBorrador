export const EVOLUTION_TABLE = {
  // ── Starters ──────────────────────────────────────────────────
  bulbasaur:  { level: 16, to: 'ivysaur' },
  ivysaur:    { level: 32, to: 'venusaur' },
  charmander: { level: 16, to: 'charmeleon' },
  charmeleon: { level: 36, to: 'charizard' },
  squirtle:   { level: 16, to: 'wartortle' },
  wartortle:  { level: 36, to: 'blastoise' },
  // ── Bugs ──────────────────────────────────────────────────────
  caterpie: { level: 7,  to: 'metapod' },
  metapod:  { level: 10, to: 'butterfree' },
  weedle:   { level: 7,  to: 'kakuna' },
  kakuna:   { level: 10, to: 'beedrill' },
  // ── Birds ─────────────────────────────────────────────────────
  pidgey:    { level: 18, to: 'pidgeotto' },
  pidgeotto: { level: 36, to: 'pidgeot' },
  spearow:   { level: 20, to: 'fearow' },
  doduo:     { level: 31, to: 'dodrio' },
  // ── Rodents & common ──────────────────────────────────────────
  rattata: { level: 20, to: 'raticate' },
  meowth:  { level: 28, to: 'persian' },
  // ── Electric ─────────────────────────────────────────────────
  pichu:    { level: 16, to: 'pikachu' },
  magnemite: { level: 30, to: 'magneton' },
  voltorb:   { level: 30, to: 'electrode' },
  elekid:    { level: 30, to: 'electabuzz' },
  // ── Normal / Fairy ────────────────────────────────────────────
  cleffa:     { level: 16, to: 'clefairy' },
  igglybuff:  { level: 16, to: 'jigglypuff' },
  // ── Poison ───────────────────────────────────────────────────
  ekans:     { level: 22, to: 'arbok' },
  nidoran_f: { level: 16, to: 'nidorina' },
  nidoran_m: { level: 16, to: 'nidorino' },
  zubat:     { level: 22, to: 'golbat' },
  oddish:    { level: 21, to: 'gloom' },
  bellsprout:  { level: 21, to: 'weepinbell' },
  tentacool:   { level: 30, to: 'tentacruel' },
  koffing:     { level: 35, to: 'weezing' },
  grimer:      { level: 38, to: 'muk' },
  // ── Ground ───────────────────────────────────────────────────
  sandshrew: { level: 22, to: 'sandslash' },
  diglett:   { level: 26, to: 'dugtrio' },
  geodude:   { level: 25, to: 'graveler' },
  rhyhorn:   { level: 42, to: 'rhydon' },
  cubone:    { level: 28, to: 'marowak' },
  // ── Water ────────────────────────────────────────────────────
  poliwag:    { level: 25, to: 'poliwhirl' },
  psyduck:    { level: 33, to: 'golduck' },
  seel:       { level: 34, to: 'dewgong' },
  krabby:     { level: 28, to: 'kingler' },
  goldeen:    { level: 33, to: 'seaking' },
  horsea:     { level: 32, to: 'seadra' },
  magikarp:   { level: 20, to: 'gyarados' },
  omanyte:    { level: 40, to: 'omastar' },
  kabuto:     { level: 40, to: 'kabutops' },
  slowpoke:   { level: 37, to: 'slowbro' },
  // ── Grass ────────────────────────────────────────────────────
  paras:     { level: 24, to: 'parasect' },
  venonat:   { level: 31, to: 'venomoth' },
  // ── Psychic ──────────────────────────────────────────────────
  abra:    { level: 16, to: 'kadabra' },
  drowzee: { level: 26, to: 'hypno' },
  // ── Fighting ─────────────────────────────────────────────────
  mankey: { level: 28, to: 'primeape' },
  machop:  { level: 28, to: 'machoke' },
  // ── Fire ─────────────────────────────────────────────────────
  magby:    { level: 30, to: 'magmar' },
  smoochum: { level: 30, to: 'jynx' },
  ponyta:    { level: 40, to: 'rapidash' },
  // ── Dragon ───────────────────────────────────────────────────
  dratini:   { level: 30, to: 'dragonair' },
  dragonair: { level: 55, to: 'dragonite' },
  // ── Ghost ────────────────────────────────────────────────────
  gastly:   { level: 25, to: 'haunter' },
};

export const STONE_EVOLUTIONS = {
  pikachu:    { stone: 'Piedra Trueno', to: 'raichu' },
  clefairy:   { stone: 'Piedra Lunar',  to: 'clefable' },
  jigglypuff: { stone: 'Piedra Lunar',  to: 'wigglytuff' },
  nidorina:   { stone: 'Piedra Lunar',  to: 'nidoqueen' },
  nidorino:   { stone: 'Piedra Lunar',  to: 'nidoking' },
  oddish:     { stone: 'Piedra Hoja',   to: 'vileplume' },
  gloom:      { stone: 'Piedra Hoja',   to: 'vileplume' },
  growlithe:  { stone: 'Piedra Fuego',  to: 'arcanine' },
  poliwhirl:  { stone: 'Piedra Agua',   to: 'poliwrath' },
  weepinbell: { stone: 'Piedra Hoja',   to: 'victreebel' },
  shellder:   { stone: 'Piedra Agua',   to: 'cloyster' },
  staryu:     { stone: 'Piedra Agua',   to: 'starmie' },
  eevee_water:   { stone: 'Piedra Agua',   to: 'vaporeon' },
  eevee_thunder: { stone: 'Piedra Trueno', to: 'jolteon' },
  eevee_fire:    { stone: 'Piedra Fuego',  to: 'flareon' },
  exeggcute:  { stone: 'Piedra Hoja',   to: 'exeggutor' },
  vulpix:     { stone: 'Piedra Fuego',  to: 'ninetales' },
};

export const TRADE_EVOLUTIONS = {
  haunter: 'gengar',
  kadabra: 'alakazam',
  machoke: 'machamp',
  graveler: 'golem'
};
