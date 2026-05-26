<script setup lang="ts">
import { computed } from 'vue';
import gsap from 'gsap';
import PVTooltip from '@/components/common/PVTooltip.vue';

export interface SandboxPokemon {
  id: string;
  name: string;
  volatiles?: Record<string, { id: string; duration?: number; time?: number; layers?: number; hp?: number; source?: string }> | null;
}

export interface SideCondition {
  id: string;
  duration?: number;
  layers?: number;
}

const props = defineProps<{
  pokemon: SandboxPokemon | null;
  sideConditions?: SideCondition[];
}>();

interface TagItem {
  id: string;
  name: string;
  emoji: string;
  valueText: string;
  colorClass: string;
  description: string;
  effects: string[];
}

// Map of volatile statuses translation, descriptions & detailed effects
const VOLATILE_TAG_CONFIGS: Record<string, { 
  name: string; 
  emoji: string; 
  color: string;
  desc: string;
  effects: string[];
}> = {
  leechseed: { 
    name: 'DRENADORAS', 
    emoji: '🌱', 
    color: 'tag-grass',
    desc: 'Planta semillas que drenan energía del oponente al final de cada turno.',
    effects: [
      '🩹 Roba un 1/8 (12.5%) de los PS máximos del objetivo al final de cada turno.',
      '❤️ Cura al Pokémon activo del usuario por la misma cantidad robada.',
      '⌛ Duración: Persiste hasta que el objetivo sea cambiado o finalice el combate.'
    ]
  },
  perishsong: { 
    name: 'CANTO MORTAL', 
    emoji: '💀', 
    color: 'tag-perish',
    desc: 'Un canto lúgubre que debilita a todos los Pokémon en combate.',
    effects: [
      '💀 Cualquier Pokémon que escuche el canto se debilitará de forma garantizada cuando la cuenta llegue a 0.',
      '⌛ Cuenta regresiva: Se debilita en los turnos indicados.',
      '🧹 Evitación: Cambiar al Pokémon activo limpia el efecto y detiene la cuenta.'
    ]
  },
  confusion: { 
    name: 'CONFUSIÓN', 
    emoji: '🌀', 
    color: 'tag-psychic',
    desc: 'El Pokémon está desorientado y puede autolesionarse al intentar atacar.',
    effects: [
      '🌀 50% de probabilidad de autolesionarse con un golpe de potencia física 40 al atacar.',
      '⌛ Duración: Se disipa aleatoriamente después de 2 a 5 turnos.'
    ]
  },
  taunt: { 
    name: 'MOFA', 
    emoji: '🤫', 
    color: 'tag-dark',
    desc: 'Provoca al oponente impidiéndole usar movimientos de estado o soporte.',
    effects: [
      '🤫 Solo permite usar movimientos de categoría física o especial (de daño).',
      '❌ Bloquea movimientos de estado (pantallas, curas, estados alterados).',
      '⌛ Duración: Se disipa al terminar los turnos indicados.'
    ]
  },
  encore: { 
    name: 'OTRA VEZ', 
    emoji: '🔁', 
    color: 'tag-normal',
    desc: 'Obliga al objetivo a repetir su último movimiento realizado.',
    effects: [
      '🔁 El objetivo solo puede seleccionar el último movimiento que utilizó.',
      '⌛ Duración: Se mantiene activo por los turnos indicados.'
    ]
  },
  substitute: { 
    name: 'SUSTITUTO', 
    emoji: '🧸', 
    color: 'tag-normal',
    desc: 'Crea un señuelo protector utilizando el 25% de los PS máximos del usuario.',
    effects: [
      '🧸 Absorbe todo el daño recibido y protege contra la mayoría de cambios de estado y debuffs.',
      '❤️ PS del Sustituto: Se destruye al recibir el daño indicado.'
    ]
  },
  disable: { 
    name: 'ANULACIÓN', 
    emoji: '❌', 
    color: 'tag-ghost',
    desc: 'Desactiva el último movimiento usado por el oponente.',
    effects: [
      '❌ Impide seleccionar o usar el último movimiento ejecutado.',
      '⌛ Duración: Dura entre 2 y 5 turnos.'
    ]
  },
  torment: { 
    name: 'TORMENTO', 
    emoji: '😈', 
    color: 'tag-dark',
    desc: 'Impide al objetivo usar el mismo movimiento dos veces seguidas.',
    effects: [
      '😈 Prohíbe la selección consecutiva del mismo ataque.',
      '⌛ Duración: Activo de forma indefinida hasta que el objetivo sea cambiado.'
    ]
  },
  attract: { 
    name: 'ATRACCIÓN', 
    emoji: '💖', 
    color: 'tag-fairy',
    desc: 'El Pokémon está enamorado del oponente y tiene dificultades para atacar.',
    effects: [
      '💖 50% de probabilidad de quedar paralizado por amor y no poder atacar en cada turno.',
      '⌛ Duración: Se disipa inmediatamente si el oponente o el usuario es cambiado.'
    ]
  },
  yawn: { 
    name: 'BOSTEZO', 
    emoji: '💤', 
    color: 'tag-normal',
    desc: 'El Pokémon tiene somnolencia y se dormirá al final del próximo turno.',
    effects: [
      '💤 El objetivo se quedará dormido al finalizar el turno actual.',
      '🧹 Evitación: Cambiar al Pokémon evita que se duerma.'
    ]
  },
  nightmare: { 
    name: 'PESADILLA', 
    emoji: '👹', 
    color: 'tag-ghost',
    desc: 'Causa daño residual constante a un oponente que está dormido.',
    effects: [
      '🩹 Resta 1/4 (25%) de los PS máximos del objetivo al final de cada turno.',
      '⌛ Duración: Persiste mientras el objetivo permanezca dormido.'
    ]
  },
  destinybond: { 
    name: 'MISMO DESTINO', 
    emoji: '🔗', 
    color: 'tag-ghost',
    desc: 'Vincula el destino del usuario con el de su oponente.',
    effects: [
      '🔗 Si el usuario es debilitado por un ataque directo, el atacante también se debilita.',
      '⌛ Duración: Activo únicamente durante el turno en que se usó.'
    ]
  },
  grudge: { 
    name: 'RABIA', 
    emoji: '😠', 
    color: 'tag-ghost',
    desc: 'Rencor del usuario hacia el ataque final del oponente.',
    effects: [
      '😠 Si el usuario es debilitado por un ataque directo, reduce los PP de dicho ataque a 0.',
      '⌛ Duración: Se disipa si el usuario es cambiado.'
    ]
  },
  imprison: { 
    name: 'SELLAR', 
    emoji: '🔒', 
    color: 'tag-psychic',
    desc: 'Sella los movimientos conocidos por el usuario que también conozca el rival.',
    effects: [
      '🔒 El oponente no puede usar ningún movimiento que el usuario conozca.',
      '⌛ Duración: Activo de forma indefinida mientras el usuario siga en combate.'
    ]
  },
  ingrain: { 
    name: 'ARRAIGO', 
    emoji: '🌲', 
    color: 'tag-grass',
    desc: 'Echa raíces en el suelo para recuperar salud y resistir fuerzas externas.',
    effects: [
      '❤️ Recupera 1/16 (6.25%) de los PS máximos al final de cada turno.',
      '❌ El usuario no puede huir, ser cambiado ni forzado a retirarse (Rugido/Remolino).',
      '⌛ Duración: Permanente hasta debilitarse.'
    ]
  },
  charge: { 
    name: 'CARGA', 
    emoji: '⚡', 
    color: 'tag-electric',
    desc: 'Carga energía eléctrica para aumentar el poder del próximo ataque.',
    effects: [
      '⚡ El próximo ataque de tipo Eléctrico causará el doble de daño.',
      '🛡️ Aumenta la Defensa Especial del usuario en un nivel.',
      '⌛ Duración: Activo hasta usar un ataque eléctrico o ser cambiado.'
    ]
  },
  magnetrise: { 
    name: 'LEVIDAD', 
    emoji: '🧲', 
    color: 'tag-electric',
    desc: 'El Pokémon levita en el aire mediante electromagnetismo.',
    effects: [
      '🧲 Inmunidad completa a ataques y efectos de tipo Tierra (ej: Terremoto, Púas).',
      '⌛ Duración: Se mantiene activo por 5 turnos.'
    ]
  },
  embargo: { 
    name: 'EMBARGO', 
    emoji: '🚫', 
    color: 'tag-dark',
    desc: 'Impide al objetivo usar su objeto equipado.',
    effects: [
      '🚫 Bloquea los efectos de objetos equipados (Restos, Cinta Elegida, etc.).',
      '⌛ Duración: Se mantiene activo por 5 turnos.'
    ]
  },
  healblock: { 
    name: 'ANTICURA', 
    emoji: '🩹', 
    color: 'tag-psychic',
    desc: 'Impide al objetivo restaurar sus PS por cualquier medio.',
    effects: [
      '❌ Bloquea movimientos de cura (Amortiguador, Recuperación) y efectos de drenado.',
      '⌛ Duración: Se mantiene activo por 5 turnos.'
    ]
  },
  focuspunch: { 
    name: 'P. CERTERO', 
    emoji: '✊', 
    color: 'tag-fighting',
    desc: 'El Pokémon concentra su energía para lanzar un golpe devastador.',
    effects: [
      '✊ Aumenta el poder del golpe al final del turno.',
      '⚠️ Si el usuario recibe daño antes de ejecutar el ataque, perderá la concentración y fallará.',
      '⌛ Duración: Activo solo durante el turno de carga.'
    ]
  }
};

