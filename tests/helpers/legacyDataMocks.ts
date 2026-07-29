export const LEGENDARIES = new Set([
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  'raikou', 'entei', 'suicune', 'lugia', 'hooh', 'celebi'
]);

export const legacyItemMap: Record<string, string> = {
  pocion: 'potion',
  super_pocion: 'superpotion',
  hiper_pocion: 'hyperpotion',
  pocion_max: 'maxpotion',
  piedra_fuego: 'firestone',
  piedra_agua: 'waterstone',
  piedra_trueno: 'thunderstone',
  piedra_hoja: 'leafstone',
  piedra_luna: 'moonstone',
  piedra_solar: 'sunstone',
  caramelo_vigor: 'vigorcandy',
  repelente: 'repel'
};

export const legacyAbilityMap: Record<string, string> = {
  escape: 'runaway',
  metamorfosis: 'shedskin',
  escudopolvo: 'shielddust',
  polvoescudo: 'shielddust',
  correcaminos: 'runaway',
  obstruir: 'soundproof',
  escurridizo: 'limber',
  puntocura: 'healer',
  chlorophyll: 'chlorophyll',
  overgrow: 'overgrow',
  blaze: 'blaze',
  torrent: 'torrent',
  static: 'static',
  puntotoxico: 'poisonpoint',
  vistalince: 'keeneye',
  focointerno: 'innerfocus',
  nadorapido: 'swiftswim',
  velohumedo: 'waterveil'
};

export const legacyMoveMap: Record<string, string> = {
  cuerpo_pesado: 'heavyslam',
  hiper_colmillo: 'hyperfang',
  patada_salto_alta: 'highjumpkick',
  pajaro_osado: 'bravebird',
  engullir: 'swallow',
  somnifera: 'sleeppowder',
  velocidad_extrema: 'extremespeed',
  mismodestino: 'destinybond',
  pantalla_humo: 'smokescreen',
  super_colmillo: 'superfang',
  huevo_bomba: 'eggbomb',
  hueso_rus: 'bonerush',
  mega_patada: 'megakick',
  mega_puno: 'megapunch',
  pozo_venenoso: 'toxicspikes',
  vampiro: 'hornleech',
  psicocorte: 'psychocut',
  arena: 'sandattack',
  minimizar: 'minimize',
  golpe_karatazo: 'karatechop',
  mov_sismico: 'seismictoss',
  tajo_aereo: 'airslash',
  acidificacion: 'acidarmor',
  recurrente: 'bulletseed',
  tormenta_de_arena: 'sandstorm'
};
