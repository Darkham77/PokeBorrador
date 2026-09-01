import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MissionCard from '@/components/events/MissionCard.vue';
import type { DetailedMissionReward } from '@/logic/player/classMissionsData';

describe('MissionCard.vue', () => {
  it('renders single reward mode for daily missions properly', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: 'https://example.com/trainer.png',
        isAvatarUrl: true,
        title: 'Joven Chano dice:',
        dialogue: '¡Necesito un Rattata con buenos IVs!',
        rewardIcon: '🎁',
        rewardLabel: 'Recompensa',
        rewardVal: 'Super Ball x5',
        rewardId: 'greatball',
        btnText: 'ENTREGAR',
        btnDisabled: false,
        isCompleted: false
      }
    });

    expect(wrapper.text()).toContain('Joven Chano dice:');
    expect(wrapper.text()).toContain('¡Necesito un Rattata con buenos IVs!');
    expect(wrapper.text()).toContain('Super Ball x5');
    expect(wrapper.find('button.btn-deliver').text()).toBe('ENTREGAR');
    expect(wrapper.find('.rules-box').exists()).toBe(false);
  });

  it('renders class deployment mode with rulesText and detailed multi-rewards', async () => {
    const rewardsList: DetailedMissionReward[] = [
      {
        icon: '₽',
        label: 'Dinero Base',
        val: '₽15.000 - ₽35.000',
        tooltipTitle: 'Pago en Poké-Pesos (₽)',
        tooltipDesc: 'Dinero en efectivo transferido a tu cuenta.'
      },
      {
        id: 'nugget',
        isItem: true,
        label: 'Botín Ilícito',
        val: 'Pepitas de Oro',
        tooltipTitle: 'Pepita (Nugget)',
        tooltipDesc: 'Pepita de oro sustraída durante la extorsión.'
      }
    ];

    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local a comerciantes y patrullaje de territorio bajo control Rocket.',
        rulesText: 'Requiere sacrificar 1 Pokémon tipo VENENO de tu Equipo o Caja.',
        rewardsList,
        btnText: 'DESPLEGAR',
        btnDisabled: false,
        isCompleted: false
      }
    });

    expect(wrapper.text()).toContain('6H · REQUISITO: NV. 1');
    expect(wrapper.find('.rules-box').exists()).toBe(true);
    expect(wrapper.find('.rules-badge').text()).toBe('REGLAS / REQUISITOS');
    expect(wrapper.find('.rules-desc').text()).toContain('Requiere sacrificar 1 Pokémon tipo VENENO');

    expect(wrapper.text()).toContain('RECOMPENSAS DETALLADAS');
    expect(wrapper.text()).toContain('Dinero Base');
    expect(wrapper.text()).toContain('₽15.000 - ₽35.000');
    expect(wrapper.text()).toContain('Botín Ilícito');
    expect(wrapper.text()).toContain('Pepitas de Oro');

    // Trigger action event
    const button = wrapper.find('button.btn-deliver');
    await button.trigger('click');
    expect(wrapper.emitted('action')).toBeTruthy();
  });

  it('renders available golden card state with available requirement chip', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local.',
        btnText: 'DESPLEGAR',
        btnDisabled: false,
        isCompleted: false,
        isAvailable: true,
        availableRequirement: 'Listo para desplegar'
      }
    });

    expect(wrapper.classes()).toContain('is-available');
    expect(wrapper.classes()).not.toContain('is-locked');
    expect(wrapper.find('.requirement-banner.is-available-req').exists()).toBe(true);
    expect(wrapper.find('.requirement-banner.is-available-req').text()).toContain('Listo para desplegar');
  });

  it('renders locked dotted blue card state with unmet requirement chip', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '12H · REQUISITO: NV. 15',
        dialogue: 'Exportación de especímenes.',
        btnText: 'BLOQUEADO',
        btnDisabled: true,
        isCompleted: false,
        isAvailable: false,
        unmetRequirement: 'Requiere Nivel de Entrenador 15 (Tu Nivel: 10)'
      }
    });

    expect(wrapper.classes()).toContain('is-locked');
    expect(wrapper.classes()).not.toContain('is-available');
    expect(wrapper.find('.requirement-banner.is-unmet').exists()).toBe(true);
    expect(wrapper.find('.requirement-banner.is-unmet').text()).toContain('Requiere Nivel de Entrenador 15');
    expect(wrapper.find('button.btn-deliver').attributes('disabled')).toBeDefined();
  });
});
