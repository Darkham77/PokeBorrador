/**
 * Styles for nickname and avatar customization.
 */
import type { PlayerClassId } from '@/data/player/playerClasses';
import type { FactionId } from '@/types/system/game';

export interface NickStyle {
  readonly id: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly class: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly requiredRole?: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly requiredClass?: PlayerClassId;
  readonly requiredFaction?: FactionId;
}

export interface AvatarStyle {
  readonly id: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly name: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly class: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly requiredRole?: string; // domain-ok: Open dynamic text or non-domain string payload
  readonly requiredClass?: PlayerClassId;
  readonly requiredFaction?: FactionId;
}

export const NICK_STYLES: readonly NickStyle[] = [
    { id: '', name: 'Normal', class: '' },
    { id: 'nt-gold', name: 'Oro Radiante', class: 'nt-gold' },
    { id: 'nt-silver', name: 'Plata Pulida', class: 'nt-silver' },
    { id: 'nt-bronze', name: 'Bronce Antiguo', class: 'nt-bronze' },
    { id: 'nt-royal', name: 'Realeza', class: 'nt-royal' },
    
    // Tipos Elementales (Daño)
    { id: 'nt-type-normal', name: 'Esencia Normal', class: 'nt-type-normal' },
    { id: 'nt-fire', name: 'Fuego Eterno', class: 'nt-fire' },
    { id: 'nt-water', name: 'Marea Azul', class: 'nt-water' },
    { id: 'nt-type-grass', name: 'Fuerza Planta', class: 'nt-type-grass' },
    { id: 'nt-spark', name: 'Voltaje Máximo', class: 'nt-spark' },
    { id: 'nt-type-ice', name: 'Cero Absoluto', class: 'nt-type-ice' },
    { id: 'nt-type-fighting', name: 'Puño Lucha', class: 'nt-type-fighting' },
    { id: 'nt-type-poison', name: 'Ácido Veneno', class: 'nt-type-poison' },
    { id: 'nt-type-ground', name: 'Furia Tierra', class: 'nt-type-ground' },
    { id: 'nt-type-flying', name: 'Vuelo Volador', class: 'nt-type-flying' },
    { id: 'nt-type-psychic', name: 'Poder Psíquico', class: 'nt-type-psychic' },
    { id: 'nt-type-bug', name: 'Aleteo Bicho', class: 'nt-type-bug' },
    { id: 'nt-type-rock', name: 'Bastión Roca', class: 'nt-type-rock' },
    { id: 'nt-ghost', name: 'Alma Fantasma', class: 'nt-ghost' },
    { id: 'nt-type-dragon', name: 'Ira Dragón', class: 'nt-type-dragon' },
    { id: 'nt-dark', name: 'Sombra Siniestra', class: 'nt-dark' },
    { id: 'nt-type-steel', name: 'Placa Acero', class: 'nt-type-steel' },
    { id: 'nt-type-fairy', name: 'Canto Hada', class: 'nt-type-fairy' },

    // Profesiones
    { id: 'nt-class-cazabichos', name: 'Red del Bosque', class: 'nt-class-cazabichos', requiredClass: 'cazabichos' },
    { id: 'nt-class-criador', name: 'Esencia Natural', class: 'nt-class-criador', requiredClass: 'criador' },
    { id: 'nt-class-rocket', name: 'Sombra del Sindicato', class: 'nt-class-rocket', requiredClass: 'rocket' },
    { id: 'nt-class-entrenador', name: 'Medalla de Campeón', class: 'nt-class-entrenador', requiredClass: 'entrenador' },

    // Bandos/Facciones
    { id: 'nt-faction-union', name: 'Escudo de la Unión', class: 'nt-faction-union', requiredFaction: 'union' },
    { id: 'nt-faction-poder', name: 'Voluntad de Poder', class: 'nt-faction-poder', requiredFaction: 'poder' },
    
    // Admin
    { id: 'nt-admin', name: 'Administrador (Admin)', class: 'nt-admin', requiredRole: 'admin' }
];