const BINDING_VOLATILES = new Set([
  'bind', 'wrap', 'firespin', 'sandtomb', 'whirlpool', 'clamp', 'infestation', 'partiallytrapped'
]);

const BINDING_NAMES: Record<string, { name: string; emoji: string }> = {
  whirlpool: { name: 'TORBELLINO', emoji: '🌀' },
  firespin: { name: 'GIRO FUEGO', emoji: '🔥' },
  sandtomb: { name: 'BUCLE ARENA', emoji: '⏳' },
  clamp: { name: 'TENAZA', emoji: '🦀' },
  bind: { name: 'ATADURA', emoji: '🩹' },
  wrap: { name: 'CONSTRICCIÓN', emoji: '🐍' },
  infestation: { name: 'ACOSO', emoji: '🐜' }
};

// Map of side conditions translation, descriptions & detailed effects
const SIDE_TAG_CONFIGS: Record<string, { 
  name: string; 
  emoji: string; 
  color: string;
  desc: string;
  effects: string[];
}> = {
  reflect: { 
    name: 'REFLEJO', 
    emoji: '🛡️', 
    color: 'tag-reflect',
    desc: 'Una barrera psíquica que protege al equipo del daño físico.',
    effects: [
      '💥 Daño FÍSICO recibido: Reducido al 50% (en combates individuales).',
      '⌛ Duración: Se disipa tras 5 turnos.'
    ]
  },
  lightscreen: { 
    name: 'P. LUZ', 
    emoji: '✨', 
    color: 'tag-lightscreen',
    desc: 'Una barrera brillante que protege al equipo del daño especial.',
    effects: [
      '🔮 Daño ESPECIAL recibido: Reducido al 50% (en combates individuales).',
      '⌛ Duración: Se disipa tras 5 turnos.'
    ]
  },
  safeguard: { 
    name: 'SALVAGUARDIA', 
    emoji: '🌸', 
    color: 'tag-safeguard',
    desc: 'Un velo místico que protege al equipo de cambios de estado.',
    effects: [
      '❌ Inmunidad de Estado: Impide ser paralizado, quemado, envenenado, dormido o congelado por ataques rivales.',
      '⌛ Duración: Activa durante 5 turnos.'
    ]
  },
  mist: { 
    name: 'NEBLINA', 
    emoji: '🌫️', 
    color: 'tag-mist',
    desc: 'Un denso banco de niebla que protege al equipo de reducciones de estadísticas.',
    effects: [
      '🛡️ Inmunidad de Stats: Impide que los oponentes bajen tus estadísticas en combate.',
      '⌛ Duración: Activa durante 5 turnos.'
    ]
  },
  spikes: { 
    name: 'PÚAS', 
    emoji: '🪵', 
    color: 'tag-spikes',
    desc: 'Trampas de púas en el suelo que dañan a los Pokémon rivales al entrar.',
    effects: [
      '🩹 Daño al entrar (no Voladores ni Levitación):',
      '  • 1 Capa: 1/8 (12.5%) HP máx.',
      '  • 2 Capas: 1/6 (16.6%) HP máx.',
      '  • 3 Capas: 1/4 (25.0%) HP máx.',
      '🧹 Eliminación: Se quitan usando Giro Rápido.'
    ]
  },
  toxicspikes: { 
    name: 'P. TÓXICAS', 
    emoji: '🧪', 
    color: 'tag-toxic',
    desc: 'Púas impregnadas en veneno que envenenan a los oponentes al entrar.',
    effects: [
      '🧪 Envenenamiento al entrar:',
      '  • 1 Capa: Envenenamiento normal.',
      '  • 2 Capas: Envenenamiento grave (Tóxico).',
      '🧹 Inmunidad: Pokémon de tipo Veneno absorben las púas al entrar.'
    ]
  },
  stealthrock: { 
    name: 'TRAMPA ROCAS', 
    emoji: '🪨', 
    color: 'tag-rock',
    desc: 'Rocas flotantes que causan daño basado en la debilidad a Roca al entrar.',
    effects: [
      '🪨 Daño al entrar según efectividad de tipo Roca:',
      '  • Debilidad 4x (ej. Charizard): 50% de HP máx.',
      '  • Debilidad 2x (ej. Gyarados): 25% de HP máx.',
      '  • Neutral (ej. Pikachu): 12.5% de HP máx.',
      '  • Resistencia 2x (ej. Machamp): 6.25% de HP máx.',
      '  • Resistencia 4x (ej. Steelix): 3.125% de HP máx.'
    ]
  },
  stickyweb: { 
    name: 'RED VISCOSA', 
    emoji: '🕸️', 
    color: 'tag-bug',
    desc: 'Una red pegajosa en el suelo que reduce la Velocidad de los oponentes al entrar.',
    effects: [
      '🕸️ Reduce la Velocidad en un nivel de todo Pokémon terrestre al entrar.',
      '🧹 Eliminación: Se quita usando Giro Rápido.'
    ]
  }
};

