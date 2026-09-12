// @vitest-environment jsdom
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

  it('renders deployment requirements and reward conditions distinctly', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local.',
        activationReq: 'Requiere 1 Pokémon tipo VENENO en Equipo o Caja.',
        rewardConditions: 'Dinero calculado por Nivel (60%) e IVs (40%). 1 Pepita y 50 EXP al finalizar.',
        btnText: 'DESPLEGAR',
        btnDisabled: false,
        isCompleted: false
      }
    });

    expect(wrapper.find('.deploy-badge').text()).toBe('REQUISITO DE DESPLIEGUE');
    expect(wrapper.text()).toContain('Requiere 1 Pokémon tipo VENENO en Equipo o Caja.');
    expect(wrapper.find('.reward-badge').text()).toBe('CÓMO SE GANAN LAS RECOMPENSAS');
    expect(wrapper.text()).toContain('Dinero calculado por Nivel (60%) e IVs (40%). 1 Pepita y 50 EXP al finalizar.');
  });

  it('renders active operation box with assigned pokemon, guaranteed loot, and single timer without duplicate banners', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local.',
        btnText: 'EN CURSO',
        btnDisabled: true,
        isCompleted: false,
        isAvailable: true,
        isActiveMission: true,
        availableRequirement: 'Listo para desplegar',
        activePokemonInfo: 'Koffing (Nv. 20, 45 IVs)',
        activeGuaranteedReward: '₽24.500 + 1 Pepita de Oro',
        remainingTimeText: '05:42:10',
        progressPercent: 45
      }
    });

    expect(wrapper.find('.active-operation-box').exists()).toBe(true);
    expect(wrapper.text()).toContain('OPERACIÓN EN CURSO');
    expect(wrapper.text()).toContain('05:42:10');
    expect(wrapper.text()).toContain('Koffing (Nv. 20, 45 IVs)');
    expect(wrapper.text()).toContain('₽24.500 + 1 Pepita de Oro');
    // Ensure available requirement banner is NOT displayed when active
    expect(wrapper.find('.requirement-banner.is-available-req').exists()).toBe(false);

    // Assert in-card deployment progress bar exists with correct width
    const progressFill = wrapper.find('.operation-progress-fill');
    expect(progressFill.exists()).toBe(true);
    expect(progressFill.attributes('style')).toContain('width: 45%');
  });

  it('does NOT render progress bar when no operation is active', () => {
    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local.',
        btnText: 'DESPLEGAR',
        btnDisabled: false,
        isCompleted: false,
        isAvailable: true,
        isActiveMission: false,
        progressPercent: 0
      }
    });

    expect(wrapper.find('.active-operation-box').exists()).toBe(false);
    expect(wrapper.find('.operation-progress-track').exists()).toBe(false);
  });

  it('suppresses duplicate guaranteed loot in operation box when detailed rewardsList is provided', () => {
    const rewardsList: DetailedMissionReward[] = [
      {
        icon: '₽',
        label: 'Dinero Base',
        val: '₽21.295 (Fijado)',
        tooltipTitle: 'Pago en Poké-Pesos (₽)',
        tooltipDesc: 'Dinero transferido.'
      }
    ];

    const wrapper = mount(MissionCard, {
      props: {
        avatar: '🚀',
        title: '6H · REQUISITO: NV. 1',
        dialogue: 'Extorsión local.',
        btnText: 'EN CURSO',
        btnDisabled: true,
        isCompleted: false,
        isAvailable: true,
        isActiveMission: true,
        activePokemonInfo: 'Koffing (Nv. 20, 45 IVs)',
        activeGuaranteedReward: '₽21.295 + 1 Pepita de Oro',
        rewardsList,
        remainingTimeText: '05:42:10',
        progressPercent: 45
      }
    });

    expect(wrapper.find('.active-operation-box').exists()).toBe(true);
    expect(wrapper.text()).toContain('Koffing (Nv. 20, 45 IVs)');
    // Duplicate "BOTÍN FIJADO:" text must NOT be present when rewardsList is provided
    expect(wrapper.text()).not.toContain('BOTÍN FIJADO:');
    // But detailed rewards list is shown
    expect(wrapper.text()).toContain('RECOMPENSAS DETALLADAS');
    expect(wrapper.text()).toContain('₽21.295 (Fijado)');
  });
});
