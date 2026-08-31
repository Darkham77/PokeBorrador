// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CriminalityBar from '@/components/ui/CriminalityBar.vue';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';

describe('CriminalityBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const mountBar = () => {
    return mount(CriminalityBar, {
      global: {
        directives: {
          'gsap-loop': () => {}
        }
      }
    });
  };

  it('no debe renderizarse si el jugador no pertenece a la clase rocket', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'cazabichos';
    uiStore.activeTab = 'map';

    const wrapper = mountBar();
    expect(wrapper.find('#criminality-bar').exists()).toBe(false);
  });

  it('no debe renderizarse si el jugador no está en la pestaña "map"', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'rocket';
    uiStore.activeTab = 'box';

    const wrapper = mountBar();
    expect(wrapper.find('#criminality-bar').exists()).toBe(false);
  });

  it('debe renderizar 0% con altura de barra 0% cuando la criminalidad es 0', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classData.criminality = 0;
    uiStore.activeTab = 'map';

    const wrapper = mountBar();
    expect(wrapper.find('#criminality-bar').exists()).toBe(true);
    expect(wrapper.find('#criminality-percent-label').text()).toBe('0%');
    
    const fillEl = wrapper.find('#criminality-bar-fill');
    expect(fillEl.attributes('style')).toContain('height: 0%');
  });

  it('debe renderizar 50% con altura de barra 50% cuando la criminalidad es 50', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classData.criminality = 50;
    uiStore.activeTab = 'map';

    const wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('50%');
    
    const fillEl = wrapper.find('#criminality-bar-fill');
    expect(fillEl.attributes('style')).toContain('height: 50%');
    expect(wrapper.find('.glow-effect').exists()).toBe(false);
  });

  it('debe renderizar 100% y activar el efecto de alerta cuando la criminalidad llega a 100%', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'rocket';
    gameStore.state.classData.criminality = 100;
    uiStore.activeTab = 'map';

    const wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('100%');
    
    const fillEl = wrapper.find('#criminality-bar-fill');
    expect(fillEl.attributes('style')).toContain('height: 100%');
    expect(wrapper.find('.glow-effect').exists()).toBe(true);
  });

  it('debe renderizar el nivel extra y limitar la altura al 100% al superar 100% de criminalidad', () => {
    const gameStore = useGameStore();
    const uiStore = useUIStore();
    gameStore.state.playerClass = 'rocket';
    uiStore.activeTab = 'map';

    // Caso 120% (exceso 20 -> +2 LV)
    gameStore.state.classData.criminality = 120;
    let wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('120% (+2 LV)');
    expect(wrapper.find('#criminality-bar-fill').attributes('style')).toContain('height: 100%');

    // Caso 150% (exceso 50 -> +5 LV)
    gameStore.state.classData.criminality = 150;
    wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('150% (+5 LV)');
    expect(wrapper.find('#criminality-bar-fill').attributes('style')).toContain('height: 100%');

    // Caso 200% (exceso 100 -> +10 LV)
    gameStore.state.classData.criminality = 200;
    wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('200% (+10 LV)');
    expect(wrapper.find('#criminality-bar-fill').attributes('style')).toContain('height: 100%');

    // Caso 300% (exceso 200 -> +20 LV)
    gameStore.state.classData.criminality = 300;
    wrapper = mountBar();
    expect(wrapper.find('#criminality-percent-label').text()).toBe('300% (+20 LV)');
    expect(wrapper.find('#criminality-bar-fill').attributes('style')).toContain('height: 100%');
  });
});

