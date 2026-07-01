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
