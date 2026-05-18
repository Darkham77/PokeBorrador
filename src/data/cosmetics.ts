/**
 * src/data/cosmetics.js
 * Personalization Styles (Nick and Avatar)
 */

export const NICK_STYLES = [
  { id: null, name: 'Normal', class: '' },
  { id: 'nt-gold', name: 'Oro Radiante', class: 'nt-gold' },
  { id: 'nt-silver', name: 'Plata Pulida', class: 'nt-silver' },
  { id: 'nt-bronze', name: 'Bronce Antiguo', class: 'nt-bronze' },
  { id: 'nt-spark', name: 'Relámpago', class: 'nt-spark' },
  { id: 'nt-fire', name: 'Fuego Eterno', class: 'nt-fire' },
  { id: 'nt-water', name: 'Marea Azul', class: 'nt-water' },
  { id: 'nt-dark', name: 'Sombra Abisal', class: 'nt-dark' },
  { id: 'nt-royal', name: 'Realeza', class: 'nt-royal' },
  { id: 'nt-ghost', name: 'Espectral', class: 'nt-ghost' },
  // Profesiones
  { id: 'nt-class-cazabichos', name: 'Red del Bosque', class: 'nt-class-cazabichos', requiredClass: 'cazabichos' },
  { id: 'nt-class-criador', name: 'Esencia Natural', class: 'nt-class-criador', requiredClass: 'criador' },
  { id: 'nt-class-rocket', name: 'Sombra del Sindicato', class: 'nt-class-rocket', requiredClass: 'rocket' },
  { id: 'nt-class-entrenador', name: 'Medalla de Campeón', class: 'nt-class-entrenador', requiredClass: 'entrenador' },
  // Admin
  { id: 'nt-admin', name: 'Administrador (Admin)', class: 'nt-admin', requiredRole: 'admin' }
];

export const AVATAR_STYLES = [
  { id: null, name: 'Sin Borde', class: '' },
  // Circulares
  { id: 'av-water', name: 'Aura Celeste', class: 'av-water' },
  { id: 'av-fire', name: 'Fuego Infernal', class: 'av-fire' },
  { id: 'av-ice', name: 'Hielo Ártico', class: 'av-ice' },
  { id: 'av-dragon', name: 'Furia Dragón', class: 'av-dragon' },
  { id: 'av-legend', name: 'Resplandor Legendario', class: 'av-legend' },
  { id: 'av-master', name: 'Maestro Definitivo', class: 'av-master' },
  { id: 'av-ghost', name: 'Neblina Espectral', class: 'av-ghost' },

  // Cuadrados
  { id: 'av-sq-water', name: 'Aura Celeste (Cuadrado)', class: 'av-sq-water' },
  { id: 'av-sq-fire', name: 'Fuego Infernal (Cuadrado)', class: 'av-sq-fire' },
  { id: 'av-sq-ice', name: 'Hielo Ártico (Cuadrado)', class: 'av-sq-ice' },
  { id: 'av-sq-dragon', name: 'Furia Dragón (Cuadrado)', class: 'av-sq-dragon' },
  { id: 'av-sq-legend', name: 'Resplandor Legendario (Cuadrado)', class: 'av-sq-legend' },
  { id: 'av-sq-master', name: 'Maestro Definitivo (Cuadrado)', class: 'av-sq-master' },
  { id: 'av-sq-ghost', name: 'Neblina Espectral (Cuadrado)', class: 'av-sq-ghost' },

  // Profesiones (Circulares)
  { id: 'av-class-cazabichos', name: 'Red de Cazabichos', class: 'av-class-cazabichos', requiredClass: 'cazabichos' },
  { id: 'av-class-criador', name: 'Armonía Natural', class: 'av-class-criador', requiredClass: 'criador' },
  { id: 'av-class-rocket', name: 'Sombra Criminal', class: 'av-class-rocket', requiredClass: 'rocket' },
  { id: 'av-class-entrenador', name: 'Campeón de Liga', class: 'av-class-entrenador', requiredClass: 'entrenador' },

  // Profesiones (Cuadrados)
  { id: 'av-sq-cazabichos', name: 'Red de Cazabichos (Cuadrado)', class: 'av-sq-cazabichos', requiredClass: 'cazabichos' },
  { id: 'av-sq-criador', name: 'Armonía Natural (Cuadrado)', class: 'av-sq-criador', requiredClass: 'criador' },
  { id: 'av-sq-rocket', name: 'Sombra Criminal (Cuadrado)', class: 'av-sq-rocket', requiredClass: 'rocket' },
  { id: 'av-sq-entrenador', name: 'Campeón de Liga (Cuadrado)', class: 'av-sq-entrenador', requiredClass: 'entrenador' },

  // Administradores
  { id: 'av-admin', name: 'Aura Suprema (Admin)', class: 'av-admin', requiredRole: 'admin' },
  { id: 'av-sq-admin', name: 'Aura Suprema (Admin - Cuadrado)', class: 'av-sq-admin', requiredRole: 'admin' }
];
