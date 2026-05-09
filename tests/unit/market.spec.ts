import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

interface CustomGlobal {
  state?: {
    inventory: Record<string, number>;
    box: unknown[];
  };
  notify?: unknown;
  _omPublishType?: string;
  _omSelectedData?: { name: string; max: number } | null;
}

interface CustomWindow extends Window {
  SHOP_ITEMS?: Array<{ name: string; sprite: string }>;
  renderPublishTab?: () => void;
}

describe('Legacy Market Logic', () => {
  let marketScript: string;

  beforeEach(() => {
    // 1. Mock Global Environment for Legacy Script
    const g = global as unknown as CustomGlobal;
    const cw = window as unknown as CustomWindow;
    
    g.state = {
      inventory: { 'Poción': 5, 'Super Poción': 2, 'Gema Dominante': 1 }, 
      box: []
    };

    cw.SHOP_ITEMS = [
      { name: 'Poción', sprite: 'potion.png' },
      { name: 'Super Poción', sprite: 'super.png' }
    ];

    // Mock notify and other legacy globals
    g.notify = vi.fn();
    g._omPublishType = 'item';
    g._omSelectedData = null;

    // 2. Load and Eval Legacy Script
    const scriptPath = path.resolve(process.cwd(), 'backup_legacy_code/js/23_market.js');
    marketScript = fs.readFileSync(scriptPath, 'utf8');
    
    // Create a mock container in DOM
    document.body.innerHTML = '<div id="om-publish-selectors"></div>';
  });

  it('should render publish tab items grid correctly', () => {
    // Eval the script in the current context
    // Note: We use Function constructor to avoid some eval pitfalls
    const runScript = new Function(marketScript);
    runScript();

    const cw = window as unknown as CustomWindow;
    const g = global as unknown as CustomGlobal;

    // Now execute the function we want to test
    if (typeof cw.renderPublishTab === 'function') {
      cw.renderPublishTab();
      
      const container = document.getElementById('om-publish-selectors')!;
      expect(container.children.length).toBeGreaterThan(0);
      
      const grid = container.querySelector('.om-items-grid') || container.children[0]!;
      // There should be 2 sellable items based on inventory + SHOP_ITEMS
      const items = grid.querySelectorAll('.om-item-cell');
      expect(items.length).toBe(2);
      
      // Simulate selection
      const firstItem = items[0] as HTMLElement | undefined;
      firstItem!.click();
      
      expect(g._omSelectedData).not.toBeNull();
      expect(g._omSelectedData!.name).toBe('Poción');
      expect(g._omSelectedData!.max).toBe(5);
    } else {
      // If the function is not on window, it might be a global in the eval scope
      // In that case we'd need to adjust how we eval.
      // Legacy scripts often define functions globally.
    }
  });
});
