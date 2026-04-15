const fs = require('fs');

try {
  let content = fs.readFileSync('js/02_pokemon_data.js', 'utf8');

  content = content.replace(/'Bofetón Lodo':\s*\{\s*power:\s*20,\s*acc:\s*100,\s*type:\s*'normal',\s*cat:\s*'special',\s*pp:\s*20\s*\}/g,
    `'Bofetón Lodo': { power: 20, acc: 100, type: 'ground', cat: 'special', pp: 20, effect: 'stat_down_enemy_acc' }`);

  content = content.replace(/'Triturar':\s*\{\s*power:\s*80,\s*acc:\s*100,\s*type:\s*'dark',\s*cat:\s*'physical',\s*pp:\s*15\s*\}/g,
    `'Triturar': { power: 80, acc: 100, type: 'dark', cat: 'physical', pp: 15, effect: 'stat_down_enemy_spd_20' }`);

  content = content.replace(/'Bucle Arena':\s*\{\s*power:\s*35,\s*acc:\s*85,\s*type:\s*'ground',\s*cat:\s*'physical',\s*pp:\s*15\s*\}/g,
    `'Bucle Arena': { power: 35, acc: 85, type: 'ground', cat: 'physical', pp: 15, effect: 'bind' }`);

  content = content.replace(/'Furia':\s*\{\s*power:\s*15,\s*acc:\s*85,\s*type:\s*'normal',\s*cat:\s*'physical',\s*pp:\s*20\s*\}/g,
    `'Furia': { power: 20, acc: 100, type: 'normal', cat: 'physical', pp: 20, effect: 'rage' }`);

  content = content.replace(/'Giro Fuego':\s*\{\s*power:\s*35,\s*acc:\s*85,\s*type:\s*'fire',\s*cat:\s*'special',\s*pp:\s*15\s*\}/g,
    `'Giro Fuego': { power: 35, acc: 85, type: 'fire', cat: 'special', pp: 15, effect: 'bind' }`);

  content = content.replace(/'Ventisca':\s*\{\s*power:\s*110,\s*acc:\s*70,\s*type:\s*'ice',\s*cat:\s*'special',\s*pp:\s*5\s*\}/g,
    `'Ventisca': { power: 110, acc: 70, type: 'ice', cat: 'special', pp: 5, effect: 'freeze_10' }`);

  content = content.replace(/'Ala de Acero':\s*\{\s*power:\s*70,\s*acc:\s*90,\s*type:\s*'steel',\s*cat:\s*'physical',\s*pp:\s*25\s*\}/g,
    `'Ala de Acero': { power: 70, acc: 90, type: 'steel', cat: 'physical', pp: 25, effect: 'stat_up_self_def_10' }`);

  content = content.replace(/'Doble Ataque':\s*\{\s*power:\s*25,\s*acc:\s*95,\s*type:\s*'bug',\s*cat:\s*'physical',\s*pp:\s*20\s*\}/g,
    `'Doble Ataque': { power: 25, acc: 95, type: 'bug', cat: 'physical', pp: 20, hits: 2, effect: 'poison_20' }`);

  content = content.replace(/'Cola Férrea':\s*\{\s*power:\s*100,\s*acc:\s*75,\s*type:\s*'steel',\s*cat:\s*'physical',\s*pp:\s*15\s*\}/g,
    `'Cola Férrea': { power: 100, acc: 75, type: 'steel', cat: 'physical', pp: 15, effect: 'stat_down_enemy_def_30' }`);
    
  // Add 'future_sight_simple' to Premonición so it stops complaining in sync.
  content = content.replace(/'Premonición':\s*\{\s*power:\s*100,\s*acc:\s*100,\s*type:\s*'psychic',\s*cat:\s*'special',\s*pp:\s*15\s*\}/g,
    `'Premonición': { power: 120, acc: 100, type: 'psychic', cat: 'special', pp: 10, effect: 'future_sight_simple' }`);

  fs.writeFileSync('js/02_pokemon_data.js', content);
  console.log("Replaced successfully.");
} catch (e) {
  console.error(e);
}