export const AVATAR_STYLES: readonly AvatarStyle[] = [
    { id: '', name: 'Sin Borde', class: '' },
    
    // Circulares Antiguos / Especiales
    { id: 'av-water', name: 'Aura Celeste', class: 'av-water' },
    { id: 'av-fire', name: 'Fuego Infernal', class: 'av-fire' },
    { id: 'av-ice', name: 'Hielo Ártico', class: 'av-ice' },
    { id: 'av-dragon', name: 'Furia Dragón', class: 'av-dragon' },
    { id: 'av-legend', name: 'Resplandor Legendario', class: 'av-legend' },
    { id: 'av-master', name: 'Maestro Definitivo', class: 'av-master' },
    { id: 'av-ghost', name: 'Neblina Espectral', class: 'av-ghost' },
    
    // Cuadrados Antiguos / Especiales
    { id: 'av-sq-water', name: 'Aura Celeste (Cuadrado)', class: 'av-sq-water' },
    { id: 'av-sq-fire', name: 'Fuego Infernal (Cuadrado)', class: 'av-sq-fire' },
    { id: 'av-sq-ice', name: 'Hielo Ártico (Cuadrado)', class: 'av-sq-ice' },
    { id: 'av-sq-dragon', name: 'Furia Dragón (Cuadrado)', class: 'av-sq-dragon' },
    { id: 'av-sq-legend', name: 'Resplandor Legendario (Cuadrado)', class: 'av-sq-legend' },
    { id: 'av-sq-master', name: 'Maestro Definitivo (Cuadrado)', class: 'av-sq-master' },
    { id: 'av-sq-ghost', name: 'Neblina Espectral (Cuadrado)', class: 'av-sq-ghost' },

    // Marcos Elementales (Circulares)
    { id: 'av-type-normal', name: 'Esencia Normal (Marco)', class: 'av-type-normal' },
    { id: 'av-type-fire', name: 'Fuego Eterno (Marco)', class: 'av-type-fire' },
    { id: 'av-type-water', name: 'Marea Azul (Marco)', class: 'av-type-water' },
    { id: 'av-type-grass', name: 'Fuerza Planta (Marco)', class: 'av-type-grass' },
    { id: 'av-type-electric', name: 'Voltaje Máximo (Marco)', class: 'av-type-electric' },
    { id: 'av-type-ice', name: 'Cero Absoluto (Marco)', class: 'av-type-ice' },
    { id: 'av-type-fighting', name: 'Puño Lucha (Marco)', class: 'av-type-fighting' },
    { id: 'av-type-poison', name: 'Ácido Veneno (Marco)', class: 'av-type-poison' },
    { id: 'av-type-ground', name: 'Furia Tierra (Marco)', class: 'av-type-ground' },
    { id: 'av-type-flying', name: 'Vuelo Volador (Marco)', class: 'av-type-flying' },
    { id: 'av-type-psychic', name: 'Poder Psíquico (Marco)', class: 'av-type-psychic' },
    { id: 'av-type-bug', name: 'Aleteo Bicho (Marco)', class: 'av-type-bug' },
    { id: 'av-type-rock', name: 'Bastión Roca (Marco)', class: 'av-type-rock' },
    { id: 'av-type-ghost', name: 'Alma Fantasma (Marco)', class: 'av-type-ghost' },
    { id: 'av-type-dragon', name: 'Ira Dragón (Marco)', class: 'av-type-dragon' },
    { id: 'av-type-dark', name: 'Sombra Siniestra (Marco)', class: 'av-type-dark' },
    { id: 'av-type-steel', name: 'Placa Acero (Marco)', class: 'av-type-steel' },
    { id: 'av-type-fairy', name: 'Canto Hada (Marco)', class: 'av-type-fairy' },

    // Marcos Elementales (Cuadrados)
    { id: 'av-sq-type-normal', name: 'Esencia Normal (Marco - Cuadrado)', class: 'av-sq-type-normal' },
    { id: 'av-sq-type-fire', name: 'Fuego Eterno (Marco - Cuadrado)', class: 'av-sq-type-fire' },
    { id: 'av-sq-type-water', name: 'Marea Azul (Marco - Cuadrado)', class: 'av-sq-type-water' },
    { id: 'av-sq-type-grass', name: 'Fuerza Planta (Marco - Cuadrado)', class: 'av-sq-type-grass' },
    { id: 'av-sq-type-electric', name: 'Voltaje Máximo (Marco - Cuadrado)', class: 'av-sq-type-electric' },
    { id: 'av-sq-type-ice', name: 'Cero Absoluto (Marco - Cuadrado)', class: 'av-sq-type-ice' },
    { id: 'av-sq-type-fighting', name: 'Puño Lucha (Marco - Cuadrado)', class: 'av-sq-type-fighting' },
    { id: 'av-sq-type-poison', name: 'Ácido Veneno (Marco - Cuadrado)', class: 'av-sq-type-poison' },
    { id: 'av-sq-type-ground', name: 'Furia Tierra (Marco - Cuadrado)', class: 'av-sq-type-ground' },
    { id: 'av-sq-type-flying', name: 'Vuelo Volador (Marco - Cuadrado)', class: 'av-sq-type-flying' },
    { id: 'av-sq-type-psychic', name: 'Poder Psíquico (Marco - Cuadrado)', class: 'av-sq-type-psychic' },
    { id: 'av-sq-type-bug', name: 'Aleteo Bicho (Marco - Cuadrado)', class: 'av-sq-type-bug' },
    { id: 'av-sq-type-rock', name: 'Bastión Roca (Marco - Cuadrado)', class: 'av-sq-type-rock' },
    { id: 'av-sq-type-ghost', name: 'Alma Fantasma (Marco - Cuadrado)', class: 'av-sq-type-ghost' },
    { id: 'av-sq-type-dragon', name: 'Ira Dragón (Marco - Cuadrado)', class: 'av-sq-type-dragon' },
    { id: 'av-sq-type-dark', name: 'Sombra Siniestra (Marco - Cuadrado)', class: 'av-sq-type-dark' },
    { id: 'av-sq-type-steel', name: 'Placa Acero (Marco - Cuadrado)', class: 'av-sq-type-steel' },
    { id: 'av-sq-type-fairy', name: 'Canto Hada (Marco - Cuadrado)', class: 'av-sq-type-fairy' },

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

    // Facciones (Circulares)
    { id: 'av-faction-union', name: 'Aura Unión', class: 'av-faction-union', requiredFaction: 'union' },
    { id: 'av-faction-poder', name: 'Llama Poder', class: 'av-faction-poder', requiredFaction: 'poder' },

    // Facciones (Cuadrados)
    { id: 'av-sq-faction-union', name: 'Aura Unión (Cuadrado)', class: 'av-sq-faction-union', requiredFaction: 'union' },
    { id: 'av-sq-faction-poder', name: 'Llama Poder (Cuadrado)', class: 'av-sq-faction-poder', requiredFaction: 'poder' },

    // Administradores
    { id: 'av-admin', name: 'Aura Suprema (Admin)', class: 'av-admin', requiredRole: 'admin' },
    { id: 'av-sq-admin', name: 'Aura Suprema (Admin - Cuadrado)', class: 'av-sq-admin', requiredRole: 'admin' }
];

export type NickStyleId = (typeof NICK_STYLES)[number]['id'];
export type AvatarStyleId = (typeof AVATAR_STYLES)[number]['id'];

export const NICK_STYLES_BY_ID: Readonly<Record<NickStyleId, NickStyle>> = Object.freeze(
  Object.fromEntries(NICK_STYLES.map(style => [style.id, style])) as Record<NickStyleId, NickStyle>
);

export const AVATAR_STYLES_BY_ID: Readonly<Record<AvatarStyleId, AvatarStyle>> = Object.freeze(
  Object.fromEntries(AVATAR_STYLES.map(style => [style.id, style])) as Record<AvatarStyleId, AvatarStyle>
);

export function isNickStyleId(value: string): value is NickStyleId {
  return value in NICK_STYLES_BY_ID;
}

export function isAvatarStyleId(value: string): value is AvatarStyleId {
  return value in AVATAR_STYLES_BY_ID;
}