// Unified computed active tags list
const activeTags = computed<TagItem[]>(() => {
  const list: TagItem[] = [];

  // 1. Process Volatiles
  if (props.pokemon?.volatiles) {
    for (const [key, v] of Object.entries(props.pokemon.volatiles)) {
      const lowerKey = key.toLowerCase();
      
      // Handle generic binding/trap volatiles
      if (lowerKey === 'partiallytrapped' || BINDING_VOLATILES.has(lowerKey)) {
        let value = '';
        if (v.duration !== undefined) {
          value = `${v.duration} T`;
        }
        
        const sourceId = v.source?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const bindingConfig = BINDING_NAMES[sourceId] || { name: 'ATRAPADO', emoji: '🕸️' };
        const moveName = bindingConfig.name;

        list.push({
          id: `volatile-${lowerKey}`,
          name: moveName,
          emoji: bindingConfig.emoji,
          valueText: value,
          colorClass: 'tag-dark',
          description: `El Pokémon está atrapado por el movimiento ${moveName} y no puede huir ni ser cambiado de forma manual.`,
          effects: [
            `🕸️ Impide huir o usar relevo del banquillo de forma normal.`,
            `🩹 Causa daño residual constante de 1/16 de los PS máximos al final de cada turno.`,
            `⌛ Duración: Quedan ${v.duration || 3} turnos restantes de atrapamiento.`
          ]
        });
        continue;
      }

      const config = VOLATILE_TAG_CONFIGS[lowerKey];
      if (config) {
        let valText = '';
        if (lowerKey === 'substitute' && v.hp !== undefined) {
          valText = `${v.hp} PS`;
        } else if (v.duration !== undefined) {
          valText = `${v.duration} T`;
        } else if (v.time !== undefined) {
          valText = `${v.time} T`;
        }

        list.push({
          id: `volatile-${lowerKey}`,
          name: config.name,
          emoji: config.emoji,
          valueText: valText,
          colorClass: config.color,
          description: config.desc,
          effects: config.effects
        });
      }
    }
  }

  // 2. Process Side Conditions
  if (props.sideConditions) {
    for (const cond of props.sideConditions) {
      const lowerId = cond.id.toLowerCase();
      const config = SIDE_TAG_CONFIGS[lowerId];
      if (config) {
        let valText = '';
        if (cond.layers !== undefined && cond.layers > 1) {
          valText = `x${cond.layers}`;
        } else if (cond.duration !== undefined) {
          valText = `${cond.duration} T`;
        }

        list.push({
          id: `side-${lowerId}`,
          name: config.name,
          emoji: config.emoji,
          valueText: valText,
          colorClass: config.color,
          description: config.desc,
          effects: config.effects
        });
      }
    }
  }

  return list;
});

