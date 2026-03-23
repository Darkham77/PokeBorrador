const fs = require('fs');
const path = require('path');

const moveDataFile = 'd:\\Documentos\\GitHub\\PokeBorrador\\js\\02_pokemon_data.js';
const content = fs.readFileSync(moveDataFile, 'utf8');

const tms = [
    { id: 'TM01', name: 'Puño Certero', type: 'fighting' },
    { id: 'TM02', name: 'Garra Dragón', type: 'dragon' },
    { id: 'TM03', name: 'Hidropulso', type: 'water' },
    { id: 'TM04', name: 'Paz Mental', type: 'psychic' },
    { id: 'TM05', name: 'Rugido', type: 'normal' },
    { id: 'TM06', name: 'Tóxico', type: 'poison' },
    { id: 'TM07', name: 'Granizo', type: 'ice' },
    { id: 'TM08', name: 'Corpulencia', type: 'fighting' },
    { id: 'TM09', name: 'Recurrente', type: 'grass' },
    { id: 'TM10', name: 'Poder Oculto', type: 'normal' },
    { id: 'TM11', name: 'Día Soleado', type: 'fire' },
    { id: 'TM12', name: 'Mofa', type: 'dark' },
    { id: 'TM13', name: 'Rayo Hielo', type: 'ice' },
    { id: 'TM14', name: 'Ventisca', type: 'ice' },
    { id: 'TM15', name: 'Hiperrayo', type: 'normal' },
    { id: 'TM16', name: 'Pantalla de Luz', type: 'psychic' },
    { id: 'TM17', name: 'Protección', type: 'normal' },
    { id: 'TM18', name: 'Danza Lluvia', type: 'water' },
    { id: 'TM19', name: 'Gigadrenado', type: 'grass' },
    { id: 'TM20', name: 'Velo Sagrado', type: 'normal' },
    { id: 'TM21', name: 'Frustración', type: 'normal' },
    { id: 'TM22', name: 'Rayo Solar', type: 'grass' },
    { id: 'TM23', name: 'Cola Férrea', type: 'steel' },
    { id: 'TM24', name: 'Rayo', type: 'electric' },
    { id: 'TM25', name: 'Trueno', type: 'electric' },
    { id: 'TM26', name: 'Terremoto', type: 'ground' },
    { id: 'TM27', name: 'Retribución', type: 'normal' },
    { id: 'TM28', name: 'Excavar', type: 'ground' },
    { id: 'TM29', name: 'Psíquico', type: 'psychic' },
    { id: 'TM30', name: 'Bola Sombra', type: 'ghost' },
    { id: 'TM31', name: 'Demolición', type: 'fighting' },
    { id: 'TM32', name: 'Doble Equipo', type: 'normal' },
    { id: 'TM33', name: 'Reflejo', type: 'psychic' },
    { id: 'TM34', name: 'Onda Voltio', type: 'electric' },
    { id: 'TM35', name: 'Lanzallamas', type: 'fire' },
    { id: 'TM36', name: 'Bomba Lodo', type: 'poison' },
    { id: 'TM37', name: 'Tormenta de Arena', type: 'rock' },
    { id: 'TM38', name: 'Llamarada', type: 'fire' },
    { id: 'TM39', name: 'Tumba Rocas', type: 'rock' },
    { id: 'TM40', name: 'Golpe Aéreo', type: 'flying' },
    { id: 'TM41', name: 'Tormento', type: 'dark' },
    { id: 'TM42', name: 'Imagen', type: 'normal' },
    { id: 'TM43', name: 'Daño Secreto', type: 'normal' },
    { id: 'TM44', name: 'Descanso', type: 'psychic' },
    { id: 'TM45', name: 'Atracción', type: 'normal' },
    { id: 'TM46', name: 'Ladrón', type: 'dark' },
    { id: 'TM47', name: 'Ala de Acero', type: 'steel' },
    { id: 'TM48', name: 'Intercambio', type: 'psychic' },
    { id: 'TM49', name: 'Robo', type: 'dark' },
    { id: 'TM50', name: 'Sofoco', type: 'fire' }
];

console.log("Checking missing moves in MOVE_DATA...");
tms.forEach(tm => {
    // Escape special characters for simple regex check
    const escapedName = tm.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`['"]${escapedName}['"]\\s*:`, 'i');
    if (!regex.test(content)) {
        console.log(`[MISSING] ${tm.name}`);
    }
});
