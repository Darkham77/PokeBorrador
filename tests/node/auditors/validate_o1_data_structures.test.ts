import { describe, it, expect } from 'vitest';
import { scanFileForO1Issues } from '@/../scripts/auditors/domain_data/validate_o1_data_structures';

describe('validate_o1_data_structures (O(1) Data Structure Auditor)', () => {
  describe('Static Catalog Linear Scans (o1-catalog-lookup)', () => {
    it('detects SHOP_ITEMS.find() and reports O(1) ITEMS_BY_ID suggestion', () => {
      const code = `
        const item = SHOP_ITEMS.find(i => i.id === itemId);
      `;
      const issues = scanFileForO1Issues('src/components/MyComponent.vue', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-catalog-lookup');
      expect(issues[0]!.message).toContain('SHOP_ITEMS');
      expect(issues[0]!.message).toContain('ITEMS_BY_ID');
      expect(issues[0]!.isWarning).toBe(true);
    });

    it('detects FIRE_RED_MAPS.find() and reports O(1) MAPS_BY_ROUTE_ID suggestion', () => {
      const code = `
        const map = FIRE_RED_MAPS.find(m => m.id === locationId);
      `;
      const issues = scanFileForO1Issues('src/logic/battle/myHelper.ts', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-catalog-lookup');
      expect(issues[0]!.message).toContain('FIRE_RED_MAPS');
      expect(issues[0]!.message).toContain('MAPS_BY_ROUTE_ID');
    });

    it('detects NICK_STYLES.find() and AVATAR_STYLES.filter()', () => {
      const code = `
        const nick = NICK_STYLES.find(n => n.id === styleId);
        const avatars = AVATAR_STYLES.filter(a => a.class === userClass);
      `;
      const issues = scanFileForO1Issues('src/stores/myStore.ts', code);
      expect(issues.length).toBe(2);
      expect(issues[0]!.ruleId).toBe('o1-catalog-lookup');
      expect(issues[1]!.ruleId).toBe('o1-catalog-lookup');
    });

    it('detects CLASS_MISSIONS, RANKED_REWARD_MILESTONES, GAME_TMS, and GYMS linear scans', () => {
      const code = `
        const mission = CLASS_MISSIONS.find(m => m.id === id);
        const reward = RANKED_REWARD_MILESTONES.find(r => r.id === rId);
        const tm = GAME_TMS.find(t => t.id === tmId);
        const gym = GYMS.find(g => g.id === gymId);
      `;
      const issues = scanFileForO1Issues('src/views/MyView.vue', code);
      expect(issues.length).toBe(4);
      for (const issue of issues) {
        expect(issue.ruleId).toBe('o1-catalog-lookup');
      }
    });

    it('does NOT trigger on defining file of the catalog (zero false positive on self-definition)', () => {
      const code = `
        export const ITEMS_BY_ID = Object.fromEntries(SHOP_ITEMS.map(i => [i.id, i]));
      `;
      const issues = scanFileForO1Issues('src/data/inventory/items.ts', code);
      expect(issues.length).toBe(0);
    });

    it('does NOT trigger when using proper O(1) dictionary access', () => {
      const code = `
        const item = ITEMS_BY_ID[requireItemId(itemId)];
        const map = MAPS_BY_ROUTE_ID[requireMapRouteId(locId)];
        const mission = CLASS_MISSIONS_BY_ID[missionId];
      `;
      const issues = scanFileForO1Issues('src/stores/myStore.ts', code);
      expect(issues.length).toBe(0);
    });
  });

  describe('Team + Box Spread Lookups (o1-pokemon-lookup)', () => {
    it('detects [...team, ...box].find() spread anti-pattern', () => {
      const code = `
        const p = [...team, ...box].find(x => x.uid === targetUid);
      `;
      const issues = scanFileForO1Issues('src/components/MyComponent.vue', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-pokemon-lookup');
      expect(issues[0]!.message).toContain('gameStore.getPokemonByUid');
    });

    it('detects [...gameStore.state.team, ...gameStore.state.box].filter() anti-pattern', () => {
      const code = `
        const all = [...gameStore.state.team, ...gameStore.state.box].filter(p => p !== null);
      `;
      const issues = scanFileForO1Issues('src/stores/myStore.ts', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-pokemon-lookup');
    });

    it('does NOT trigger on canonical O(1) gameStore.getPokemonByUid()', () => {
      const code = `
        const pokeEntry = gameStore.getPokemonByUid(targetUid);
      `;
      const issues = scanFileForO1Issues('src/components/MyComponent.vue', code);
      expect(issues.length).toBe(0);
    });
  });

  describe('Static Array Constant .includes() (o1-linear-membership)', () => {
    it('detects HEAL_ITEM_IDS.includes(id)', () => {
      const code = `
        if (HEAL_ITEM_IDS.includes(itemId)) { return true; }
      `;
      const issues = scanFileForO1Issues('src/logic/inventory/useItem.ts', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-linear-membership');
      expect(issues[0]!.message).toContain('ReadonlySet');
    });

    it('does NOT trigger on Set.has() O(1) membership check', () => {
      const code = `
        if (HEAL_ITEM_IDS_SET.has(itemId)) { return true; }
      `;
      const issues = scanFileForO1Issues('src/logic/inventory/useItem.ts', code);
      expect(issues.length).toBe(0);
    });
  });

  describe('Object.keys / Object.values linear find (o1-object-scan)', () => {
    it('detects Object.values(NATURE_DATA).find()', () => {
      const code = `
        const nature = Object.values(NATURE_DATA).find(n => n.name === targetName);
      `;
      const issues = scanFileForO1Issues('src/components/BattleCard.vue', code);
      expect(issues.length).toBe(1);
      expect(issues[0]!.ruleId).toBe('o1-object-scan');
    });

    it('does NOT trigger on direct property lookup record[key]', () => {
      const code = `
        const nature = NATURE_DATA[natureId];
      `;
      const issues = scanFileForO1Issues('src/components/BattleCard.vue', code);
      expect(issues.length).toBe(0);
    });
  });

  describe('Escape Hatch Support (// o1-ok, // linear-search-ok, // domain-ok)', () => {
    it('ignores marked lines with // o1-ok without false positives', () => {
      const code = `
        const item = SHOP_ITEMS.find(i => i.id === itemId); // o1-ok
      `;
      const issues = scanFileForO1Issues('src/components/MyComponent.vue', code);
      expect(issues.length).toBe(0);
    });

    it('ignores marked lines with // linear-search-ok', () => {
      const code = `
        const target = [...team, ...box].find(p => p.uid === uid); // linear-search-ok
      `;
      const issues = scanFileForO1Issues('src/components/MyComponent.vue', code);
      expect(issues.length).toBe(0);
    });
  });
});
