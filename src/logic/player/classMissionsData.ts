/**
 * src/logic/player/classMissionsData.ts
 *
 * Detailed rules, mechanics, and multi-reward metadata for Class Missions (Deployments).
 */

import type { ItemId } from '@/data/inventory/itemIds';
import { type MissionId, isMissionId, type PlayerClassId } from '@/data/player/playerClasses';

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
  readonly activationReq: string;
  readonly rewardConditions: string;
  readonly rulesText: string;
  readonly rewards: readonly DetailedMissionReward[];
}

export const CLASS_MISSIONS_METADATA: Readonly<Record<string, Readonly<Record<MissionId, ClassMissionDetails>>>> = {
  rocket: {
    mission_6h: {
      dialogue: 'Extorsión local a comerciantes y patrullaje de territorio bajo control Rocket.',
      activationReq: 'Requiere entregar 1 Pokémon de tipo VENENO de tu Equipo o Caja. Es una entrega definitiva en el mercado negro: el Pokémon no regresa (sus objetos equipados vuelven automáticamente a tu mochila).',
      rewardConditions: 'Dinero: Se calcula mediante fórmula fija basada un 60% en el Nivel y un 40% en los IVs totales del espécimen entregado (hasta ₽35.000). Botín: Entrega 1 Pepita de Oro y 50 EXP Rocket al culminar las 6 horas de operación.',
      rulesText: 'Requiere 1 Pokémon tipo VENENO (entrega permanente, no regresa). El dinero escala por Nivel (60%) e IVs (40%). Al finalizar las 6h, cobras hasta ₽35.000, 1 Pepita de Oro y 50 EXP Rocket.',
      rewards: [
        {
          icon: '₽',
          label: 'Dinero Base',
          val: '₽15.000 - ₽35.000',
          tooltipTitle: 'Pago en Pokécuartos (₽)',
          tooltipDesc: 'Dinero en efectivo directo transferido a tu cuenta según el nivel y rareza del Pokémon entregado.'
        },
        {
          id: 'nugget',
          isItem: true,
          label: 'Botín Ilícito',
          val: '1x Pepita de Oro',
          tooltipTitle: 'Pepita (Nugget)',
          tooltipDesc: 'Pepita de oro puro sustraída durante la extorsión. Se vende por un alto valor en cualquier tienda.'
        },
        {
          icon: '🚀',
          label: 'Rango Rocket',
          val: '+50 EXP',
          tooltipTitle: 'Reputación de Sindicato',
          tooltipDesc: 'Puntos de experiencia de clase para ascender en la jerarquía del Equipo Rocket.'
        }
      ]
    },
    mission_12h: {
      dialogue: 'Exportación de especímenes incautados al mercado negro para obtener altos dividendos.',
      activationReq: 'Requiere entregar 1 Pokémon de tipo VENENO para compradores de élite del mercado negro. Es una entrega definitiva: el Pokémon no regresa (sus objetos equipados vuelven automáticamente a tu mochila).',
      rewardConditions: 'Dinero: Escala de ₽40.000 a ₽90.000 según Nivel (60%) e IVs (40%) del espécimen entregado. Botín: Entrega 1 Maxi Pepita de gran valor y 250 EXP Rocket al terminar las 12 horas.',
      rulesText: 'Requiere 1 Pokémon tipo VENENO (entrega permanente, no regresa). El dividendo escala por Nivel (60%) e IVs (40%). Al completar las 12h, recibes hasta ₽90.000, 1 Maxi Pepita y 250 EXP Rocket.',
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
          val: '1x Maxi Pepita',
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
      activationReq: 'Requiere entregar 1 Pokémon de tipo VENENO como distracción definitiva para infiltrar Silph Co. Es una entrega permanente: el Pokémon no regresa (sus objetos equipados vuelven automáticamente a tu mochila).',
      rewardConditions: 'Dinero: Fortuna de ₽100.000 a ₽250.000 calculada por Nivel (60%) e IVs (40%). Botín: Prototipo exclusivo de Master Ball garantizado y 600 EXP Rocket al finalizar las 24 horas.',
      rulesText: 'Requiere 1 Pokémon tipo VENENO (entrega permanente, no regresa). Otorga una fortuna calculada por Nivel e IVs (hasta ₽250.000). Al culminar las 24h, cobras el dinero, 1 Master Ball y 600 EXP Rocket.',
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
          val: '1x Master Ball',
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
      activationReq: 'Costo de expedición: ₽5.000 Pokécuartos en suministros de campo. No requiere entregar ni sacrificar Pokémon.',
      rewardConditions: 'Captura de Bicho: Tus exploradores buscan en rutas según tus medallas de gimnasio. Al finalizar las 6h, depositan 3 Pokémon Bicho en tu Caja con piso garantizado de IVs ≥ 5 en cada estadística y probabilidad Shiny x2. Entrega 3 Malla Balls y 50 EXP.',
      rulesText: 'Cuesta ₽5.000. Al finalizar las 6 horas, recibes 3 Pokémon Bicho en tu Caja (IVs mínimos garantizados ≥ 5, probabilidad Shiny x2), 3 Malla Balls y 50 EXP Cazabichos.',
      rewards: [
        {
          icon: '🐛',
          label: 'Especies Bicho',
          val: '3 Pokémon en Caja',
          tooltipTitle: 'Captura Automática',
          tooltipDesc: 'Garantiza el descubrimiento de 3 ejemplares tipo Bicho con un suelo mínimo de IVs asegurado.'
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
      activationReq: 'Costo de expedición: ₽10.000 Pokécuartos en suministros. No requiere entregar ni sacrificar Pokémon.',
      rewardConditions: 'Coleópteros Raros: 3 Pokémon Bicho capturados en tu Caja con piso de IVs ≥ 10 en cada estadística y probabilidad Shiny x4. Otorga 1 Polvo Plateado (potencia ataques Bicho) y 250 EXP al completar las 12 horas.',
      rulesText: 'Cuesta ₽10.000. Al finalizar las 12h, recibes 3 Pokémon Bicho (IVs mínimos ≥ 10, Shiny x4), 1 Polvo Plateado y 250 EXP Cazabichos.',
      rewards: [
        {
          icon: '✨',
          label: 'Bicho Raro (x4 Shiny)',
          val: '3 Pokémon en Caja',
          tooltipTitle: 'Coleópteros Raros',
          tooltipDesc: 'Alta probabilidad de encontrar ejemplares raros con x4 de probabilidad Shiny y 10 IVs garantizados.'
        },
        {
          id: 'silverpowder',
          isItem: true,
          label: 'Polvo Plateado',
          val: '1x Polvo Plateado',
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
      activationReq: 'Costo de expedición: ₽20.000 Pokécuartos en suministros avanzados. No requiere entregar ni sacrificar Pokémon.',
      rewardConditions: 'Especies Élite: 3 Pokémon Bicho superiores en tu Caja con piso de IVs ≥ 15 en cada estadística y probabilidad Shiny x8. Otorga 1 Banda Focus (Focus Sash) competitiva y 600 EXP al culminar las 24 horas.',
      rulesText: 'Cuesta ₽20.000. Al culminar las 24h, recibes 3 Pokémon Bicho superiores (IVs mínimos ≥ 15, Shiny x8), 1 Banda Focus y 600 EXP Cazabichos.',
      rewards: [
        {
          icon: '👑',
          label: 'Bicho Exótico (x8 Shiny)',
          val: '3 Pokémon en Caja',
          tooltipTitle: 'Ejemplar Alfa Bicho',
          tooltipDesc: 'Pokémon con genética superior (mínimo 15 IVs en cada estadística) y probabilidad Shiny x8.'
        },
        {
          id: 'focussash',
          isItem: true,
          label: 'Banda Focus',
          val: '1x Banda Focus',
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
      activationReq: 'Costo de sparring: ₽5.000 Pokécuartos y asignar 1 Pokémon de tu equipo o caja.',
      rewardConditions: 'EXP de Combate: El Pokémon entrena y gana 25.000 + (Nivel x 1.000) de EXP. Al completar las 6h, tu Pokémon regresa con su experiencia ganada (subiendo de nivel si corresponde) y recibes 50 Battle Coins y 50 EXP de Liga.',
      rulesText: 'Cuesta ₽5.000. El Pokémon asignado combate 6h y gana 25.000 + (Nivel x 1.000) EXP. Al finalizar, regresa con su experiencia ganada, 50 Battle Coins y 50 EXP Entrenador.',
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
      activationReq: 'Costo de sparring: ₽10.000 Pokécuartos y asignar 1 Pokémon de tu equipo o caja.',
      rewardConditions: 'EXP Avanzada: El Pokémon asignado gana doble bloque de experiencia: 2x [25.000 + (Nivel x 1.000)] EXP. Al finalizar las 12h, recibes 1 Caramelo Raro, 150 Battle Coins y 250 EXP de Liga.',
      rulesText: 'Cuesta ₽10.000. El Pokémon asignado gana el doble de EXP. Al finalizar las 12h, regresa con su nivel actualizado, 1 Caramelo Raro, 150 Battle Coins y 250 EXP Entrenador.',
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
      activationReq: 'Costo de sparring: ₽20.000 Pokécuartos y asignar 1 Pokémon de tu equipo o caja.',
      rewardConditions: 'EXP Máxima + Nivel Extra: El Pokémon asignado gana 4x bloques de EXP y sube +1 Nivel completo adicional garantizado. Al finalizar las 24h, recibes 3 Caramelos Raros, 400 Battle Coins y 600 EXP de Liga.',
      rulesText: 'Cuesta ₽20.000. El Pokémon asignado gana 4x bloques de EXP y sube +1 Nivel garantizado. Al culminar las 24h, recibes 3 Caramelos Raros, 400 Battle Coins y 600 EXP Entrenador.',
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
      activationReq: 'Costo genético: 300 Battle Coins y asignar 1 Pokémon con vigor disponible.',
      rewardConditions: 'Optimización de ADN: Consume 5 de Vigor del Pokémon asignado y aumenta permanentemente +1 punto de IV en una estadística que no sea 31. Al finalizar las 6h, recibes 1 Piedraeterna y 50 EXP de Criador.',
      rulesText: 'Cuesta 300 BC. Consume 5 de Vigor del Pokémon y aumenta permanentemente +1 IV en una estadística menor a 31. Al culminar las 6h, cobras 1 Piedraeterna y 50 EXP Criador.',
      rewards: [
        {
          icon: '🧬',
          label: 'Mejora Genética',
          val: '+1 IV (Stat < 31)',
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
      activationReq: 'Costo genético: 600 Battle Coins y asignar 1 Pokémon con vigor disponible.',
      rewardConditions: 'Optimización Dual: Consume 10 de Vigor del Pokémon y aumenta permanentemente +2 puntos de IV en estadísticas menores a 31. Al finalizar las 12h, recibes 1 Lazo Destino de crianza y 250 EXP de Criador.',
      rulesText: 'Cuesta 600 BC. Consume 10 de Vigor del Pokémon y aumenta permanentemente +2 IVs en estadísticas menores a 31. Al culminar las 12h, cobras 1 Lazo Destino y 250 EXP Criador.',
      rewards: [
        {
          icon: '🧬',
          label: 'Mejora Dual',
          val: '+2 IVs (Stats < 31)',
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
      activationReq: 'Costo genético: 1.000 Battle Coins y asignar 1 Pokémon con vigor disponible.',
      rewardConditions: 'Reestructuración Máxima: Consume 15 de Vigor (10% de probabilidad de no gastar vigor) y aumenta permanentemente +4 puntos de IV en estadísticas menores a 31. Al finalizar las 24h, recibes 1 Chapa Dorada y 600 EXP de Criador.',
      rulesText: 'Cuesta 1.000 BC. Consume 15 de Vigor (10% chance de ahorro) y aumenta permanentemente +4 IVs en estadísticas menores a 31. Al culminar las 24h, cobras 1 Chapa Dorada y 600 EXP Criador.',
      rewards: [
        {
          icon: '👑',
          label: 'Genética Perfecta',
          val: '+4 IVs (Stats < 31)',
          tooltipTitle: 'Perfección Genética',
          tooltipDesc: 'Gran salto en estadísticas genéticas aumentando 4 puntos de IV en stats que no hayan alcanzado 31.'
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
  activationReq: 'Despliega a tus Pokémon en misiones especiales según los requisitos de tu clase.',
  rewardConditions: 'Otorga beneficios exclusivos al completar el tiempo de despliegue.',
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

export function getClassMissionDetails(classId: PlayerClassId, missionId: MissionId): ClassMissionDetails {
  if (!isMissionId(missionId)) return DEFAULT_MISSION_DETAILS;
  const classMeta = (CLASS_MISSIONS_METADATA as Record<string, Record<MissionId, ClassMissionDetails>>)[classId]; // open-record: Generic key-value data dictionary container
  if (!classMeta) return DEFAULT_MISSION_DETAILS;
  return classMeta[missionId] || DEFAULT_MISSION_DETAILS;
}
