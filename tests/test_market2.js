const fs = require('fs');

// Mocks
global.window = {};
global.document = {
    getElementById: (id) => {
        if (!global.mockDOM[id]) {
            global.mockDOM[id] = { 
                innerHTML: '', style: {}, 
                appendChild: function(el) { this.children.push(el); }, 
                children: [], 
                classList: { toggle: () => {} } 
            };
        }
        return global.mockDOM[id];
    },
    createElement: (tag) => ({ 
        tag, style: {}, children: [], 
        appendChild: function(c) { this.children.push(c); }, 
        classList: { toggle: () => {} }, 
        querySelector: () => ({ addEventListener: () => {} }) 
    })
};
global.mockDOM = {};

// Estado falso
global.state = {
    inventory: { 'Pocion': 5, 'Super Pocion': 2 }, 
    box: []
};

// Items DB mock
global.window.SHOP_ITEMS = [
    { name: 'Pocion', sprite: 'img.png' }, 
    { name: 'Super Pocion', sprite: 'img2.png' }
];

// Cargar script
eval(fs.readFileSync('./js/23_market.js', 'utf8'));

console.log("--- INICIANDO TEST UNITARIO: renderPublishTab (Items Grid) ---");

try {
    switchPublishType('item'); // Fuerza la generación UI de la variante items
    
    const c = document.getElementById('om-publish-selectors');
    if (c.children.length === 0) throw new Error('Cero hijos generados en el DOM central.');
    
    const grid = c.children[0];
    if (grid.children.length !== 2) throw new Error("Se esperaban 2 ítems en la grilla. Encontrados: " + grid.children.length);
    
    // Simulate Click
    grid.children[0].onclick();
    
    if (_omSelectedData.name !== 'Pocion') throw new Error("Variable SelectedData falló en registrar.");
    
    console.log("✅ TEST OK: Todas las aserciones nativas pasaron.");
} catch(e) {
    console.error("❌ TEST FALLIDO:", e.message);
    process.exit(1);
}
