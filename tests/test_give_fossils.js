// Test script to grant fossils for testing
if (typeof state !== 'undefined' && state.inventory) {
    state.inventory['Fósil Hélix'] = (state.inventory['Fósil Hélix'] || 0) + 1;
    state.inventory['Fósil Domo'] = (state.inventory['Fósil Domo'] || 0) + 1;
    state.inventory['Ámbar Viejo'] = (state.inventory['Ámbar Viejo'] || 0) + 1;
    console.log("Fósiles añadidos al inventario para pruebas.");
    if (typeof renderBag === 'function') renderBag();
} else {
    console.log("No se pudo encontrar el estado del juego.");
}