// GSAP Transition Hooks
const onBeforeEnter = (el: Element) => {
  gsap.set(el, {
    opacity: 0,
    scale: 0.8,
    x: -12,
    filter: 'blur(2px)'
  });
};

const onEnter = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 1,
    scale: 1,
    x: 0,
    filter: 'blur(0px)',
    duration: 0.35,
    ease: 'back.out(1.5)',
    onComplete: done
  });
};

const onLeave = (el: Element, done: () => void) => {
  gsap.to(el, {
    opacity: 0,
    scale: 0.8,
    x: 12,
    filter: 'blur(2px)',
    duration: 0.25,
    ease: 'power2.in',
    onComplete: done
  });
};
</script>

<template>
  <TransitionGroup
    name="combat-tag"
    tag="div"
    class="combat-tags-grid"
    @before-enter="onBeforeEnter"
    @enter="onEnter"
    @leave="onLeave"
  >
    <div
      v-for="tag in activeTags"
      :key="tag.id"
      class="combat-tag-wrapper"
    >
      <PVTooltip
        :title="tag.name"
        position="bottom"
      >
        <div
          class="combat-tag-pill"
          :class="tag.colorClass"
        >
          <span class="tag-pill-emoji">{{ tag.emoji }}</span>
          <span class="tag-pill-name">{{ tag.name }}</span>
          <span
            v-if="tag.valueText"
            class="tag-pill-value"
          >{{ tag.valueText }}</span>
        </div>

        <template #content>
          <div class="combat-tag-tooltip-content">
            <p class="tooltip-desc">
              {{ tag.description }}
            </p>
            <div class="tooltip-divider" />
            <div class="tooltip-effects">
              <div class="effects-title">
                EFECTOS MECÁNICOS (GEN 3):
              </div>
              <div
                v-for="eff in tag.effects"
                :key="eff"
                class="effect-row"
              >
                {{ eff }}
              </div>
            </div>
          </div>
        </template>
      </PVTooltip>
    </div>
  </TransitionGroup>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.combat-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  width: 100%;
}

