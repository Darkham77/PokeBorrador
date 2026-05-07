const fs = require('fs');
const path = require('path');

/**
 * POPULATE TESTER INVENTORY
 * Quick script to add a set of common testing items to the player's inventory.
 * Usage: node .agents/skills/populate-tester-inventory/scripts/populate_inventory.js
 */

const SAVE_PATH = path.join(__dirname, '../../../../src/data/state.json'); // Legacy local state if used

function populateInventory() {
    console.log("Populating tester inventory...");
    
    // In a real scenario, this would interact with the DBRouter or the gameStore
    // But as a skill script, it can generate a snippet for the browser console.
    
    const items = {
        'Poción': 99,
        'Superpoción': 99,
        'Hiperpoción': 99,
        'Restaurar Todo': 99,
        'Revivir': 99,
        'Antídoto': 99,
        'Despertar': 99,
        ' antiquemar': 99,
        'Antihielo': 99,
        'Cura Total': 99,
        'Éter': 99,
        'Éter Máximo': 99,
        'Elixir': 99,
        'Elixir Máximo': 99,
        'Piedra Fuego': 10,
        'Piedra Agua': 10,
        'Piedra Trueno': 10,
        'Piedra Hoja': 10,
        'Piedra Lunar': 10,
        'Piedra Solar': 10,
        'Caramelo Raro': 99,
        'Subida de PP': 50,
        'PP Máximo': 10,
        'Repelente': 20,
        'Superrepelente': 20,
        'Máximo Repelente': 20
    };

    const snippet = `
Object.entries(${JSON.stringify(items)}).forEach(([name, qty]) => {
    window.gameStore.state.inventory[name] = (window.gameStore.state.inventory[name] || 0) + qty;
});
window.gameStore.save();
console.log('✅ Tester inventory populated!');
    `;

    console.log("\nCopy and paste this into the browser console:\n");
    console.log(snippet);
}

populateInventory();
