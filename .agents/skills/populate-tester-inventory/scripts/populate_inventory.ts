import type { ItemId } from '../../../../src/types/items';

/**
 * POPULATE TESTER INVENTORY
 * Utility script to generate a console snippet for adding standard testing items
 * to the player's inventory using canonical Showdown ItemIds.
 *
 * Usage: npm run test:populate-inventory
 */

const TEST_INVENTORY: Record<ItemId, number> = {
  potion: 99,
  superpotion: 99,
  hyperpotion: 99,
  maxpotion: 99,
  revive: 99,
  maxrevive: 99,
  antidote: 99,
  burnheal: 99,
  awakening: 99,
  fullheal: 99,
  ether: 99,
  maxelixir: 99,
  firestone: 10,
  waterstone: 10,
  thunderstone: 10,
  leafstone: 10,
  moonstone: 10,
  sunstone: 10,
  rarecandy: 99,
  ppup: 50,
  ppmax: 10,
  repel: 20,
  superrepel: 20,
  maxrepel: 20,
};

function generatePopulateSnippet(): void {
  console.log('='.repeat(70));
  console.log('  POKÉ VICIO - TESTER INVENTORY GENERATOR');
  console.log('='.repeat(70));
  console.log(`Generated canonical testing payload for ${Object.keys(TEST_INVENTORY).length} item types.`);
  console.log('\nCopy and paste this snippet into the browser DevTools console:\n');

  const snippet = `(() => {
  const items = ${JSON.stringify(TEST_INVENTORY, null, 2)};
  const debug = window.__VITE_DEBUG__;
  if (!debug || !debug.getGameStore) {
    console.error('❌ __VITE_DEBUG__ is not available. Ensure you are running in dev mode.');
    return;
  }
  const gameStore = debug.getGameStore();
  if (!gameStore || !gameStore.state) {
    console.error('❌ gameStore is not initialized.');
    return;
  }
  if (!gameStore.state.inventory) {
    gameStore.state.inventory = {};
  }
  Object.entries(items).forEach(([id, qty]) => {
    gameStore.state.inventory[id] = (gameStore.state.inventory[id] || 0) + qty;
  });
  gameStore.state.inventory = { ...gameStore.state.inventory };
  gameStore.saveGame();
  console.log('✅ Tester inventory successfully populated with 24 canonical Showdown item sets!');
})();`;

  console.log(snippet);
  console.log('\n' + '='.repeat(70) + '\n');
}

generatePopulateSnippet();
