const fs = require('fs');

// Mocks
global.window = {};
global.document = {
    getElementById: (id) => {
        if (!global.mockDOM[id]) {
            global.mockDOM[id] = { innerHTML: '', classList: { toggle: () => {} }, style: {}, appendChild: function(el) { this.children.push(el); }, children: [] };
        }
        return global.mockDOM[id];
    },
    createElement: (tag) => {
        let el = { tag, style: {}, children: [], appendChild: function(c) { this.children.push(c); }, classList: { toggle: () => {} }, querySelector: () => ({ addEventListener: () => {}, onchange: null }), toString: () => `[Element ${tag}]` };
        return el;
    }
};
global.mockDOM = {};

// Estado falso
global.state = {
    inventory: { 'Poción': 5, 'Super Poción': 2, 'Gema Dominante': 1 }, 
    box: []
};

// Items DB mock
global.window.SHOP_ITEMS = [
    { name: 'Poción', sprite: 'potion.png' },
    { name: 'Super Poción', sprite: 'super.png' }
];

// Cargar script
const source = fs.readFileSync('./js/23_market.js', 'utf8');
eval(source);

// Execution
console.log("--- INICIANDO TEST UNITARIO: renderPublishTab (Items Grid) ---");
_omPublishType = 'item';
_omSelectedData = null;

try {
    renderPublishTab();
    const container = document.getElementById('om-publish-selectors');
    
    if (container.children.length === 0) throw new Error("No se montó ningún DOM en el contenedor.");
    
    const grid = container.children[0];
    if (grid.tag !== 'div') throw new Error("Se esperaba un <div> (Grid) en vez de un listado <select>.");
    
    if (grid.children.length !== 2) throw new Error(`Se esperaban 2 ítems vendibles. Se filtró o renderizó mal. (Se generaron ${grid.children.length})`);
    
    const htmlPocion = grid.children[0].innerHTML;
    if (!htmlPocion.includes('potion.png')) throw new Error("Las imágenes (sprites) de los items no se vincularon correctamente.");

    // Test Selection
    grid.children[0].onclick(); // Simula click en poción
    if (!_omSelectedData || _omSelectedData.name !== 'Poción') throw new Error("El click en la celda del item no conectó con el State Global.");
    
    if (_omSelectedData.max !== 5) throw new Error("El límite máximo de ítems a vender no reconoce tu stock en inventario.");

    console.log("✅ TEST OK: El Grid CSS renderiza, extrae las URLs desde SHOP_ITEMS, e inyecta la cantidad máxima perfecta a vender.");
} catch(e) {
    console.error("❌ TEST FALLIDO:", e.message);
    process.exit(1);
}
