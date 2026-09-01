/**
 * src/logic/player/classMissionsData.ts
 *
 * Detailed rules, mechanics, and multi-reward metadata for Class Missions (Deployments).
 */

import type { ItemId } from '@/data/inventory/itemIds';
import { type MissionId, isMissionId } from '@/data/player/playerClasses';

export interface DetailedMissionReward {
  readonly id?: ItemId;
  readonly isItem?: boolean;
  readonly icon?: string;
  readonly label: string;
  readonly val: string;
  readonly tooltipTitle: string;
  readonly tooltipDesc: string;
}

export interface ClassMissionDetails {
  readonly dialogue: string;
  readonly rulesText: string;
  readonly rewards: readonly DetailedMissionReward[];
}

export const CLASS_MISSIONS_METADATA: Readonly<Record<string, Readonly<Record<MissionId, ClassMissionDetails>>>> = {
  rocket: {
    mission_6h: {
      dialogue: 'Extorsión local a comerciantes y patrullaje de territorio bajo control Rocket.',
      rulesText: 'Requiere sacrificar 1 Pokémon tipo VENENO de tu Equipo o Caja. El Pokémon es vendido en el mercado negro (sus objetos equipados se devuelven automáticamente a tu mochila).',
      rewards: [
        {
          icon: '₽',
          label: 'Dinero Base',
          val: '₽15.000 - ₽35.000',
          tooltipTitle: 'Pago en Poké-Pesos (₽)',
          tooltipDesc: 'Dinero en efectivo directo transferido a tu cuenta según el nivel y rareza del Pokémon entregado.'
        },
        {
          id: 'nugget',
          isItem: true,
          label: 'Botín Ilícito',
          val: 'Pepitas de Oro',
          tooltipTitle: 'Pepita (Nugget)',
          tooltipDesc: 'Pepita de oro puro sustraída durante la extorsión. Se vende por un alto valor en cualquier tienda.'
        },
        {
          icon: '🚀',
          label: 'Rango Rocket',
          val: '+50 a +150 EXP',
          tooltipTitle: 'Reputación de Sindicato',
          tooltipDesc: 'Puntos de experiencia de clase para ascender en la jerarquía del Equipo Rocket.'
        }
      ]
    },
    mission_12h: {
      dialogue: 'Exportación de especímenes incautados al mercado negro para obtener altos dividendos.',
      rulesText: 'Tráfico internacional de especímenes. Requiere enviar 1 Pokémon tipo VENENO para compradores de élite en el mercado negro. Los objetos equipados regresan a tu inventario.',
      rewards: [
        {
          icon: '₽',
          label: 'Alto Dividendo',
          val: '₽40.000 - ₽90.000',
          tooltipTitle: 'Dividendo Clandestino',
          tooltipDesc: 'Ganancia sustancial en efectivo obtenida por la venta de especímenes exóticos.'
        },
        {
          id: 'bignugget',
          isItem: true,
          label: 'Maxi Pepita',
          val: 'Maxi Pepitas / Tesoros',
          tooltipTitle: 'Maxi Pepita (Big Nugget)',
          tooltipDesc: 'Enorme pepita de oro de gran pureza con extraordinario valor comercial.'
        },
        {
          icon: '🚀',
          label: 'Rango Capitán',
          val: '+250 EXP',
          tooltipTitle: 'Reputación de Sindicato',
          tooltipDesc: 'Progreso de clase necesario para desbloquear misiones avanzadas de sabotaje.'
        }
      ]
    },
    mission_24h: {
      dialogue: 'Infiltración en las instalaciones de Silph Co. para sustraer prototipos de tecnología secreta.',
      rulesText: 'Operación clandestina de máximo riesgo. Requiere 1 Pokémon tipo VENENO como distracción definitiva. Otorga prototipos tecnológicos de grado militar y sumas millonarias.',
      rewards: [
        {
          icon: '₽',
          label: 'Fortuna Silph Co.',
          val: '₽100.000 - ₽250.000',
          tooltipTitle: 'Bóveda de Silph Co.',
          tooltipDesc: 'Fortuna masiva sustraída directamente de las arcas financieras de Silph Co.'
        },
        {
          id: 'masterball',
          isItem: true,
          label: 'Prototipo Secreto',
          val: 'Master Ball / Cápsulas',
          tooltipTitle: 'Master Ball (Prototipo Silph)',
          tooltipDesc: 'La Poké Ball definitiva que captura cualquier Pokémon salvaje sin fallar.'
        },
        {
          icon: '🚀',
          label: 'Rango Ejecutivo',
          val: '+600 EXP',
          tooltipTitle: 'Reputación de Sindicato',
          tooltipDesc: 'Máxima reputación para consagrarte como Ejecutivo de confianza de Giovanni.'
        }
      ]
    }
  },
  cazabichos: {
    mission_6h: {
      dialogue: 'Recolecta néctar y feromonas en el bosque para atraer especímenes comunes.',
      rulesText: 'Expedición ecológica sin sacrificar Pokémon. Cuesta ₽5.000 de suministros de campo. Atrae Pokémon Bicho salvajes con genética asegurada.',
      rewards: [
        {
          icon: '🐛',
          label: 'Especies Bicho',
          val: 'Caterpie, Weedle, Paras',
          tooltipTitle: 'Avistamiento de Bicho',
          tooltipDesc: 'Garantiza el descubrimiento de ejemplares tipo Bicho con un suelo mínimo de IVs asegurado.'
        },
        {
          id: 'netball',
          isItem: true,
          label: 'Malla Ball',
          val: 'Malla Balls x3',
          tooltipTitle: 'Malla Ball (Net Ball)',
          tooltipDesc: 'Poké Ball especializada con alta efectividad para atrapar Pokémon Bicho y Agua.'
        },
        {
          icon: '🦗',
          label: 'Rango Naturalista',
          val: '+50 EXP',
          tooltipTitle: 'Experiencia Cazabichos',
          tooltipDesc: 'Progreso en conocimientos de entomología y técnicas de rastreo silvestre.'
        }
      ]
    },
    mission_12h: {
      dialogue: 'Captura especímenes raros y cataloga la población de coleópteros de la zona.',
      rulesText: 'Rastreo profundo en reservas naturales. Cuesta ₽10.000 de suministros. Otorga un multiplicador de x4 a la probabilidad de variantes Shiny.',
      rewards: [
        {
          icon: '✨',
          label: 'Bicho Raro (x4 Shiny)',
          val: 'Scyther / Pinsir',
          tooltipTitle: 'Coleópteros Raros',
          tooltipDesc: 'Alta probabilidad de encontrar ejemplares raros con x4 de probabilidad Shiny y 10 IVs garantizados.'
        },
        {
          id: 'silverpowder',
          isItem: true,
          label: 'Polvo Plateado',
          val: 'Silver Powder / Gemas',
          tooltipTitle: 'Polvo Plateado (Silver Powder)',
          tooltipDesc: 'Objeto potenciador que aumenta la potencia de todos los ataques de tipo Bicho.'
        },
        {
          icon: '🦗',
          label: 'Rango Entomólogo',
          val: '+250 EXP',
          tooltipTitle: 'Experiencia Cazabichos',
          tooltipDesc: 'Progreso de clase para desbloquear expediciones a selvas vírgenes.'
        }
      ]
    },
    mission_24h: {
      dialogue: 'Expedición profunda en busca de especímenes exóticos con IVs genéticos excepcionales.',
      rulesText: 'Safari de expedición maestra. Cuesta ₽20.000 de suministros. Activa la Red Maestra (20% de probabilidad de capturar un segundo ejemplar idéntico de regalo).',
      rewards: [
        {
          icon: '👑',
          label: 'Bicho Exótico (2x1)',
          val: 'Heracross / Scizor',
          tooltipTitle: 'Ejemplar Alfa Bicho',
          tooltipDesc: 'Pokémon con genética superior (mínimo 15 IVs en cada estadística) y oportunidad de 2x1.'
        },
        {
          id: 'focussash',
          isItem: true,
          label: 'Banda Focus',
          val: 'Banda Focus / Equipo',
          tooltipTitle: 'Banda Focus (Focus Sash)',
          tooltipDesc: 'Objeto competitivo que permite resistir cualquier golpe fulminante con 1 PS.'
        },
        {
          icon: '🦗',
          label: 'Maestro Trampero',
          val: '+600 EXP',
          tooltipTitle: 'Experiencia Cazabichos',
          tooltipDesc: 'Rango máximo de maestría en la naturaleza y captura de artrópodos.'
        }
      ]
    }
  },
  entrenador: {
    mission_6h: {
      dialogue: 'Rutina de calentamiento y combates rápidos en el gimnasio local para afilar reflejos.',
      rulesText: 'Envía 1 Pokémon de tu equipo o caja al gimnasio de entrenamiento. El Pokémon regresa intacto a tu caja con experiencia masiva y Battle Coins.',
      rewards: [
        {
          icon: '📈',
          label: 'EXP de Combate',
          val: '+25.000 a +60.000 EXP',
          tooltipTitle: 'Experiencia Directa',
          tooltipDesc: 'Experiencia masiva aplicada al Pokémon enviado calculada según su nivel actual.'
        },
        {
          icon: '🪙',
          label: 'Battle Coins',
          val: '+50 BC',
          tooltipTitle: 'Battle Coins (BC)',
          tooltipDesc: 'Monedas de batalla oficiales para la tienda del gimnasio y torneos.'
        },
        {
          icon: '🏅',
          label: 'Reputación de Liga',
          val: '+50 EXP',
          tooltipTitle: 'Experiencia de Entrenador',
          tooltipDesc: 'Puntos para ascender de Rango Novato a Veterano en la Liga Pokémon.'
        }
      ]
    },
    mission_12h: {
      dialogue: 'Sesión intensa en gimnasio de alto rendimiento para potenciar la experiencia de combate.',
      rulesText: 'Entrenamiento táctico intensivo con líderes y sparrings oficiales. Otorga doble bloque de experiencia y objetos de entrenamiento acelerado.',
      rewards: [
        {
          icon: '📈',
          label: 'EXP Avanzada',
          val: '+60.000 a +130.000 EXP',
          tooltipTitle: 'Experiencia de Alto Rendimiento',
          tooltipDesc: 'Permite subir múltiples niveles en una sola sesión de entrenamiento intensivo.'
        },
        {
          id: 'rarecandy',
          isItem: true,
          label: 'Caramelo Raro',
          val: 'Rare Candy + 150 BC',
          tooltipTitle: 'Caramelo Raro (Rare Candy)',
          tooltipDesc: 'Delicioso caramelo que aumenta al instante en 1 nivel al Pokémon que lo consuma.'
        },
        {
          icon: '🏅',
          label: 'Rango Veterano',
          val: '+250 EXP',
          tooltipTitle: 'Experiencia de Entrenador',
          tooltipDesc: 'Progreso de reputación para desbloquear campamentos de nivel profesional.'
        }
      ]
    },
    mission_24h: {
      dialogue: 'Maratón de duelos contra líderes veteranos y optimización táctica del equipo a nivel profesional.',
      rulesText: 'Campamento de élite de 4 bloques. Tu Pokémon combate contra campeones de Liga. Garantiza una ganancia descomunal de experiencia y objetos de torneo.',
      rewards: [
        {
          icon: '⚡',
          label: 'EXP Masiva',
          val: '+150.000 a +350.000 EXP',
          tooltipTitle: 'Experiencia de Campeón',
          tooltipDesc: 'Ganancia extrema de experiencia para llevar a tu Pokémon directo al nivel 100.'
        },
        {
          id: 'rarecandy',
          isItem: true,
          label: 'Pack de Torneo',
          val: 'Rare Candy x3 + 400 BC',
          tooltipTitle: 'Lote de Campeón',
          tooltipDesc: 'Lote de Caramelos Raros y 400 Battle Coins para adquirir objetos de elección.'
        },
        {
          icon: '🏅',
          label: 'Rango Campeón',
          val: '+600 EXP',
          tooltipTitle: 'Experiencia de Entrenador',
          tooltipDesc: 'Rango máximo de prestigio en el circuito profesional de la Liga.'
        }
      ]
    }
  },
  criador: {
    mission_6h: {
      dialogue: 'Monitoreo y análisis nutricional de huevos en la incubadora de la guardería.',
      rulesText: 'Envía 1 Pokémon a la incubadora genética. Consume 5 puntos de Vigor del Pokémon para mejorar permanentemente sus estadísticas base (IVs).',
      rewards: [
        {
          icon: '🧬',
          label: 'Mejora Genética',
          val: '+1 a +3 IVs (Stat Azar)',
          tooltipTitle: 'Mutación Genética Positiva',
          tooltipDesc: 'Aumenta permanentemente los IVs de HP, Ataque, Defensa, SpA, SpD o Velocidad.'
        },
        {
          id: 'everstone',
          isItem: true,
          label: 'Piedraeterna',
          val: 'Piedraeterna x1',
          tooltipTitle: 'Piedraeterna (Everstone)',
          tooltipDesc: 'Herramienta esencial de crianza para fijar la naturaleza genética en la guardería.'
        },
        {
          icon: '🧬',
          label: 'Rango Incubador',
          val: '+50 EXP',
          tooltipTitle: 'Experiencia de Criador',
          tooltipDesc: 'Progreso hacia el dominio genético de la guardería y la incubación rápida.'
        }
      ]
    },
    mission_12h: {
      dialogue: 'Entrenamiento genético intensivo y selección de rasgos para mejorar estadísticas base.',
      rulesText: 'Terapia celular de 2 bloques en la guardería. Consume 10 puntos de Vigor del Pokémon para optimizar simultáneamente 2 estadísticas genéticas.',
      rewards: [
        {
          icon: '🧬',
          label: 'Mejora Dual',
          val: '+2 a +4 IVs (2 Stats)',
          tooltipTitle: 'Optimización Genética Dual',
          tooltipDesc: 'Mejora simultáneamente dos estadísticas de IVs hasta el límite máximo de 31.'
        },
        {
          id: 'destinyknot',
          isItem: true,
          label: 'Lazo Destino',
          val: 'Lazo Destino x1',
          tooltipTitle: 'Lazo Destino (Destiny Knot)',
          tooltipDesc: 'Objeto supremo de crianza que garantiza heredar 4 o 5 IVs de los progenitores.'
        },
        {
          icon: '🧬',
          label: 'Rango Genetista',
          val: '+250 EXP',
          tooltipTitle: 'Experiencia de Criador',
          tooltipDesc: 'Progreso de clase para dominar la selección de habilidades y naturalezas.'
        }
      ]
    },
    mission_24h: {
      dialogue: 'Optimización molecular avanzada de la cadena de ADN para transferir herencias genéticas perfectas.',
      rulesText: 'Reestructuración de ADN de 4 bloques. Consume 15 puntos de Vigor (10% de chance de ahorrar el vigor). Posibilidad de maximizar una estadística a 31 IVs perfecto.',
      rewards: [
        {
          icon: '👑',
          label: 'Genética Perfecta',
          val: '+3 a +5 IVs (Chance 31)',
          tooltipTitle: 'Perfección Genética',
          tooltipDesc: 'Gran salto en estadísticas genéticas con oportunidad de alcanzar 31 IVs máximos.'
        },
        {
          id: 'goldbottlecap',
          isItem: true,
          label: 'Chapa Dorada',
          val: 'Chapa Dorada x1',
          tooltipTitle: 'Chapa Dorada (Gold Bottle Cap)',
          tooltipDesc: 'Chapa de valor incalculable para maximizar al instante todos los IVs de un Pokémon.'
        },
        {
          icon: '🧬',
          label: 'Maestro Criador',
          val: '+600 EXP',
          tooltipTitle: 'Experiencia de Criador',
          tooltipDesc: 'Rango máximo de maestría genética y producción de Pokémon perfectos.'
        }
      ]
    }
  }
};

const DEFAULT_MISSION_DETAILS: ClassMissionDetails = {
  dialogue: 'Realiza tareas especiales de clase.',
  rulesText: 'Despliega a tus Pokémon en misiones especiales según los requisitos de tu clase.',
  rewards: [
    {
      icon: '🎁',
      label: 'Recompensas',
      val: 'Recompensas de Clase',
      tooltipTitle: 'Recompensas de Misión',
      tooltipDesc: 'Otorga beneficios exclusivos al completar el tiempo de despliegue.'
    }
  ]
};

export function getClassMissionDetails(classId: string | undefined, missionId: string): ClassMissionDetails {
  if (!classId || !isMissionId(missionId)) return DEFAULT_MISSION_DETAILS;
  const classMeta = CLASS_MISSIONS_METADATA[classId];
  if (!classMeta) return DEFAULT_MISSION_DETAILS;
  return classMeta[missionId] || DEFAULT_MISSION_DETAILS;
}