.combat-tag-wrapper {
  display: inline-block;
}

.combat-tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: 4px;
  background: Rgba(10, 15, 25, 0.75);
  backdrop-filter: Blur(4px);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  @include pixelated;
  transition: border-color 0.2s ease, transform 0.2s ease;
  user-select: none;
  box-shadow: 0 2px 6px Rgba(0, 0, 0, 0.3);
  cursor: help;

  &:hover {
    border-color: Rgba(255, 255, 255, 0.3);
    transform: Translatey(-1px);
  }

  .tag-pill-emoji {
    font-size: 10px;
    line-height: 1;
  }

  .tag-pill-name {
    font-size: 7.5px;
    font-weight: bold;
    color: #e5e5ea;
    letter-spacing: 0.5px;
    text-shadow: 1px 1px 0 Rgba(0, 0, 0, 0.8);
  }

  .tag-pill-value {
    font-size: 7.5px;
    font-weight: bold;
    color: #ffd60a; // yellow highlight for duration/value
    padding-left: 2px;
    letter-spacing: 0.2px;
  }

  /* Distinctive retro-modern colors with HSL curated glow borders */
  &.tag-grass {
    border-left: 3px solid #30d158;
    background: Rgba(48, 209, 88, 0.08);
  }

  &.tag-perish {
    border-left: 3px solid #ff453a;
    background: Rgba(255, 69, 58, 0.08);
    .tag-pill-value { color: #ff453a; }
  }

  &.tag-psychic {
    border-left: 3px solid #bf5af2;
    background: Rgba(191, 90, 242, 0.08);
  }

  &.tag-dark {
    border-left: 3px solid #5e5ce6;
    background: Rgba(94, 92, 230, 0.08);
  }

  &.tag-normal {
    border-left: 3px solid #aeaebe;
    background: Rgba(174, 174, 190, 0.08);
  }

  &.tag-ghost {
    border-left: 3px solid #af52de;
    background: Rgba(175, 82, 222, 0.08);
  }

  &.tag-fairy {
    border-left: 3px solid #ff375f;
    background: Rgba(255, 55, 95, 0.08);
  }

  &.tag-electric {
    border-left: 3px solid #ffd60a;
    background: Rgba(255, 214, 10, 0.08);
  }

  &.tag-fighting {
    border-left: 3px solid #ff9f0a;
    background: Rgba(255, 159, 10, 0.08);
  }

  &.tag-reflect {
    border-left: 3px solid #64d2ff;
    background: Rgba(100, 210, 255, 0.08);
  }

  &.tag-lightscreen {
    border-left: 3px solid #ffd60a;
    background: Rgba(255, 214, 10, 0.08);
  }

  &.tag-safeguard {
    border-left: 3px solid #ff64b0;
    background: Rgba(255, 100, 176, 0.08);
  }

  &.tag-mist {
    border-left: 3px solid #a7ffeb;
    background: Rgba(167, 255, 235, 0.08);
  }

  &.tag-spikes {
    border-left: 3px solid #d4a373;
    background: Rgba(212, 163, 115, 0.08);
  }

  &.tag-toxic {
    border-left: 3px solid #bf5af2;
    background: Rgba(191, 90, 242, 0.08);
  }

  &.tag-rock {
    border-left: 3px solid #cca43b;
    background: Rgba(204, 164, 59, 0.08);
  }

  &.tag-bug {
    border-left: 3px solid #acbfa4;
    background: Rgba(172, 191, 164, 0.08);
  }
}

.combat-tag-tooltip-content {
  width: 200px;
  padding: 4px;
  @include pixelated;

  .tooltip-desc {
    font-size: 8px;
    color: #aeaebe;
    margin: 0 0 6px 0;
    line-height: 1.4;
  }

  .tooltip-divider {
    height: 1px;
    background: Rgba(255, 255, 255, 0.1);
    margin: 6px 0;
  }

  .tooltip-effects {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .effects-title {
      font-size: 7px;
      color: #86868b;
      letter-spacing: 0.5px;
      font-weight: bold;
      margin-bottom: 2px;
    }

    .effect-row {
      font-size: 7.5px;
      line-height: 1.3;
      color: white;
      white-space: pre-wrap;
    }
  }
}
</style>
