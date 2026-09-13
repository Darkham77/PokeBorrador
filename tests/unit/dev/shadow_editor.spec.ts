/**
 * @vitest-environment jsdom
 * tests/unit/dev/shadow_editor.spec.ts
 *
 * Unit tests for shadow editor domain types, O(1) parsers, and catalog composition.
 */

import { describe, it, expect } from 'vitest';
import { parseTrainerSpriteKey, type PokemonEditorEntity } from '@/types/pokemon/spriteShadows';
import { NPC_SPRITE_TO_ARCHETYPE_MAP } from '@/data/pokemon/npcSpriteCatalog';
import { useShadowEditor } from '@/views/dev/useShadowEditor';

describe('Dev Shadow Editor Domain Types & O(1) Parsers', () => {
  describe('parseTrainerSpriteKey (O(1))', () => {
    it('correctly parses valid trainer sprite keys (front and back only)', () => {
      const rocketMale = parseTrainerSpriteKey('rocket_m_front');
      expect(rocketMale).toEqual({
        trainerClass: 'rocket',
        gender: 'm',
        view: 'front'
      });

      const bugCatcherFemale = parseTrainerSpriteKey('cazabichos_h_front');
      expect(bugCatcherFemale).toEqual({
        trainerClass: 'cazabichos',
        gender: 'h',
        view: 'front'
      });

      const breederBack = parseTrainerSpriteKey('criador_m_back');
      expect(breederBack).toEqual({
        trainerClass: 'criador',
        gender: 'm',
        view: 'back'
      });

      // Avatars are strictly excluded and return null
      expect(parseTrainerSpriteKey('cazabichos_h_avatar')).toBeNull();
    });

    it('rejects invalid or malformed trainer sprite keys with null in O(1)', () => {
      expect(parseTrainerSpriteKey('invalid_key')).toBeNull();
      expect(parseTrainerSpriteKey('pescador_m_front')).toBeNull(); // 'pescador' is not a PlayerClassId
      expect(parseTrainerSpriteKey('rocket_x_front')).toBeNull(); // 'x' is not a valid GenderId ('m' | 'h')
      expect(parseTrainerSpriteKey('rocket_m_side')).toBeNull(); // 'side' is not a TrainerAssetView
      expect(parseTrainerSpriteKey('')).toBeNull();
    });
  });

  describe('NPC_SPRITE_TO_ARCHETYPE_MAP (O(1))', () => {
    it('provides constant-time mapping for known NPC sprites', () => {
      expect(NPC_SPRITE_TO_ARCHETYPE_MAP['aaron']).toBe('caza_bichos');
      expect(NPC_SPRITE_TO_ARCHETYPE_MAP['bugcatcher']).toBe('caza_bichos');
      expect(NPC_SPRITE_TO_ARCHETYPE_MAP['blaine']).toBe('cientifico');
      expect(NPC_SPRITE_TO_ARCHETYPE_MAP['atticus']).toBe('luchador');
    });

    it('returns undefined for non-existent NPC sprites without throwing', () => {
      const map = NPC_SPRITE_TO_ARCHETYPE_MAP as Record<string, unknown>;
      expect(map['unknown_sprite_xyz']).toBeUndefined();
    });
  });

  describe('useShadowEditor Composable', () => {
    it('builds catalog with canonical Pokémon gender in UPPERCASE (GenderName)', () => {
      const editor = useShadowEditor();
      editor.buildCatalog();

      expect(editor.totalEntities.value).toBeGreaterThan(150);

      // Find Bulbasaur (Base/M)
      const bulbasaur = editor.pagedEntities.value.find(e => e.name.includes('BULBASAUR'));
      expect(bulbasaur).toBeDefined();
      expect(bulbasaur?.category).toBe('pokemon');
      if (bulbasaur?.category === 'pokemon') {
        expect(bulbasaur.gender).toBe('M'); // Must be uppercase 'M'
        expect(bulbasaur.gen).toBe(1);
      }
    });

    it('filters Pokémon by canonical GenderName (M and F)', () => {
      const editor = useShadowEditor();
      editor.buildCatalog();

      // Filter to Female only
      editor.selectedCategory.value = 'pokemon';
      editor.selectedGender.value = 'F';
      editor.currentPage.value = 1;

      for (const entity of editor.pagedEntities.value) {
        if (entity.category === 'pokemon') {
          expect(entity.gender).toBe('F');
        }
      }

      // Filter to Male only
      editor.selectedGender.value = 'M';
      for (const entity of editor.pagedEntities.value) {
        if (entity.category === 'pokemon') {
          expect(entity.gender).toBe('M');
        }
      }
    });

    it('manages manual overrides correctly including shadowScale', () => {
      const editor = useShadowEditor();
      const testKey = '/assets/sprites/pokemon/animated/Front/12i.webp';

      expect(editor.overrides.value[testKey]).toBeUndefined();

      editor.setEntityOverride(testKey, 0.52, 0.75, true, 1.35);
      expect(editor.overrides.value[testKey]).toEqual({
        feetX: 0.52,
        feetY: 0.75,
        isFlying: true,
        shadowScale: 1.35
      });

      editor.resetEntityOverride(testKey);
      expect(editor.overrides.value[testKey]).toBeUndefined();
    });

    it('builds catalog with zero duplicate keys and intercalates Front and Back side-by-side', () => {
      const editor = useShadowEditor();
      editor.buildCatalog();

      // Ensure 100% unique keys across all entities (no Vue duplicate key warnings)
      const allKeys = editor.filteredEntities.value.map(e => e.key);
      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);

      // Verify Bulbasaur front and back are intercalated consecutively
      const bulbasaurFront = editor.filteredEntities.value.find(e => e.key.includes('/Front/') && e.key.includes('/1i.webp'));
      const bulbasaurBack = editor.filteredEntities.value.find(e => e.key.includes('/Back/') && e.key.includes('/1i.webp'));
      expect(bulbasaurFront).toBeDefined();
      expect(bulbasaurBack).toBeDefined();

      const frontIndex = editor.filteredEntities.value.indexOf(bulbasaurFront!);
      const backIndex = editor.filteredEntities.value.indexOf(bulbasaurBack!);
      expect(backIndex).toBe(frontIndex + 1);

      // Verify trainer avatars are strictly excluded
      const avatarEntity = editor.filteredEntities.value.find(e => e.key.includes('avatar'));
      expect(avatarEntity).toBeUndefined();
    });
  });

  describe('Canonical Combat Shadow Parity & Aspect Ratio Invariance', () => {
    it('derives canonical shadow width from animated sprite bodyRadius (getShadowWidth)', async () => {
      const { getShadowWidth } = await import('@/composables/battle/useBattleShadows');

      // Gengar (Back, 94i_back): bodyRadius = 0.36 -> 0.36 * 250% = 90%
      const gengarWidth = getShadowWidth({ id: 'gengar', gender: 'm' }, true);
      expect(gengarWidth).toBe('90%');

      // Bulbasaur (Front, 1i): bodyRadius = 0.4125 -> 0.4125 * 250% = 103.125%
      const bulbasaurWidth = getShadowWidth({ id: 'bulbasaur', gender: 'm' }, false);
      expect(bulbasaurWidth).toBe('103.125%');
    });

    it('guarantees 100% uniform scaling without deforming aspect ratio across all scales', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const CombatShadow = (await import('@/components/battle/CombatShadow.vue')).default;
      const { useCombatShadowStore } = await import('@/stores/battle/combatShadows');

      setActivePinia(createPinia());
      const shadowStore = useCombatShadowStore();

      await shadowStore.requestShadow('test_gengar_back', {
        side: 'generic',
        feetX: 0.48,
        feetY: 0.8933,
        entitySize: 200,
        width: '90%',
        isFlying: false,
        visible: true
      });

      // Scale = 1.0 (default)
      const wrapper1x = mount(CombatShadow, {
        props: {
          shadowId: 'test_gengar_back',
          spriteSize: 200,
          shadowScale: 1.0
        }
      });
      const el1x = wrapper1x.find('.pv-combat-shadow');
      expect(el1x.exists()).toBe(true);

      const html1x = el1x.element as HTMLElement;
      const width1x = parseFloat(html1x.style.width);
      const height1x = parseFloat(html1x.style.height);
      const ratio1x = width1x / height1x;

      // Scale = 0.5 (half size)
      const wrapperHalf = mount(CombatShadow, {
        props: {
          shadowId: 'test_gengar_back',
          spriteSize: 200,
          shadowScale: 0.5
        }
      });
      const elHalf = wrapperHalf.find('.pv-combat-shadow');
      const htmlHalf = elHalf.element as HTMLElement;
      const widthHalf = parseFloat(htmlHalf.style.width);
      const heightHalf = parseFloat(htmlHalf.style.height);
      const ratioHalf = widthHalf / heightHalf;

      // Scale = 2.0 (double size)
      const wrapper2x = mount(CombatShadow, {
        props: {
          shadowId: 'test_gengar_back',
          spriteSize: 200,
          shadowScale: 2.0
        }
      });
      const el2x = wrapper2x.find('.pv-combat-shadow');
      const html2x = el2x.element as HTMLElement;
      const width2x = parseFloat(html2x.style.width);
      const height2x = parseFloat(html2x.style.height);
      const ratio2x = width2x / height2x;

      // Aspect ratios MUST be strictly identical across all scales (zero deformation)
      expect(ratioHalf).toBeCloseTo(ratio1x, 4);
      expect(ratio2x).toBeCloseTo(ratio1x, 4);
      expect(widthHalf).toBeCloseTo(width1x * 0.5, 4);
      expect(heightHalf).toBeCloseTo(height1x * 0.5, 4);
      expect(width2x).toBeCloseTo(width1x * 2.0, 4);
      expect(height2x).toBeCloseTo(height1x * 2.0, 4);
    });

    it('mounts ShadowEditorCard with canonical CombatShadow and zero ground-circle', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const CombatShadow = (await import('@/components/battle/CombatShadow.vue')).default;
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());

      const mockGengarEntity: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Back/94i.webp',
        category: 'pokemon',
        name: '#094 GENGAR',
        spriteUrl: '/assets/sprites/pokemon/animated/Back/94i.webp',
        defaultFeetX: 0.48,
        defaultFeetY: 0.8933,
        defaultIsFlying: false,
        defaultShadowScale: 1.0,
        pokemonSpeciesId: requirePokemonSpeciesId('gengar'),
        dexNumber: 94,
        gender: 'M',
        gen: 1,
        view: 'back'
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: mockGengarEntity
        }
      });

      // MUST render CombatShadow component
      expect(wrapper.findComponent(CombatShadow).exists()).toBe(true);
      expect(wrapper.find('.pv-combat-shadow').exists()).toBe(true);

      // MUST NOT render obsolete fake ground circles or horizon lines
      expect(wrapper.find('.ground-circle').exists()).toBe(false);
      expect(wrapper.find('.ground-horizon').exists()).toBe(false);
    });

    it('anchors CombatShadow permanently at 50% left regardless of feetX', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const CombatShadow = (await import('@/components/battle/CombatShadow.vue')).default;
      const { useCombatShadowStore } = await import('@/stores/battle/combatShadows');

      setActivePinia(createPinia());
      const shadowStore = useCombatShadowStore();

      await shadowStore.requestShadow('test_offset_shadow', {
        side: 'generic',
        feetX: 0.25,
        feetY: 0.85,
        entitySize: 200,
        width: '80%',
        visible: true
      });

      const wrapper = mount(CombatShadow, {
        props: {
          shadowId: 'test_offset_shadow',
          spriteSize: 200
        }
      });

      const el = wrapper.find('.pv-combat-shadow');
      expect(el.exists()).toBe(true);
      const html = el.element as HTMLElement;
      expect(html.style.left).toBe('50%');
    });

    it('translates the sprite in ShadowEditorCard according to calibrated feet coordinates', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());

      const mockCharmeleonEntity: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Front/5i.webp',
        category: 'pokemon',
        name: '#005 CHARMELEON',
        spriteUrl: '/assets/sprites/pokemon/animated/Front/5i.webp',
        defaultFeetX: 0.50,
        defaultFeetY: 0.88,
        defaultIsFlying: false,
        defaultShadowScale: 1.0,
        pokemonSpeciesId: requirePokemonSpeciesId('charmeleon'),
        dexNumber: 5,
        gender: 'M',
        gen: 1,
        view: 'front'
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: mockCharmeleonEntity,
          override: {
            feetX: 0.29,
            feetY: 0.83,
            isFlying: false,
            shadowScale: 0.75
          }
        }
      });

      const spriteWrapper = wrapper.find('.sprite-frame-wrapper');
      expect(spriteWrapper.exists()).toBe(true);
      const style = (spriteWrapper.element as HTMLElement).style;
      expect(style.left).toBe('50%');
      expect(style.top).toBe('75%');
      expect(style.transform).toContain('translate(calc(-29%), calc(-83%))');
    });

    it('renders HEREDADO badge when isInherited prop is true', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());

      const mockCharmeleonShiny: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Front shiny/5i.webp',
        category: 'pokemon',
        name: '#005 CHARMELEON (SHINY)',
        spriteUrl: '/assets/sprites/pokemon/animated/Front shiny/5i.webp',
        defaultFeetX: 0.50,
        defaultFeetY: 0.88,
        defaultIsFlying: false,
        defaultShadowScale: 1.0,
        pokemonSpeciesId: requirePokemonSpeciesId('charmeleon'),
        dexNumber: 5,
        gender: 'M',
        gen: 1,
        view: 'front'
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: mockCharmeleonShiny,
          override: {
            feetX: 0.29,
            feetY: 0.83,
            isFlying: false,
            shadowScale: 0.75
          },
          isInherited: true,
          isShiny: true
        }
      });

      const badge = wrapper.find('.status-badge');
      expect(badge.text()).toBe('HEREDADO');
      expect(badge.classes()).toContain('badge-inherited');
    });

    it('co-locates CombatShadow, ground-anchor-crosshair and ground-horizon-line directly under preview-box at dead center (50%, 75%)', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());

      const mockEntity: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Front/8i.webp',
        category: 'pokemon',
        name: '#008 WARTORTLE',
        spriteUrl: '/assets/sprites/pokemon/animated/Front/8i.webp',
        defaultFeetX: 0.50,
        defaultFeetY: 0.88,
        defaultIsFlying: false,
        defaultShadowScale: 1.0,
        pokemonSpeciesId: requirePokemonSpeciesId('wartortle'),
        dexNumber: 8,
        gender: 'M',
        gen: 1,
        view: 'front'
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: mockEntity
        }
      });

      const previewBox = wrapper.find('.preview-box');
      expect(previewBox.exists()).toBe(true);

      // Verify CombatShadow, crosshair, and line are direct children of preview-box
      const shadow = previewBox.findComponent({ name: 'CombatShadow' });
      expect(shadow.exists()).toBe(true);
      expect(shadow.attributes('style')).toContain('--shadow-y: 75%');

      const crosshair = previewBox.find('.ground-anchor-crosshair');
      expect(crosshair.exists()).toBe(true);

      const horizon = previewBox.find('.ground-horizon-line');
      expect(horizon.exists()).toBe(true);

      // No nested sprite-container wrapper
      expect(wrapper.find('.sprite-container').exists()).toBe(false);
    });

    it('preserves virtual relative sizes across species so Bulbasaur is smaller than Ivysaur and Venusaur (no zoom deformation)', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());

      const createMockEntity = (id: 'bulbasaur' | 'ivysaur' | 'venusaur', num: number, spriteName: string): PokemonEditorEntity => ({
        key: `/assets/sprites/pokemon/animated/Front/${spriteName}.webp`,
        category: 'pokemon',
        name: `#00${num} ${id.toUpperCase()}`,
        spriteUrl: `/assets/sprites/pokemon/animated/Front/${spriteName}.webp`,
        defaultFeetX: 0.50,
        defaultFeetY: 0.88,
        defaultIsFlying: false,
        defaultShadowScale: 1.0,
        pokemonSpeciesId: requirePokemonSpeciesId(id),
        dexNumber: num,
        gender: 'M',
        gen: 1,
        view: 'front'
      });

      const bulbasaurWrapper = mount(ShadowEditorCard, {
        props: { entity: createMockEntity('bulbasaur', 1, '1i') }
      });
      const ivysaurWrapper = mount(ShadowEditorCard, {
        props: { entity: createMockEntity('ivysaur', 2, '2i') }
      });
      const venusaurWrapper = mount(ShadowEditorCard, {
        props: { entity: createMockEntity('venusaur', 3, '3i') }
      });

      const bulbasaurSize = parseFloat(bulbasaurWrapper.find('.sprite-frame-wrapper').attributes('style')!.match(/width:\s*([0-9.]+)px/)![1]!);
      const ivysaurSize = parseFloat(ivysaurWrapper.find('.sprite-frame-wrapper').attributes('style')!.match(/width:\s*([0-9.]+)px/)![1]!);
      const venusaurSize = parseFloat(venusaurWrapper.find('.sprite-frame-wrapper').attributes('style')!.match(/width:\s*([0-9.]+)px/)![1]!);

      expect(bulbasaurSize).toBeLessThan(ivysaurSize);
      expect(ivysaurSize).toBeLessThan(venusaurSize);
    });

    it('exports GLOBAL_SHADOW_CONFIG with canonical domain structure and defaults', async () => {
      const { GLOBAL_SHADOW_CONFIG } = await import('@/data/pokemon/pokemonFeetDatabase');
      const { MAX_SHADOW_PIXELATION } = await import('@/types/pokemon/spriteShadows');
      expect(GLOBAL_SHADOW_CONFIG).toBeDefined();
      expect(GLOBAL_SHADOW_CONFIG.widthRatio).toBeGreaterThan(0);
      expect(GLOBAL_SHADOW_CONFIG.heightRatio).toBeGreaterThan(0);
      expect(GLOBAL_SHADOW_CONFIG.pixelation).toBeGreaterThanOrEqual(6);
      expect(MAX_SHADOW_PIXELATION).toBe(50);
    });

    it('dynamically adapts CombatShadow visual dimensions and canvas when previewConfig is passed', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const CombatShadow = (await import('@/components/battle/CombatShadow.vue')).default;
      const { useCombatShadowStore } = await import('@/stores/battle/combatShadows');

      setActivePinia(createPinia());
      const shadowStore = useCombatShadowStore();

      await shadowStore.requestShadow('test_preview_shadow', {
        side: 'generic',
        feetX: 0.5,
        feetY: 0.85,
        entitySize: 200,
        width: '100%',
        isFlying: false,
        visible: true
      });

      const customConfig = {
        widthRatio: 1.2,
        heightRatio: 0.35,
        pixelation: 20
      };

      const wrapper = mount(CombatShadow, {
        props: {
          shadowId: 'test_preview_shadow',
          spriteSize: 200,
          previewConfig: customConfig
        }
      });

      const el = wrapper.find('.pv-combat-shadow');
      expect(el.exists()).toBe(true);

      const html = el.element as HTMLElement;
      // widthPx = (100 / 100) * 200 * 1.0 * 1.2 = 240px
      const widthPx = parseFloat(html.style.width);
      expect(widthPx).toBeCloseTo(240, 2);

      // heightPx = 240 * 0.35 = 84px
      const heightPx = parseFloat(html.style.height);
      expect(heightPx).toBeCloseTo(84, 2);

      // Aspect ratio matches exactly customConfig.heightRatio (1 / 0.35 = 2.857)
      expect(heightPx / widthPx).toBeCloseTo(customConfig.heightRatio, 4);
    });

    it('manages globalShadowConfig and unsaved changes reactively in useShadowEditor', () => {
      const editor = useShadowEditor();

      const initialWidth = editor.globalShadowConfig.value.widthRatio;
      const initialHeight = editor.globalShadowConfig.value.heightRatio;
      const initialPixelation = editor.globalShadowConfig.value.pixelation;

      expect(initialWidth).toBeGreaterThan(0);
      expect(initialHeight).toBeGreaterThan(0);
      expect(initialPixelation).toBeGreaterThanOrEqual(6);
      expect(editor.hasUnsavedChanges.value).toBe(false);

      // Modify widthRatio
      editor.globalShadowConfig.value = { ...editor.globalShadowConfig.value, widthRatio: initialWidth + 0.15 };
      expect(editor.hasUnsavedChanges.value).toBe(true);

      // Restore widthRatio
      editor.globalShadowConfig.value = { ...editor.globalShadowConfig.value, widthRatio: initialWidth };
      expect(editor.hasUnsavedChanges.value).toBe(false);

      // Reset to canonical defaults
      editor.resetGlobalWidthRatio();
      expect(editor.globalShadowConfig.value.widthRatio).toBe(1.0);

      editor.resetGlobalHeightRatio();
      expect(editor.globalShadowConfig.value.heightRatio).toBe(0.28);

      editor.resetGlobalPixelation();
      expect(editor.globalShadowConfig.value.pixelation).toBe(14);
    });
  });

  describe('Shadow Editor Slider Copy & Paste UX', () => {
    it('copies and reads slider values using in-memory fallback and parses comma decimals', async () => {
      const {
        copySliderValue,
        readSliderValue,
        getMemoryClipboardValue,
        clearMemoryClipboard
      } = await import('@/views/dev/utils/shadowEditorClipboard');

      clearMemoryClipboard();
      expect(getMemoryClipboardValue()).toBeNull();

      // Copy a standard numeric value
      await copySliderValue(0.55);
      expect(getMemoryClipboardValue()).toBe(0.55);

      const val = await readSliderValue();
      expect(val).toBe(0.55);

      // Verify comma decimal support via mocked clipboard
      const originalNavigator = globalThis.navigator;
      try {
        Object.defineProperty(globalThis, 'navigator', {
          value: {
            clipboard: {
              writeText: async () => {},
              readText: async () => '0,785'
            }
          },
          configurable: true
        });

        const commaParsed = await readSliderValue();
        expect(commaParsed).toBe(0.785);
      } finally {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          configurable: true
        });
      }

      clearMemoryClipboard();
      expect(getMemoryClipboardValue()).toBeNull();
    });

    it('renders copy and paste emoji buttons on ShadowEditorCard and handles clicks', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const {
        copySliderValue,
        clearMemoryClipboard
      } = await import('@/views/dev/utils/shadowEditorClipboard');
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());
      clearMemoryClipboard();

      const testEntity: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Front/1i.webp',
        name: 'BULBASAUR (M)',
        category: 'pokemon',
        pokemonSpeciesId: requirePokemonSpeciesId('bulbasaur'),
        dexNumber: 1,
        gender: 'M',
        gen: 1,
        view: 'front',
        spriteUrl: '/assets/sprites/pokemon/animated/Front/1i.webp',
        defaultFeetX: 0.5,
        defaultFeetY: 0.9,
        defaultIsFlying: false,
        defaultShadowScale: 1.0
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: testEntity,
          zoom: 2.0
        }
      });

      // Assert 6 buttons: 3 copy (📋), 3 paste (📥)
      const actionBtns = wrapper.findAll('.slider-action-btn');
      expect(actionBtns.length).toBe(6);

      // Check copy button for X
      const copyXBtn = actionBtns[0]!;
      expect(copyXBtn.text()).toBe('📋');
      expect(copyXBtn.attributes('title')).toBe('Copiar valor X');

      // Click copy X
      await copyXBtn.trigger('click');
      expect(copyXBtn.text()).toBe('✅');

      // Prime clipboard with a specific value for paste
      await copySliderValue(0.725);

      // Check paste button for Y (actionBtns[3])
      const pasteYBtn = actionBtns[3]!;
      expect(pasteYBtn.text()).toBe('📥');
      expect(pasteYBtn.attributes('title')).toBe('Pegar valor en Y');

      await pasteYBtn.trigger('click');

      // Verify updateOverride emitted with pasted 0.725 for feetY
      const updateEvents = wrapper.emitted('updateOverride');
      expect(updateEvents).toBeDefined();
      expect(updateEvents?.length).toBeGreaterThan(0);
      const lastCall = updateEvents![updateEvents!.length - 1];
      expect(lastCall).toEqual([
        testEntity.key,
        testEntity.defaultFeetX,
        0.725,
        testEntity.defaultIsFlying,
        testEntity.defaultShadowScale
      ]);
    });

    it('copies and pastes all values at once via footer copy/paste buttons', async () => {
      const { setActivePinia, createPinia } = await import('pinia');
      const { mount } = await import('@vue/test-utils');
      const ShadowEditorCard = (await import('@/views/dev/components/ShadowEditorCard.vue')).default;
      const {
        copyAllValues,
        readAllValues,
        peekMemoryCalibrationSnapshot,
        clearMemoryCalibration
      } = await import('@/views/dev/utils/shadowEditorClipboard');
      const { requirePokemonSpeciesId } = await import('@/data/pokemon/pokedex');

      setActivePinia(createPinia());
      clearMemoryCalibration();
      expect(peekMemoryCalibrationSnapshot()).toBeNull();

      const sampleSnapshot = {
        feetX: 0.58,
        feetY: 0.82,
        isFlying: true,
        shadowScale: 1.45
      };

      await copyAllValues(sampleSnapshot);
      expect(peekMemoryCalibrationSnapshot()).toEqual(sampleSnapshot);

      const readBack = await readAllValues();
      expect(readBack).toEqual(sampleSnapshot);

      const testEntity: PokemonEditorEntity = {
        key: '/assets/sprites/pokemon/animated/Front/1i.webp',
        name: 'BULBASAUR (M)',
        category: 'pokemon',
        pokemonSpeciesId: requirePokemonSpeciesId('bulbasaur'),
        dexNumber: 1,
        gender: 'M',
        gen: 1,
        view: 'front',
        spriteUrl: '/assets/sprites/pokemon/animated/Front/1i.webp',
        defaultFeetX: 0.5,
        defaultFeetY: 0.9,
        defaultIsFlying: false,
        defaultShadowScale: 1.0
      };

      const wrapper = mount(ShadowEditorCard, {
        props: {
          entity: testEntity,
          zoom: 2.0
        }
      });

      const footerBtns = wrapper.findAll('.footer-icon-btn');
      expect(footerBtns.length).toBe(2);

      // Copy all button
      const copyAllBtn = footerBtns[0]!;
      expect(copyAllBtn.attributes('title')).toContain('Copiar todos los valores');
      expect(copyAllBtn.text()).toBe('📋');

      await copyAllBtn.trigger('click');
      expect(copyAllBtn.text()).toBe('✅');
      expect(peekMemoryCalibrationSnapshot()).toEqual({
        feetX: testEntity.defaultFeetX,
        feetY: testEntity.defaultFeetY,
        isFlying: testEntity.defaultIsFlying,
        shadowScale: testEntity.defaultShadowScale
      });

      // Prime clipboard with a different snapshot to test paste
      await copyAllValues(sampleSnapshot);

      // Paste all button
      const pasteAllBtn = footerBtns[1]!;
      expect(pasteAllBtn.attributes('title')).toContain('Pegar todos los valores');
      expect(pasteAllBtn.text()).toBe('📥');

      await pasteAllBtn.trigger('click');

      const updateEvents = wrapper.emitted('updateOverride');
      expect(updateEvents).toBeDefined();
      const lastCall = updateEvents![updateEvents!.length - 1];
      expect(lastCall).toEqual([
        testEntity.key,
        0.58,
        0.82,
        true,
        1.45
      ]);

      clearMemoryCalibration();
    });
  });
});
