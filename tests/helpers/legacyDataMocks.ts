export const LEGENDARIES = new Set([
  'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
  'raikou', 'entei', 'suicune', 'lugia', 'ho_oh', 'ho-oh', 'celebi'
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
  caramelo_vigor: 'vigor_candy',
  repelente: 'repel'
};

export const legacyAbilityMap: Record<string, string> = {
  escape: 'Fuga',
  metamorfosis: 'Mudar',
  escudopolvo: 'Polvo escudo',
  polvoescudo: 'Polvo escudo',
  correcaminos: 'Fuga',
  obstruir: 'Insonorizar',
  escurridizo: 'Flexibilidad',
  puntocura: 'Cura Natural',
  chlorophyll: 'Clorofila',
  overgrow: 'Espesura',
  blaze: 'Mar llamas',
  torrent: 'Torrente',
  static: 'Electricidad estática',
  puntotoxico: 'Punto tóxico',
  vistalince: 'Vista lince',
  focointerno: 'Foco interno',
  nadorapido: 'Nado rápido',
  velohumedo: 'Velo húmedo'
};

export const legacyMoveMap: Record<string, string> = {
  cuerpo_pesado: 'heavy_slam',
  hiper_colmillo: 'hyper_fang',
  patada_salto_alta: 'high_jump_kick',
  pajaro_osado: 'brave_bird',
  engullir: 'swallow',
  somnifera: 'sleep_powder',
  velocidad_extrema: 'extreme_speed',
  mismodestino: 'destiny_bond',
  pantalla_humo: 'smokescreen',
  super_colmillo: 'super_fang',
  huevo_bomba: 'egg_bomb',
  hueso_rus: 'bone_rush',
  mega_patada: 'mega_kick',
  mega_puno: 'mega_punch',
  pozo_venenoso: 'toxic_spikes',
  vampiro: 'horn_leech',
  psicocorte: 'psycho_cut',
  arena: 'sand_attack',
  minimizar: 'minimize',
  golpe_karatazo: 'karate_chop',
  mov_sismico: 'seismic_toss',
  tajo_aereo: 'air_slash',
  acidificacion: 'acid_armor',
  recurrente: 'bullet_seed',
  tormenta_de_arena: 'sandstorm'
};
