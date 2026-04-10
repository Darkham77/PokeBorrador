    // ===== POKEMON DATA =====
    // learnset: [{lv, name, power, pp}]  — only lv-up moves (Gen 1 official)
    const POKEMON_DB = {
      bulbasaur: {
        name: 'Bulbasaur', emoji: '🌿', type: 'grass', hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 4, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Drenadoras', pp: 10 }, { lv: 10, name: 'Látigo Cepa', pp: 25 }, { lv: 15, name: 'Polvo Veneno', pp: 35 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 20, name: 'Derribo', pp: 20 }, { lv: 25, name: 'Hoja Afilada', pp: 25 }, { lv: 32, name: 'Dulce Aroma', pp: 20 }, { lv: 39, name: 'Desarrollo', pp: 40 }, { lv: 46, name: 'Rayo Solar', pp: 10 }]
      },
      ivysaur: {
        name: 'Ivysaur', emoji: '🌿', type: 'grass', hp: 60, atk: 62, def: 63, spa: 80, spd: 80, spe: 60,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Drenadoras', pp: 10 }, { lv: 4, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Drenadoras', pp: 10 }, { lv: 10, name: 'Látigo Cepa', pp: 25 }, { lv: 15, name: 'Polvo Veneno', pp: 35 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 22, name: 'Derribo', pp: 20 }, { lv: 29, name: 'Hoja Afilada', pp: 25 }, { lv: 38, name: 'Dulce Aroma', pp: 20 }, { lv: 47, name: 'Desarrollo', pp: 40 }, { lv: 56, name: 'Rayo Solar', pp: 10 }]
      },
      venusaur: {
        name: 'Venusaur', emoji: '🌿', type: 'grass', hp: 80, atk: 82, def: 83, spa: 100, spd: 100, spe: 80,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Drenadoras', pp: 10 }, { lv: 1, name: 'Látigo Cepa', pp: 25 }, { lv: 4, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Drenadoras', pp: 10 }, { lv: 10, name: 'Látigo Cepa', pp: 25 }, { lv: 15, name: 'Polvo Veneno', pp: 35 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 22, name: 'Derribo', pp: 20 }, { lv: 29, name: 'Hoja Afilada', pp: 25 }, { lv: 41, name: 'Dulce Aroma', pp: 20 }, { lv: 53, name: 'Desarrollo', pp: 40 }, { lv: 70, name: 'Rayo Solar', pp: 10 }]
      },
      charmander: {
        name: 'Charmander', emoji: '🔥', type: 'fire', hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Garra Metal', pp: 35 }, { lv: 19, name: 'Pantalla Humo', pp: 20 }, { lv: 25, name: 'Furia Dragón', pp: 10 }, { lv: 31, name: 'Cara Susto', pp: 10 }, { lv: 37, name: 'Lanzallamas', pp: 15 }, { lv: 43, name: 'Cuchillada', pp: 20 }, { lv: 49, name: 'Giro Fuego', pp: 15 }, { lv: 55, name: 'Llamarada', pp: 5 }]
      },
      charmeleon: {
        name: 'Charmeleon', emoji: '🔥', type: 'fire', hp: 58, atk: 64, def: 58, spa: 80, spd: 65, spe: 80,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Ascuas', pp: 25 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Garra Metal', pp: 35 }, { lv: 20, name: 'Pantalla Humo', pp: 20 }, { lv: 27, name: 'Furia Dragón', pp: 10 }, { lv: 34, name: 'Cara Susto', pp: 10 }, { lv: 41, name: 'Lanzallamas', pp: 15 }, { lv: 48, name: 'Cuchillada', pp: 20 }, { lv: 55, name: 'Giro Fuego', pp: 15 }, { lv: 62, name: 'Llamarada', pp: 5 }]
      },
      charizard: {
        name: 'Charizard', emoji: '🔥', type: 'fire', hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Ascuas', pp: 25 }, { lv: 1, name: 'Garra Metal', pp: 35 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Garra Metal', pp: 35 }, { lv: 20, name: 'Pantalla Humo', pp: 20 }, { lv: 27, name: 'Furia Dragón', pp: 10 }, { lv: 34, name: 'Cara Susto', pp: 10 }, { lv: 36, name: 'Ataque Ala', pp: 35 }, { lv: 44, name: 'Lanzallamas', pp: 15 }, { lv: 54, name: 'Cuchillada', pp: 20 }, { lv: 64, name: 'Giro Fuego', pp: 15 }, { lv: 74, name: 'Llamarada', pp: 5 }]
      },
      squirtle: {
        name: 'Squirtle', emoji: '💧', type: 'water', hp: 44, atk: 48, def: 65, spa: 50, spd: 64, spe: 43,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 4, name: 'Látigo', pp: 30 }, { lv: 7, name: 'Burbuja', pp: 30 }, { lv: 10, name: 'Refugio', pp: 40 }, { lv: 13, name: 'Pistola Agua', pp: 25 }, { lv: 18, name: 'Mordisco', pp: 25 }, { lv: 23, name: 'Giro Rápido', pp: 40 }, { lv: 28, name: 'Protección', pp: 10 }, { lv: 33, name: 'Danza Lluvia', pp: 5 }, { lv: 40, name: 'Cabezazo', pp: 15 }, { lv: 47, name: 'Hidrobomba', pp: 5 }]
      },
      wartortle: {
        name: 'Wartortle', emoji: '💧', type: 'water', hp: 59, atk: 63, def: 80, spa: 65, spd: 80, spe: 58,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Burbuja', pp: 30 }, { lv: 4, name: 'Látigo', pp: 30 }, { lv: 7, name: 'Burbuja', pp: 30 }, { lv: 10, name: 'Refugio', pp: 40 }, { lv: 13, name: 'Pistola Agua', pp: 25 }, { lv: 19, name: 'Mordisco', pp: 25 }, { lv: 25, name: 'Giro Rápido', pp: 40 }, { lv: 31, name: 'Protección', pp: 10 }, { lv: 37, name: 'Danza Lluvia', pp: 5 }, { lv: 45, name: 'Cabezazo', pp: 15 }, { lv: 53, name: 'Hidrobomba', pp: 5 }]
      },
      blastoise: {
        name: 'Blastoise', emoji: '💧', type: 'water', hp: 79, atk: 83, def: 100, spa: 85, spd: 105, spe: 78,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Refugio', pp: 40 }, { lv: 4, name: 'Látigo', pp: 30 }, { lv: 7, name: 'Burbuja', pp: 30 }, { lv: 10, name: 'Refugio', pp: 40 }, { lv: 13, name: 'Pistola Agua', pp: 25 }, { lv: 19, name: 'Mordisco', pp: 25 }, { lv: 25, name: 'Giro Rápido', pp: 40 }, { lv: 31, name: 'Protección', pp: 10 }, { lv: 42, name: 'Danza Lluvia', pp: 5 }, { lv: 55, name: 'Cabezazo', pp: 15 }, { lv: 68, name: 'Hidrobomba', pp: 5 }]
      },
      caterpie: {
        name: 'Caterpie', emoji: '🐛', type: 'bug', hp: 45, atk: 30, def: 35, spa: 20, spd: 20, spe: 45,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Disparo Demora', pp: 40 }]
      },
      metapod: {
        name: 'Metapod', emoji: '🐛', type: 'bug', hp: 50, atk: 20, def: 55, spa: 25, spd: 25, spe: 30,
        learnset: [{ lv: 1, name: 'Fortaleza', pp: 30 }, { lv: 7, name: 'Fortaleza', pp: 30 }]
      },
      butterfree: {
        name: 'Butterfree', emoji: '🦋', type: 'bug', hp: 60, atk: 45, def: 50, spa: 90, spd: 80, spe: 70,
        learnset: [{ lv: 1, name: 'Confusión', pp: 25 }, { lv: 10, name: 'Confusión', pp: 25 }, { lv: 13, name: 'Polvo Veneno', pp: 35 }, { lv: 14, name: 'Paralizador', pp: 30 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 18, name: 'Supersónico', pp: 20 }, { lv: 23, name: 'Tornado', pp: 35 }, { lv: 28, name: 'Psicorrayo', pp: 20 }, { lv: 34, name: 'Velo Sagrado', pp: 25 }, { lv: 40, name: 'Rayo Solar', pp: 10 }, { lv: 47, name: 'Gigadrenado', pp: 10 }]
      },
      weedle: {
        name: 'Weedle', emoji: '🪲', type: 'bug', hp: 40, atk: 35, def: 30, spa: 20, spd: 20, spe: 50,
        learnset: [{ lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 1, name: 'Disparo Demora', pp: 40 }]
      },
      kakuna: {
        name: 'Kakuna', emoji: '🪲', type: 'bug', hp: 45, atk: 25, def: 50, spa: 25, spd: 25, spe: 35,
        learnset: [{ lv: 1, name: 'Fortaleza', pp: 30 }, { lv: 7, name: 'Fortaleza', pp: 30 }]
      },
      beedrill: {
        name: 'Beedrill', emoji: '🐝', type: 'bug', hp: 65, atk: 80, def: 40, spa: 45, spd: 80, spe: 75,
        learnset: [{ lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 10, name: 'Picotazo Veneno', pp: 35 }, { lv: 15, name: 'Ataque Furia', pp: 20 }, { lv: 20, name: 'Foco Energía', pp: 30 }, { lv: 25, name: 'Doble Ataque', pp: 20 }, { lv: 30, name: 'Agilidad', pp: 30 }, { lv: 35, name: 'Pin Misil', pp: 20 }, { lv: 40, name: 'Esfuerzo', pp: 5 }]
      },
      pidgey: {
        name: 'Pidgey', emoji: '🐦', type: 'normal', hp: 40, atk: 45, def: 40, spa: 35, spd: 35, spe: 56,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 5, name: 'Ataque Arena', pp: 15 }, { lv: 9, name: 'Tornado', pp: 35 }, { lv: 13, name: 'Ataque Rápido', pp: 30 }, { lv: 19, name: 'Remolino', pp: 20 }, { lv: 25, name: 'Ataque Ala', pp: 35 }, { lv: 31, name: 'Agilidad', pp: 30 }, { lv: 39, name: 'Espejo', pp: 20 }]
      },
      pidgeotto: {
        name: 'Pidgeotto', emoji: '🐦', type: 'normal', hp: 63, atk: 60, def: 55, spa: 50, spd: 50, spe: 71,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 5, name: 'Ataque Arena', pp: 15 }, { lv: 9, name: 'Tornado', pp: 35 }, { lv: 13, name: 'Ataque Rápido', pp: 30 }, { lv: 20, name: 'Remolino', pp: 20 }, { lv: 27, name: 'Ataque Ala', pp: 35 }, { lv: 34, name: 'Agilidad', pp: 30 }, { lv: 43, name: 'Espejo', pp: 20 }]
      },
      pidgeot: {
        name: 'Pidgeot', emoji: '🐦', type: 'normal', hp: 83, atk: 80, def: 75, spa: 70, spd: 70, spe: 91,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 5, name: 'Ataque Arena', pp: 15 }, { lv: 9, name: 'Tornado', pp: 35 }, { lv: 13, name: 'Ataque Rápido', pp: 30 }, { lv: 20, name: 'Remolino', pp: 20 }, { lv: 27, name: 'Ataque Ala', pp: 35 }, { lv: 34, name: 'Agilidad', pp: 30 }, { lv: 48, name: 'Espejo', pp: 20 }]
      },
      rattata: {
        name: 'Rattata', emoji: '🐭', type: 'normal', hp: 30, atk: 56, def: 35, spa: 25, spd: 35, spe: 72,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 7, name: 'Ataque Rápido', pp: 30 }, { lv: 10, name: 'Foco Energía', pp: 30 }, { lv: 13, name: 'Hiper Colmillo', pp: 15 }, { lv: 20, name: 'Esfuerzo', pp: 5 }, { lv: 27, name: 'Persecución', pp: 20 }, { lv: 34, name: 'Súper Colmillo', pp: 10 }]
      },
      raticate: {
        name: 'Raticate', emoji: '🐭', type: 'normal', hp: 55, atk: 81, def: 60, spa: 50, spd: 70, spe: 97,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 7, name: 'Ataque Rápido', pp: 30 }, { lv: 10, name: 'Foco Energía', pp: 30 }, { lv: 13, name: 'Hiper Colmillo', pp: 15 }, { lv: 20, name: 'Esfuerzo', pp: 5 }, { lv: 30, name: 'Persecución', pp: 20 }, { lv: 40, name: 'Súper Colmillo', pp: 10 }]
      },
      spearow: {
        name: 'Spearow', emoji: '🐦', type: 'normal', hp: 40, atk: 60, def: 30, spa: 31, spd: 31, spe: 70,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 20 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Malicioso', pp: 30 }, { lv: 15, name: 'Furia', pp: 20 }, { lv: 22, name: 'Espejo', pp: 20 }, { lv: 29, name: 'Pico Taladro', pp: 20 }, { lv: 36, name: 'Agilidad', pp: 30 }]
      },
      fearow: {
        name: 'Fearow', emoji: '🐦', type: 'normal', hp: 65, atk: 90, def: 65, spa: 61, spd: 61, spe: 100,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 20 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 9, name: 'Malicioso', pp: 30 }, { lv: 15, name: 'Furia', pp: 20 }, { lv: 25, name: 'Espejo', pp: 20 }, { lv: 34, name: 'Pico Taladro', pp: 20 }, { lv: 43, name: 'Agilidad', pp: 30 }]
      },
      ekans: {
        name: 'Ekans', emoji: '🐍', type: 'poison', hp: 35, atk: 60, def: 44, spa: 40, spd: 54, spe: 55,
        learnset: [{ lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 8, name: 'Picotazo Veneno', pp: 35 }, { lv: 13, name: 'Mordisco', pp: 25 }, { lv: 20, name: 'Deslumbrar', pp: 30 }, { lv: 25, name: 'Chirrido', pp: 40 }, { lv: 32, name: 'Ácido', pp: 30 }, { lv: 37, name: 'Bomba Lodo', pp: 10 }]
      },
      arbok: {
        name: 'Arbok', emoji: '🐍', type: 'poison', hp: 60, atk: 85, def: 69, spa: 65, spd: 79, spe: 80,
        learnset: [{ lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 8, name: 'Picotazo Veneno', pp: 35 }, { lv: 13, name: 'Mordisco', pp: 25 }, { lv: 20, name: 'Deslumbrar', pp: 30 }, { lv: 28, name: 'Chirrido', pp: 40 }, { lv: 38, name: 'Ácido', pp: 30 }, { lv: 46, name: 'Bomba Lodo', pp: 10 }]
      },
      pikachu: {
        name: 'Pikachu', emoji: '⚡', type: 'electric', hp: 35, atk: 55, def: 40, spa: 50, spd: 50, spe: 90,
        learnset: [{ lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 6, name: 'Látigo', pp: 30 }, { lv: 8, name: 'Onda Trueno', pp: 20 }, { lv: 11, name: 'Ataque Rápido', pp: 30 }, { lv: 15, name: 'Doble Equipo', pp: 15 }, { lv: 20, name: 'Portazo', pp: 20 }, { lv: 26, name: 'Rayo', pp: 15 }, { lv: 33, name: 'Agilidad', pp: 30 }, { lv: 41, name: 'Trueno', pp: 10 }]
      },
      raichu: {
        name: 'Raichu', emoji: '⚡', type: 'electric', hp: 60, atk: 90, def: 55, spa: 90, spd: 80, spe: 110,
        learnset: [{ lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Rayo', pp: 15 }]
      },
      sandshrew: {
        name: 'Sandshrew', emoji: '🏜️', type: 'ground', hp: 50, atk: 75, def: 85, spa: 20, spd: 30, spe: 40,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 6, name: 'Rizo Defensa', pp: 40 }, { lv: 11, name: 'Ataque Arena', pp: 15 }, { lv: 17, name: 'Cuchillada', pp: 20 }, { lv: 23, name: 'Picotazo Veneno', pp: 35 }, { lv: 30, name: 'Ataque Rápido', pp: 30 }, { lv: 37, name: 'Golpes Furia', pp: 15 }, { lv: 45, name: 'Bucle Arena', pp: 15 }]
      },
      sandslash: {
        name: 'Sandslash', emoji: '🏜️', type: 'ground', hp: 75, atk: 100, def: 110, spa: 45, spd: 55, spe: 65,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Defensa Férrea', pp: 15 }, { lv: 1, name: 'Ataque Arena', pp: 15 }, { lv: 6, name: 'Rizo Defensa', pp: 40 }, { lv: 11, name: 'Ataque Arena', pp: 15 }, { lv: 17, name: 'Cuchillada', pp: 20 }, { lv: 24, name: 'Picotazo Veneno', pp: 35 }, { lv: 33, name: 'Ataque Rápido', pp: 30 }, { lv: 42, name: 'Golpes Furia', pp: 15 }, { lv: 52, name: 'Bucle Arena', pp: 15 }]
      },
      nidoran_f: {
        name: 'Nidoran♀', emoji: '🐭', type: 'poison', hp: 55, atk: 47, def: 52, spa: 40, spd: 40, spe: 41,
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Arañazo', pp: 35 }, { lv: 8, name: 'Látigo', pp: 30 }, { lv: 12, name: 'Doble Patada', pp: 30 }, { lv: 17, name: 'Picotazo Veneno', pp: 35 }, { lv: 20, name: 'Mordisco', pp: 25 }, { lv: 23, name: 'Refuerzo', pp: 20 }, { lv: 30, name: 'Furia', pp: 20 }, { lv: 38, name: 'Colmillo Veneno', pp: 15 }]
      },
      nidorina: {
        name: 'Nidorina', emoji: '🐭', type: 'poison', hp: 70, atk: 62, def: 67, spa: 55, spd: 55, spe: 56,
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Arañazo', pp: 35 }, { lv: 8, name: 'Látigo', pp: 30 }, { lv: 12, name: 'Doble Patada', pp: 30 }, { lv: 18, name: 'Picotazo Veneno', pp: 35 }, { lv: 22, name: 'Mordisco', pp: 25 }, { lv: 26, name: 'Refuerzo', pp: 20 }, { lv: 34, name: 'Furia', pp: 20 }, { lv: 43, name: 'Colmillo Veneno', pp: 15 }]
      },
      nidoqueen: {
        name: 'Nidoqueen', emoji: '🐭', type: 'poison', hp: 90, atk: 92, def: 87, spa: 75, spd: 85, spe: 76,
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 1, name: 'Doble Patada', pp: 30 }, { lv: 1, name: 'Mordisco', pp: 25 }, { lv: 22, name: 'Colmillo Veneno', pp: 15 }, { lv: 43, name: 'Golpe Cuerpo', pp: 15 }]
      },
      nidoran_m: {
        name: 'Nidoran♂', emoji: '🐭', type: 'poison', hp: 46, atk: 57, def: 40, spa: 40, spd: 40, spe: 50,
        learnset: [{ lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 8, name: 'Cornada', pp: 25 }, { lv: 12, name: 'Doble Patada', pp: 30 }, { lv: 17, name: 'Picotazo Veneno', pp: 35 }, { lv: 20, name: 'Foco Energía', pp: 30 }, { lv: 23, name: 'Refuerzo', pp: 20 }, { lv: 30, name: 'Furia', pp: 20 }, { lv: 38, name: 'Perforador', pp: 5 }]
      },
      nidorino: {
        name: 'Nidorino', emoji: '🐭', type: 'poison', hp: 61, atk: 72, def: 57, spa: 55, spd: 55, spe: 65,
        learnset: [{ lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 8, name: 'Cornada', pp: 25 }, { lv: 12, name: 'Doble Patada', pp: 30 }, { lv: 18, name: 'Picotazo Veneno', pp: 35 }, { lv: 22, name: 'Foco Energía', pp: 30 }, { lv: 26, name: 'Refuerzo', pp: 20 }, { lv: 34, name: 'Furia', pp: 20 }, { lv: 43, name: 'Perforador', pp: 5 }]
      },
      nidoking: {
        name: 'Nidoking', emoji: '🐭', type: 'poison', hp: 81, atk: 102, def: 77, spa: 85, spd: 75, spe: 85,
        learnset: [{ lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 1, name: 'Doble Patada', pp: 30 }, { lv: 1, name: 'Foco Energía', pp: 30 }, { lv: 22, name: 'Atizar', pp: 20 }, { lv: 43, name: 'Megacuerno', pp: 10 }]
      },
      clefairy: {
        name: 'Clefairy', emoji: '🧚', type: 'normal', hp: 70, atk: 45, def: 48, spa: 60, spd: 65, spe: 35,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 5, name: 'Canto', pp: 15 }, { lv: 9, name: 'Doble Bofetón', pp: 10 }, { lv: 13, name: 'Rizo Defensa', pp: 40 }, { lv: 17, name: 'Seguimiento', pp: 20 }, { lv: 21, name: 'Minimizar', pp: 20 }, { lv: 25, name: 'Metrónomo', pp: 10 }, { lv: 29, name: 'Luz Lunar', pp: 5 }, { lv: 33, name: 'Masa Cósmica', pp: 20 }, { lv: 37, name: 'Pantalla de Luz', pp: 30 }, { lv: 41, name: 'Puño Meteoro', pp: 10 }]
      },
      clefable: {
        name: 'Clefable', emoji: '🧚', type: 'normal', hp: 95, atk: 70, def: 73, spa: 95, spd: 90, spe: 60,
        learnset: [{ lv: 1, name: 'Canto', pp: 15 }, { lv: 1, name: 'Metrónomo', pp: 10 }, { lv: 1, name: 'Masa Cósmica', pp: 20 }, { lv: 1, name: 'Luz Lunar', pp: 5 }]
      },
      vulpix: {
        name: 'Vulpix', emoji: 'FOX', type: 'fire', hp: 38, atk: 41, def: 40, spa: 50, spd: 65, spe: 65,
        learnset: [{ lv: 1, name: 'Ascuas', pp: 25 }, { lv: 5, name: 'Látigo', pp: 30 }, { lv: 9, name: 'Rugido', pp: 20 }, { lv: 13, name: 'Ataque Rápido', pp: 30 }, { lv: 17, name: 'Rayo Confuso', pp: 10 }, { lv: 21, name: 'Fuego Fatuo', pp: 15 }, { lv: 25, name: 'Lanzallamas', pp: 15 }, { lv: 29, name: 'Velo Sagrado', pp: 25 }, { lv: 37, name: 'Giro Fuego', pp: 15 }, { lv: 41, name: 'Llamarada', pp: 5 }]
      },
      ninetales: {
        name: 'Ninetales', emoji: 'FOX', type: 'fire', hp: 73, atk: 76, def: 75, spa: 81, spd: 100, spe: 100,
        learnset: [{ lv: 1, name: 'Ascuas', pp: 25 }, { lv: 1, name: 'Ataque Rápido', pp: 30 }, { lv: 1, name: 'Rayo Confuso', pp: 10 }, { lv: 1, name: 'Lanzallamas', pp: 15 }]
      },
      jigglypuff: {
        name: 'Jigglypuff', emoji: '🎵', type: 'normal', hp: 115, atk: 45, def: 20, spa: 45, spd: 25, spe: 20,
        learnset: [{ lv: 1, name: 'Canto', pp: 15 }, { lv: 4, name: 'Defensa Férrea', pp: 15 }, { lv: 9, name: 'Destructor', pp: 35 }, { lv: 14, name: 'Anulación', pp: 20 }, { lv: 19, name: 'Rodar', pp: 20 }, { lv: 24, name: 'Doble Bofetón', pp: 30 }, { lv: 29, name: 'Descanso', pp: 10 }, { lv: 34, name: 'Cuerpo Pesado', pp: 15 }, { lv: 39, name: 'Vozarrón', pp: 10 }]
      },
      wigglytuff: {
        name: 'Wigglytuff', emoji: '🎵', type: 'normal', hp: 140, atk: 70, def: 45, spa: 85, spd: 50, spe: 45,
        learnset: [{ lv: 1, name: 'Canto', pp: 15 }, { lv: 1, name: 'Anulación', pp: 20 }, { lv: 1, name: 'Doble Bofetón', pp: 10 }, { lv: 1, name: 'Cuerpo Pesado', pp: 15 }]
      },
      zubat: {
        name: 'Zubat', emoji: '🦇', type: 'poison', hp: 40, atk: 45, def: 35, spa: 30, spd: 40, spe: 55,
        learnset: [{ lv: 1, name: 'Chupa-vidas', pp: 15 }, { lv: 6, name: 'Supersónico', pp: 20 }, { lv: 11, name: 'Impresionar', pp: 15 }, { lv: 16, name: 'Mordisco', pp: 25 }, { lv: 21, name: 'Ataque Ala', pp: 35 }, { lv: 26, name: 'Rayo Confuso', pp: 10 }, { lv: 31, name: 'Aire Afilado', pp: 15 }, { lv: 36, name: 'Niebla', pp: 30 }]
      },
      golbat: {
        name: 'Golbat', emoji: '🦇', type: 'poison', hp: 75, atk: 80, def: 70, spa: 65, spd: 75, spe: 90,
        learnset: [{ lv: 1, name: 'Chupa-vidas', pp: 15 }, { lv: 6, name: 'Supersónico', pp: 20 }, { lv: 11, name: 'Impresionar', pp: 15 }, { lv: 16, name: 'Mordisco', pp: 25 }, { lv: 21, name: 'Ataque Ala', pp: 35 }, { lv: 28, name: 'Rayo Confuso', pp: 10 }, { lv: 35, name: 'Aire Afilado', pp: 15 }, { lv: 42, name: 'Niebla', pp: 30 }]
      },
      oddish: {
        name: 'Oddish', emoji: '🌱', type: 'grass', hp: 45, atk: 50, def: 55, spa: 75, spd: 65, spe: 30,
        learnset: [{ lv: 1, name: 'Absorber', pp: 25 }, { lv: 7, name: 'Dulce Aroma', pp: 20 }, { lv: 14, name: 'Polvo Veneno', pp: 35 }, { lv: 16, name: 'Paralizador', pp: 30 }, { lv: 18, name: 'Somnífera', pp: 15 }, { lv: 23, name: 'Megaagotar', pp: 15 }, { lv: 32, name: 'Luz Lunar', pp: 5 }, { lv: 39, name: 'Danza Pétalo', pp: 10 }, { lv: 46, name: 'Rayo Solar', pp: 10 }]
      },
      gloom: {
        name: 'Gloom', emoji: '🌱', type: 'grass', hp: 60, atk: 65, def: 70, spa: 85, spd: 75, spe: 40,
        learnset: [{ lv: 1, name: 'Absorber', pp: 25 }, { lv: 1, name: 'Dulce Aroma', pp: 20 }, { lv: 1, name: 'Polvo Veneno', pp: 35 }, { lv: 7, name: 'Dulce Aroma', pp: 20 }, { lv: 14, name: 'Polvo Veneno', pp: 35 }, { lv: 16, name: 'Paralizador', pp: 30 }, { lv: 18, name: 'Somnífera', pp: 15 }, { lv: 24, name: 'Megaagotar', pp: 15 }, { lv: 35, name: 'Luz Lunar', pp: 5 }, { lv: 44, name: 'Danza Pétalo', pp: 10 }, { lv: 52, name: 'Rayo Solar', pp: 10 }]
      },
      vileplume: {
        name: 'Vileplume', emoji: '🌺', type: 'grass', hp: 75, atk: 80, def: 85, spa: 110, spd: 90, spe: 50,
        learnset: [{ lv: 1, name: 'Absorber', pp: 25 }, { lv: 1, name: 'Dulce Aroma', pp: 20 }, { lv: 1, name: 'Somnífera', pp: 15 }, { lv: 1, name: 'Danza Pétalo', pp: 10 }, { lv: 44, name: 'Danza Pétalo', pp: 10 }, { lv: 1, name: 'Rayo Solar', pp: 10 }]
      },
      paras: {
        name: 'Paras', emoji: '🍄', type: 'bug', hp: 35, atk: 70, def: 55, spa: 45, spd: 55, spe: 25,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 7, name: 'Paralizador', pp: 30 }, { lv: 13, name: 'Polvo Veneno', pp: 35 }, { lv: 19, name: 'Somnífera', pp: 15 }, { lv: 25, name: 'Cuchillada', pp: 25 }, { lv: 31, name: 'Desarrollo', pp: 40 }, { lv: 37, name: 'Gigadrenado', pp: 10 }, { lv: 43, name: 'Aromaterapia', pp: 5 }]
      },
      parasect: {
        name: 'Parasect', emoji: '🍄', type: 'bug', hp: 60, atk: 95, def: 80, spa: 60, spd: 80, spe: 30,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Paralizador', pp: 30 }, { lv: 1, name: 'Polvo Veneno', pp: 35 }, { lv: 7, name: 'Paralizador', pp: 30 }, { lv: 13, name: 'Polvo Veneno', pp: 35 }, { lv: 19, name: 'Somnífera', pp: 15 }, { lv: 27, name: 'Cuchillada', pp: 25 }, { lv: 35, name: 'Desarrollo', pp: 40 }, { lv: 43, name: 'Gigadrenado', pp: 10 }, { lv: 51, name: 'Aromaterapia', pp: 5 }]
      },
      venonat: {
        name: 'Venonat', emoji: '🦋', type: 'bug', hp: 60, atk: 55, def: 50, spa: 40, spd: 55, spe: 45,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Disparo Demora', pp: 40 }, { lv: 9, name: 'Picotazo Veneno', pp: 35 }, { lv: 17, name: 'Confusión', pp: 25 }, { lv: 20, name: 'Polvo Veneno', pp: 35 }, { lv: 25, name: 'Chupa-vidas', pp: 15 }, { lv: 28, name: 'Paralizador', pp: 30 }, { lv: 33, name: 'Somnífera', pp: 15 }, { lv: 36, name: 'Psicorrayo', pp: 20 }, { lv: 41, name: 'Psíquico', pp: 10 }]
      },
      venomoth: {
        name: 'Venomoth', emoji: '🦋', type: 'bug', hp: 70, atk: 65, def: 60, spa: 90, spd: 75, spe: 90,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 1, name: 'Polvo Veneno', pp: 35 }, { lv: 1, name: 'Tornado', pp: 35 }, { lv: 9, name: 'Picotazo Veneno', pp: 35 }, { lv: 17, name: 'Confusión', pp: 25 }, { lv: 20, name: 'Polvo Veneno', pp: 35 }, { lv: 25, name: 'Chupa-vidas', pp: 15 }, { lv: 28, name: 'Paralizador', pp: 30 }, { lv: 31, name: 'Ataque Ala', pp: 35 }, { lv: 36, name: 'Somnífera', pp: 15 }, { lv: 42, name: 'Psicorrayo', pp: 20 }, { lv: 52, name: 'Psíquico', pp: 10 }]
      },
      diglett: {
        name: 'Diglett', emoji: '🕳️', type: 'ground', hp: 10, atk: 55, def: 25, spa: 35, spd: 45, spe: 95,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Ataque Arena', pp: 15 }, { lv: 5, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Magnitud', pp: 30 }, { lv: 17, name: 'Agilidad', pp: 30 }, { lv: 21, name: 'Golpes Furia', pp: 15 }, { lv: 25, name: 'Bofetón Lodo', pp: 10 }, { lv: 33, name: 'Cuchillada', pp: 20 }, { lv: 41, name: 'Bucle Arena', pp: 15 }, { lv: 49, name: 'Terremoto', pp: 10 }, { lv: 57, name: 'Fisura', pp: 5 }]
      },
      dugtrio: {
        name: 'Dugtrio', emoji: '🕳️', type: 'ground', hp: 35, atk: 80, def: 50, spa: 50, spd: 70, spe: 120,
        learnset: [{ lv: 1, name: 'Triataque', pp: 10 }, { lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Ataque Arena', pp: 15 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 5, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Magnitud', pp: 30 }, { lv: 17, name: 'Agilidad', pp: 30 }, { lv: 21, name: 'Golpes Furia', pp: 15 }, { lv: 25, name: 'Bofetón Lodo', pp: 10 }, { lv: 26, name: 'Bofetón Lodo', pp: 10 }, { lv: 38, name: 'Cuchillada', pp: 20 }, { lv: 51, name: 'Bucle Arena', pp: 15 }, { lv: 64, name: 'Terremoto', pp: 10 }, { lv: 77, name: 'Fisura', pp: 5 }]
      },
      meowth: {
        name: 'Meowth', emoji: '🐱', type: 'normal', hp: 40, atk: 45, def: 35, spa: 40, spd: 40, spe: 90,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 10, name: 'Mordisco', pp: 25 }, { lv: 18, name: 'Día de Pago', pp: 20 }, { lv: 25, name: 'Finta', pp: 20 }, { lv: 31, name: 'Chirrido', pp: 40 }, { lv: 36, name: 'Golpes Furia', pp: 15 }, { lv: 41, name: 'Cuchillada', pp: 20 }, { lv: 45, name: 'Sorpresa', pp: 10 }]
      },
      persian: {
        name: 'Persian', emoji: '🐱', type: 'normal', hp: 65, atk: 70, def: 60, spa: 65, spd: 65, spe: 115,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Mordisco', pp: 25 }, { lv: 10, name: 'Mordisco', pp: 25 }, { lv: 18, name: 'Día de Pago', pp: 20 }, { lv: 25, name: 'Finta', pp: 20 }, { lv: 34, name: 'Chirrido', pp: 40 }, { lv: 42, name: 'Golpes Furia', pp: 15 }, { lv: 51, name: 'Cuchillada', pp: 20 }, { lv: 59, name: 'Sorpresa', pp: 10 }]
      },
      psyduck: {
        name: 'Psyduck', emoji: '🦆', type: 'water', hp: 50, atk: 52, def: 48, spa: 65, spd: 50, spe: 55,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 5, name: 'Látigo', pp: 30 }, { lv: 10, name: 'Anulación', pp: 20 }, { lv: 16, name: 'Confusión', pp: 25 }, { lv: 23, name: 'Chirrido', pp: 40 }, { lv: 31, name: 'Psicocontrol', pp: 10 }, { lv: 40, name: 'Golpes Furia', pp: 15 }, { lv: 50, name: 'Hidrobomba', pp: 5 }]
      },
      golduck: {
        name: 'Golduck', emoji: '🦆', type: 'water', hp: 80, atk: 82, def: 78, spa: 95, spd: 80, spe: 85,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Anulación', pp: 20 }, { lv: 5, name: 'Látigo', pp: 30 }, { lv: 10, name: 'Anulación', pp: 20 }, { lv: 16, name: 'Confusión', pp: 25 }, { lv: 23, name: 'Chirrido', pp: 40 }, { lv: 31, name: 'Psicocontrol', pp: 10 }, { lv: 44, name: 'Golpes Furia', pp: 15 }, { lv: 58, name: 'Hidrobomba', pp: 5 }]
      },
      mankey: {
        name: 'Mankey', emoji: '🐒', type: 'fighting', hp: 40, atk: 80, def: 35, spa: 35, spd: 45, spe: 70,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 6, name: 'Patada Baja', pp: 20 }, { lv: 11, name: 'Golpe Karatazo', pp: 25 }, { lv: 16, name: 'Golpes Furia', pp: 15 }, { lv: 21, name: 'Foco Energía', pp: 30 }, { lv: 26, name: 'Mov. Sísmico', pp: 20 }, { lv: 31, name: 'Venganza', pp: 10 }, { lv: 36, name: 'Contoneo', pp: 15 }, { lv: 41, name: 'Tajo Cruzado', pp: 5 }, { lv: 46, name: 'Atizar', pp: 20 }]
      },
      primeape: {
        name: 'Primeape', emoji: '🐒', type: 'fighting', hp: 65, atk: 105, def: 60, spa: 60, spd: 70, spe: 95,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Patada Baja', pp: 20 }, { lv: 1, name: 'Furia', pp: 20 }, { lv: 6, name: 'Patada Baja', pp: 20 }, { lv: 11, name: 'Golpe Karatazo', pp: 25 }, { lv: 16, name: 'Golpes Furia', pp: 15 }, { lv: 21, name: 'Foco Energía', pp: 30 }, { lv: 26, name: 'Mov. Sísmico', pp: 20 }, { lv: 28, name: 'Furia', pp: 20 }, { lv: 35, name: 'Venganza', pp: 10 }, { lv: 44, name: 'Contoneo', pp: 15 }, { lv: 53, name: 'Tajo Cruzado', pp: 5 }, { lv: 62, name: 'Atizar', pp: 20 }]
      },
      growlithe: {
        name: 'Growlithe', emoji: '🐕', type: 'fire', hp: 55, atk: 70, def: 45, spa: 70, spd: 50, spe: 60,
        learnset: [{ lv: 1, name: 'Mordisco', pp: 25 }, { lv: 1, name: 'Rugido', pp: 20 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Malicioso', pp: 30 }, { lv: 19, name: 'Rastreo', pp: 40 }, { lv: 25, name: 'Derribo', pp: 20 }, { lv: 31, name: 'Rueda Fuego', pp: 25 }, { lv: 37, name: 'Refuerzo', pp: 20 }, { lv: 43, name: 'Agilidad', pp: 30 }, { lv: 49, name: 'Lanzallamas', pp: 15 }]
      },
      arcanine: {
        name: 'Arcanine', emoji: '🐕', type: 'fire', hp: 90, atk: 110, def: 80, spa: 100, spd: 80, spe: 95,
        learnset: [{ lv: 1, name: 'Rugido', pp: 20 }, { lv: 1, name: 'Ascuas', pp: 25 }, { lv: 1, name: 'Mordisco', pp: 25 }, { lv: 1, name: 'Velocidad Extrema', pp: 5 }, { lv: 49, name: 'Velocidad Extrema', pp: 5 }]
      },
      poliwag: {
        name: 'Poliwag', emoji: '🌀', type: 'water', hp: 40, atk: 50, def: 40, spa: 40, spd: 40, spe: 90,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 7, name: 'Hipnosis', pp: 20 }, { lv: 13, name: 'Pistola Agua', pp: 25 }, { lv: 19, name: 'Bofetón Lodo', pp: 20 }, { lv: 25, name: 'Danza Lluvia', pp: 5 }, { lv: 31, name: 'Cuerpo Pesado', pp: 15 }, { lv: 37, name: 'Tambor', pp: 10 }, { lv: 43, name: 'Hidrobomba', pp: 5 }]
      },
      poliwhirl: {
        name: 'Poliwhirl', emoji: '🌀', type: 'water', hp: 65, atk: 65, def: 65, spa: 50, spd: 50, spe: 90,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 7, name: 'Hipnosis', pp: 20 }, { lv: 13, name: 'Pistola Agua', pp: 25 }, { lv: 19, name: 'Bofetón Lodo', pp: 20 }, { lv: 27, name: 'Danza Lluvia', pp: 5 }, { lv: 35, name: 'Cuerpo Pesado', pp: 15 }, { lv: 43, name: 'Tambor', pp: 10 }, { lv: 51, name: 'Hidrobomba', pp: 5 }]
      },
      poliwrath: {
        name: 'Poliwrath', emoji: '🌀', type: 'water', hp: 90, atk: 95, def: 95, spa: 70, spd: 90, spe: 70,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 1, name: 'Sumisión', pp: 25 }, { lv: 1, name: 'Puñetazo', pp: 35 }, { lv: 35, name: 'Sumisión', pp: 25 }, { lv: 51, name: 'Puño Certero', pp: 20 }]
      },
      abra: {
        name: 'Abra', emoji: '🧘', type: 'psychic', hp: 25, atk: 20, def: 15, spa: 105, spd: 55, spe: 90,
        learnset: [{ lv: 1, name: 'Teletransporte', pp: 20 }]
      },
      kadabra: {
        name: 'Kadabra', emoji: '🧘', type: 'psychic', hp: 40, atk: 35, def: 30, spa: 120, spd: 70, spe: 105,
        learnset: [{ lv: 1, name: 'Teletransporte', pp: 20 }, { lv: 1, name: 'Kinético', pp: 15 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 16, name: 'Confusión', pp: 25 }, { lv: 18, name: 'Anulación', pp: 20 }, { lv: 21, name: 'Psicorrayo', pp: 20 }, { lv: 23, name: 'Kinético', pp: 15 }, { lv: 25, name: 'Reflejo', pp: 20 }, { lv: 30, name: 'Recuperación', pp: 10 }, { lv: 33, name: 'Premonición', pp: 15 }, { lv: 36, name: 'Psíquico', pp: 10 }, { lv: 43, name: 'Truco', pp: 10 }]
      },
      alakazam: {
        name: 'Alakazam', emoji: '🧘', type: 'psychic', hp: 55, atk: 50, def: 45, spa: 135, spd: 95, spe: 120,
        learnset: [{ lv: 1, name: 'Teletransporte', pp: 20 }, { lv: 1, name: 'Kinético', pp: 15 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 16, name: 'Confusión', pp: 25 }, { lv: 18, name: 'Anulación', pp: 20 }, { lv: 21, name: 'Psicorrayo', pp: 20 }, { lv: 23, name: 'Kinético', pp: 15 }, { lv: 25, name: 'Reflejo', pp: 20 }, { lv: 30, name: 'Recuperación', pp: 10 }, { lv: 33, name: 'Premonición', pp: 15 }, { lv: 36, name: 'Psíquico', pp: 10 }, { lv: 43, name: 'Truco', pp: 10 }]
      },
      machop: {
        name: 'Machop', emoji: '💪', type: 'fighting', hp: 70, atk: 80, def: 50, spa: 35, spd: 35, spe: 35,
        learnset: [{ lv: 1, name: 'Patada Baja', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 7, name: 'Foco Energía', pp: 30 }, { lv: 13, name: 'Golpe Karatazo', pp: 25 }, { lv: 19, name: 'Mov. Sísmico', pp: 20 }, { lv: 25, name: 'Previsión', pp: 40 }, { lv: 31, name: 'Venganza', pp: 10 }, { lv: 37, name: 'Tiro Vital', pp: 10 }, { lv: 43, name: 'Sumisión', pp: 25 }, { lv: 49, name: 'Tajo Cruzado', pp: 5 }, { lv: 55, name: 'Cara Susto', pp: 10 }]
      },
      machoke: {
        name: 'Machoke', emoji: '💪', type: 'fighting', hp: 80, atk: 100, def: 70, spa: 50, spd: 60, spe: 45,
        learnset: [{ lv: 1, name: 'Patada Baja', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Foco Energía', pp: 30 }, { lv: 7, name: 'Foco Energía', pp: 30 }, { lv: 13, name: 'Golpe Karatazo', pp: 25 }, { lv: 19, name: 'Mov. Sísmico', pp: 20 }, { lv: 25, name: 'Previsión', pp: 40 }, { lv: 31, name: 'Venganza', pp: 10 }, { lv: 40, name: 'Tiro Vital', pp: 10 }, { lv: 49, name: 'Sumisión', pp: 25 }, { lv: 58, name: 'Tajo Cruzado', pp: 5 }, { lv: 67, name: 'Cara Susto', pp: 10 }]
      },
      machamp: {
        name: 'Machamp', emoji: '💪', type: 'fighting', hp: 90, atk: 130, def: 80, spa: 65, spd: 85, spe: 55,
        learnset: [{ lv: 1, name: 'Patada Baja', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Foco Energía', pp: 30 }, { lv: 7, name: 'Foco Energía', pp: 30 }, { lv: 13, name: 'Golpe Karatazo', pp: 25 }, { lv: 19, name: 'Mov. Sísmico', pp: 20 }, { lv: 25, name: 'Previsión', pp: 40 }, { lv: 31, name: 'Venganza', pp: 10 }, { lv: 40, name: 'Tiro Vital', pp: 10 }, { lv: 49, name: 'Sumisión', pp: 25 }, { lv: 58, name: 'Tajo Cruzado', pp: 5 }, { lv: 67, name: 'Cara Susto', pp: 10 }]
      },
      bellsprout: {
        name: 'Bellsprout', emoji: '🌱', type: 'grass', hp: 50, atk: 75, def: 35, spa: 70, spd: 30, spe: 40,
        learnset: [{ lv: 1, name: 'Látigo Cepa', pp: 25 }, { lv: 6, name: 'Desarrollo', pp: 40 }, { lv: 11, name: 'Envolver', pp: 20 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 17, name: 'Polvo Veneno', pp: 35 }, { lv: 19, name: 'Paralizador', pp: 30 }, { lv: 23, name: 'Ácido', pp: 30 }, { lv: 30, name: 'Dulce Aroma', pp: 20 }, { lv: 37, name: 'Hoja Afilada', pp: 25 }, { lv: 45, name: 'Portazo', pp: 20 }]
      },
      weepinbell: {
        name: 'Weepinbell', emoji: '🌱', type: 'grass', hp: 65, atk: 90, def: 50, spa: 85, spd: 45, spe: 55,
        learnset: [{ lv: 1, name: 'Látigo Cepa', pp: 25 }, { lv: 1, name: 'Desarrollo', pp: 40 }, { lv: 1, name: 'Envolver', pp: 20 }, { lv: 6, name: 'Desarrollo', pp: 40 }, { lv: 11, name: 'Envolver', pp: 20 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 17, name: 'Polvo Veneno', pp: 35 }, { lv: 19, name: 'Paralizador', pp: 30 }, { lv: 24, name: 'Ácido', pp: 30 }, { lv: 33, name: 'Dulce Aroma', pp: 20 }, { lv: 42, name: 'Hoja Afilada', pp: 25 }, { lv: 54, name: 'Portazo', pp: 20 }]
      },
      victreebel: {
        name: 'Victreebel', emoji: '🌺', type: 'grass', hp: 80, atk: 105, def: 65, spa: 100, spd: 70, spe: 70,
        learnset: [{ lv: 1, name: 'Hoja Afilada', pp: 25 }, { lv: 1, name: 'Somnífera', pp: 15 }, { lv: 1, name: 'Látigo Cepa', pp: 25 }]
      },
      tentacool: {
        name: 'Tentacool', emoji: '🌊', type: 'water', hp: 40, atk: 40, def: 35, spa: 50, spd: 100, spe: 70,
        learnset: [{ lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 6, name: 'Supersónico', pp: 20 }, { lv: 12, name: 'Constricción', pp: 35 }, { lv: 19, name: 'Ácido', pp: 30 }, { lv: 25, name: 'Rayo Burbuja', pp: 20 }, { lv: 30, name: 'Barrera', pp: 20 }, { lv: 36, name: 'Chirrido', pp: 40 }, { lv: 43, name: 'Hidrobomba', pp: 5 }]
      },
      tentacruel: {
        name: 'Tentacruel', emoji: '🌊', type: 'water', hp: 80, atk: 70, def: 65, spa: 80, spd: 120, spe: 100,
        learnset: [{ lv: 1, name: 'Picotazo Veneno', pp: 35 }, { lv: 1, name: 'Supersónico', pp: 20 }, { lv: 10, name: 'Envolver', pp: 20 }, { lv: 19, name: 'Ácido', pp: 30 }, { lv: 25, name: 'Rayo Burbuja', pp: 20 }, { lv: 35, name: 'Barrera', pp: 20 }, { lv: 50, name: 'Hidrobomba', pp: 5 }]
      },
      geodude: {
        name: 'Geodude', emoji: '🪨', type: 'rock', hp: 40, atk: 80, def: 100, spa: 30, spd: 30, spe: 20,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Rizo Defensa', pp: 40 }, { lv: 6, name: 'Bofetón Lodo', pp: 10 }, { lv: 11, name: 'Lanzarrocas', pp: 15 }, { lv: 16, name: 'Magnitud', pp: 30 }, { lv: 21, name: 'Autodestrucción', pp: 5 }, { lv: 26, name: 'Rodar', pp: 20 }, { lv: 31, name: 'Fijar Blanco', pp: 5 }, { lv: 36, name: 'Terremoto', pp: 10 }, { lv: 41, name: 'Explosión', pp: 5 }, { lv: 46, name: 'Doble Filo', pp: 15 }]
      },
      graveler: {
        name: 'Graveler', emoji: '🪨', type: 'rock', hp: 55, atk: 95, def: 115, spa: 45, spd: 45, spe: 35,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Rizo Defensa', pp: 40 }, { lv: 1, name: 'Lanzarrocas', pp: 15 }, { lv: 6, name: 'Rizo Defensa', pp: 40 }, { lv: 11, name: 'Lanzarrocas', pp: 15 }, { lv: 16, name: 'Magnitud', pp: 30 }, { lv: 21, name: 'Autodestrucción', pp: 5 }, { lv: 29, name: 'Rodar', pp: 20 }, { lv: 37, name: 'Fijar Blanco', pp: 5 }, { lv: 45, name: 'Terremoto', pp: 10 }, { lv: 53, name: 'Explosión', pp: 5 }, { lv: 62, name: 'Doble Filo', pp: 15 }]
      },
      golem: {
        name: 'Golem', emoji: '🪨', type: 'rock', hp: 80, atk: 110, def: 130, spa: 55, spd: 65, spe: 45,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Rizo Defensa', pp: 40 }, { lv: 1, name: 'Lanzarrocas', pp: 15 }, { lv: 1, name: 'Autodestrucción', pp: 5 }, { lv: 6, name: 'Rizo Defensa', pp: 40 }, { lv: 11, name: 'Lanzarrocas', pp: 15 }, { lv: 16, name: 'Magnitud', pp: 30 }, { lv: 21, name: 'Autodestrucción', pp: 5 }, { lv: 29, name: 'Rodar', pp: 20 }, { lv: 37, name: 'Fijar Blanco', pp: 5 }, { lv: 45, name: 'Terremoto', pp: 10 }, { lv: 53, name: 'Explosión', pp: 5 }, { lv: 62, name: 'Doble Filo', pp: 15 }]
      },
      ponyta: {
        name: 'Ponyta', emoji: '🐎', type: 'fire', hp: 50, atk: 85, def: 55, spa: 65, spd: 65, spe: 90,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Pisotón', pp: 20 }, { lv: 19, name: 'Giro Fuego', pp: 15 }, { lv: 25, name: 'Derribo', pp: 20 }, { lv: 31, name: 'Agilidad', pp: 30 }, { lv: 37, name: 'Llamarada', pp: 5 }]
      },
      rapidash: {
        name: 'Rapidash', emoji: '🐎', type: 'fire', hp: 65, atk: 100, def: 70, spa: 80, spd: 80, spe: 105,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 7, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Pisotón', pp: 20 }, { lv: 19, name: 'Giro Fuego', pp: 15 }, { lv: 25, name: 'Derribo', pp: 20 }, { lv: 31, name: 'Agilidad', pp: 30 }, { lv: 40, name: 'Llamarada', pp: 5 }]
      },
      slowpoke: {
        name: 'Slowpoke', emoji: '🐌', type: 'water', hp: 90, atk: 65, def: 65, spa: 40, spd: 40, spe: 15,
        learnset: [{ lv: 1, name: 'Maldición', pp: 10 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 9, name: 'Bostezo', pp: 10 }, { lv: 14, name: 'Confusión', pp: 25 }, { lv: 19, name: 'Anulación', pp: 20 }, { lv: 24, name: 'Cabezazo', pp: 15 }, { lv: 34, name: 'Amnesia', pp: 20 }, { lv: 46, name: 'Psíquico', pp: 10 }]
      },
      slowbro: {
        name: 'Slowbro', emoji: '🐌', type: 'water', hp: 95, atk: 75, def: 110, spa: 100, spd: 80, spe: 30,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Maldición', pp: 10 }, { lv: 9, name: 'Bostezo', pp: 10 }, { lv: 14, name: 'Confusión', pp: 25 }, { lv: 19, name: 'Anulación', pp: 20 }, { lv: 24, name: 'Cabezazo', pp: 15 }, { lv: 37, name: 'Amnesia', pp: 20 }, { lv: 54, name: 'Psíquico', pp: 10 }]
      },
      magnemite: {
        name: 'Magnemite', emoji: '🔩', type: 'electric', hp: 25, atk: 35, def: 70, spa: 95, spd: 55, spe: 45,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Eco Metálico', pp: 10 }, { lv: 6, name: 'Impactrueno', pp: 30 }, { lv: 11, name: 'Supersónico', pp: 20 }, { lv: 16, name: 'Onda Trueno', pp: 20 }, { lv: 21, name: 'Rapidez', pp: 20 }, { lv: 26, name: 'Onda Sónica', pp: 20 }, { lv: 32, name: 'Zap Cannon', pp: 5 }, { lv: 38, name: 'Fijar Blanco', pp: 5 }, { lv: 44, name: 'Rayo', pp: 15 }, { lv: 50, name: 'Trueno', pp: 10 }]
      },
      magneton: {
        name: 'Magneton', emoji: '🔩', type: 'electric', hp: 50, atk: 60, def: 95, spa: 120, spd: 70, spe: 70,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 11, name: 'Supersónico', pp: 20 }, { lv: 18, name: 'Onda Sónica', pp: 20 }, { lv: 21, name: 'Rayo', pp: 15 }, { lv: 25, name: 'Chirrido', pp: 40 }, { lv: 35, name: 'Triataque', pp: 10 }]
      },
      farfetchd: {
        name: "Farfetch'd", emoji: '🦆', type: 'normal', hp: 52, atk: 65, def: 55, spa: 58, spd: 62, spe: 60,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 20 }, { lv: 1, name: 'Ataque Arena', pp: 15 }, { lv: 6, name: 'Malicioso', pp: 30 }, { lv: 11, name: 'Corte Furia', pp: 20 }, { lv: 16, name: 'Golpes Furia', pp: 15 }, { lv: 21, name: 'Danza Espada', pp: 20 }, { lv: 26, name: 'Agilidad', pp: 30 }, { lv: 31, name: 'Cuchillada', pp: 20 }, { lv: 36, name: 'Falso Tortazo', pp: 40 }]
      },
      doduo: {
        name: 'Doduo', emoji: '🐦', type: 'normal', hp: 35, atk: 85, def: 45, spa: 35, spd: 35, spe: 75,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 20 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Ataque Furia', pp: 20 }, { lv: 13, name: 'Persecución', pp: 20 }, { lv: 21, name: 'Triataque', pp: 10 }, { lv: 25, name: 'Furia', pp: 20 }, { lv: 33, name: 'Agilidad', pp: 30 }, { lv: 37, name: 'Pico Taladro', pp: 20 }, { lv: 45, name: 'Esfuerzo', pp: 5 }]
      },
      dodrio: {
        name: 'Dodrio', emoji: '🐦', type: 'normal', hp: 60, atk: 110, def: 70, spa: 60, spd: 60, spe: 100,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 20 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Ataque Furia', pp: 20 }, { lv: 1, name: 'Persecución', pp: 20 }, { lv: 9, name: 'Ataque Furia', pp: 20 }, { lv: 13, name: 'Persecución', pp: 20 }, { lv: 21, name: 'Triataque', pp: 10 }, { lv: 25, name: 'Furia', pp: 20 }, { lv: 38, name: 'Agilidad', pp: 30 }, { lv: 47, name: 'Pico Taladro', pp: 20 }, { lv: 60, name: 'Esfuerzo', pp: 5 }]
      },
      seel: {
        name: 'Seel', emoji: '🦭', type: 'water', hp: 65, atk: 45, def: 55, spa: 45, spd: 70, spe: 45,
        learnset: [{ lv: 1, name: 'Cabezazo', pp: 15 }, { lv: 9, name: 'Gruñido', pp: 40 }, { lv: 17, name: 'Viento Hielo', pp: 15 }, { lv: 21, name: 'Rayo Aurora', pp: 20 }, { lv: 29, name: 'Descanso', pp: 10 }, { lv: 37, name: 'Derribo', pp: 20 }, { lv: 41, name: 'Rayo Hielo', pp: 10 }, { lv: 49, name: 'Velo Sagrado', pp: 25 }]
      },
      dewgong: {
        name: 'Dewgong', emoji: '🦭', type: 'water', hp: 90, atk: 70, def: 80, spa: 70, spd: 95, spe: 70,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Viento Hielo', pp: 15 }, { lv: 1, name: 'Rayo Aurora', pp: 20 }, { lv: 9, name: 'Gruñido', pp: 40 }, { lv: 17, name: 'Viento Hielo', pp: 15 }, { lv: 21, name: 'Rayo Aurora', pp: 20 }, { lv: 29, name: 'Descanso', pp: 10 }, { lv: 34, name: 'Tenaza', pp: 10 }, { lv: 42, name: 'Derribo', pp: 20 }, { lv: 51, name: 'Rayo Hielo', pp: 10 }, { lv: 64, name: 'Velo Sagrado', pp: 25 }]
      },
      grimer: {
        name: 'Grimer', emoji: '☣️', type: 'poison', hp: 80, atk: 80, def: 50, spa: 40, spd: 50, spe: 25,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Gas Venenoso', pp: 40 }, { lv: 4, name: 'Fortaleza', pp: 30 }, { lv: 8, name: 'Bofetón Lodo', pp: 10 }, { lv: 13, name: 'Anulación', pp: 20 }, { lv: 19, name: 'Residuos', pp: 20 }, { lv: 26, name: 'Minimizar', pp: 20 }, { lv: 34, name: 'Chirrido', pp: 40 }, { lv: 43, name: 'Armadura Ácida', pp: 20 }, { lv: 53, name: 'Bomba Lodo', pp: 10 }]
      },
      muk: {
        name: 'Muk', emoji: '☣️', type: 'poison', hp: 105, atk: 105, def: 75, spa: 65, spd: 100, spe: 50,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Gas Venenoso', pp: 40 }, { lv: 1, name: 'Armadura Ácida', pp: 20 }, { lv: 4, name: 'Fortaleza', pp: 30 }, { lv: 8, name: 'Bofetón Lodo', pp: 10 }, { lv: 13, name: 'Anulación', pp: 20 }, { lv: 19, name: 'Residuos', pp: 20 }, { lv: 26, name: 'Minimizar', pp: 20 }, { lv: 34, name: 'Chirrido', pp: 40 }, { lv: 45, name: 'Armadura Ácida', pp: 20 }, { lv: 60, name: 'Bomba Lodo', pp: 10 }]
      },
      shellder: {
        name: 'Shellder', emoji: '🐚', type: 'water', hp: 30, atk: 65, def: 100, spa: 45, spd: 25, spe: 40,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Refugio', pp: 40 }, { lv: 9, name: 'Supersónico', pp: 20 }, { lv: 17, name: 'Rayo Aurora', pp: 20 }, { lv: 25, name: 'Protección', pp: 10 }, { lv: 33, name: 'Malicioso', pp: 30 }, { lv: 41, name: 'Tenaza', pp: 10 }, { lv: 49, name: 'Rayo Hielo', pp: 10 }]
      },
      cloyster: {
        name: 'Cloyster', emoji: '🐚', type: 'water', hp: 50, atk: 95, def: 180, spa: 85, spd: 45, spe: 70,
        learnset: [{ lv: 1, name: 'Triataque', pp: 10 }, { lv: 1, name: 'Supersónico', pp: 20 }, { lv: 1, name: 'Rayo Aurora', pp: 20 }, { lv: 1, name: 'Púas', pp: 20 }, { lv: 39, name: 'Clavo Cañón', pp: 15 }, { lv: 49, name: 'Hidrobomba', pp: 5 }]
      },
      gastly: {
        name: 'Gastly', emoji: '👻', type: 'ghost', hp: 30, atk: 35, def: 30, spa: 100, spd: 35, spe: 80,
        learnset: [{ lv: 1, name: 'Lengüetazo', pp: 30 }, { lv: 1, name: 'Rencor', pp: 10 }, { lv: 8, name: 'Mal de Ojo', pp: 5 }, { lv: 13, name: 'Maldición', pp: 10 }, { lv: 16, name: 'Tinieblas', pp: 15 }, { lv: 21, name: 'Rayo Confuso', pp: 10 }, { lv: 28, name: 'Comesueños', pp: 15 }, { lv: 33, name: 'Mismodestino', pp: 5 }]
      },
      haunter: {
        name: 'Haunter', emoji: '👻', type: 'ghost', hp: 45, atk: 50, def: 45, spa: 115, spd: 55, spe: 95,
        learnset: [{ lv: 1, name: 'Lengüetazo', pp: 30 }, { lv: 1, name: 'Rencor', pp: 10 }, { lv: 1, name: 'Mal de Ojo', pp: 5 }, { lv: 8, name: 'Mal de Ojo', pp: 5 }, { lv: 13, name: 'Maldición', pp: 10 }, { lv: 16, name: 'Tinieblas', pp: 15 }, { lv: 21, name: 'Rayo Confuso', pp: 10 }, { lv: 25, name: 'Puño Sombra', pp: 20 }, { lv: 31, name: 'Comesueños', pp: 15 }, { lv: 39, name: 'Mismodestino', pp: 5 }]
      },
      gengar: {
        name: 'Gengar', emoji: '👻', type: 'ghost', hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110,
        learnset: [{ lv: 1, name: 'Lengüetazo', pp: 30 }, { lv: 1, name: 'Rencor', pp: 10 }, { lv: 1, name: 'Mal de Ojo', pp: 5 }, { lv: 8, name: 'Mal de Ojo', pp: 5 }, { lv: 13, name: 'Maldición', pp: 10 }, { lv: 16, name: 'Tinieblas', pp: 15 }, { lv: 21, name: 'Rayo Confuso', pp: 10 }, { lv: 25, name: 'Puño Sombra', pp: 20 }, { lv: 31, name: 'Comesueños', pp: 15 }, { lv: 39, name: 'Mismodestino', pp: 5 }]
      },
      onix: {
        name: 'Onix', emoji: '🪨', type: 'rock', hp: 35, atk: 45, def: 160, spa: 30, spd: 45, spe: 70,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Chirrido', pp: 40 }, { lv: 9, name: 'Lanzarrocas', pp: 15 }, { lv: 13, name: 'Furia', pp: 20 }, { lv: 21, name: 'Tumba Rocas', pp: 10 }, { lv: 25, name: 'Tormenta Arena', pp: 10 }, { lv: 33, name: 'Portazo', pp: 20 }, { lv: 41, name: 'Cola Férrea', pp: 15 }, { lv: 49, name: 'Bucle Arena', pp: 15 }]
      },
      drowzee: {
        name: 'Drowzee', emoji: '🌀', type: 'psychic', hp: 60, atk: 48, def: 45, spa: 43, spd: 90, spe: 42,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 10, name: 'Anulación', pp: 20 }, { lv: 18, name: 'Confusión', pp: 25 }, { lv: 25, name: 'Cabezazo', pp: 15 }, { lv: 31, name: 'Gas Venenoso', pp: 40 }, { lv: 36, name: 'Meditación', pp: 40 }, { lv: 40, name: 'Psíquico', pp: 10 }, { lv: 45, name: 'Psicocontrol', pp: 10 }, { lv: 49, name: 'Premonición', pp: 15 }]
      },
      hypno: {
        name: 'Hypno', emoji: '🌀', type: 'psychic', hp: 85, atk: 73, def: 70, spa: 73, spd: 115, spe: 67,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 1, name: 'Anulación', pp: 20 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 10, name: 'Anulación', pp: 20 }, { lv: 18, name: 'Confusión', pp: 25 }, { lv: 25, name: 'Cabezazo', pp: 15 }, { lv: 33, name: 'Gas Venenoso', pp: 40 }, { lv: 40, name: 'Meditación', pp: 40 }, { lv: 46, name: 'Psíquico', pp: 10 }, { lv: 53, name: 'Psicocontrol', pp: 10 }, { lv: 59, name: 'Premonición', pp: 15 }]
      },
      krabby: {
        name: 'Krabby', emoji: '🦀', type: 'water', hp: 30, atk: 105, def: 90, spa: 25, spd: 25, spe: 50,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 5, name: 'Tenaza', pp: 10 }, { lv: 12, name: 'Fortaleza', pp: 30 }, { lv: 16, name: 'Rayo Burbuja', pp: 20 }, { lv: 23, name: 'Disparo Lodo', pp: 15 }, { lv: 27, name: 'Pisotón', pp: 20 }, { lv: 34, name: 'Guillotina', pp: 5 }, { lv: 38, name: 'Protección', pp: 10 }, { lv: 45, name: 'Martillazo', pp: 10 }]
      },
      kingler: {
        name: 'Kingler', emoji: '🦀', type: 'water', hp: 55, atk: 130, def: 115, spa: 50, spd: 50, spe: 75,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Tenaza', pp: 10 }, { lv: 5, name: 'Tenaza', pp: 10 }, { lv: 12, name: 'Fortaleza', pp: 30 }, { lv: 16, name: 'Rayo Burbuja', pp: 20 }, { lv: 23, name: 'Disparo Lodo', pp: 15 }, { lv: 27, name: 'Pisotón', pp: 20 }, { lv: 34, name: 'Guillotina', pp: 5 }, { lv: 38, name: 'Protección', pp: 10 }, { lv: 45, name: 'Martillazo', pp: 10 }]
      },
      voltorb: {
        name: 'Voltorb', emoji: '⚽', type: 'electric', hp: 40, atk: 30, def: 50, spa: 55, spd: 55, spe: 100,
        learnset: [{ lv: 1, name: 'Carga', pp: 20 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 8, name: 'Chirrido', pp: 40 }, { lv: 12, name: 'Onda Sónica', pp: 20 }, { lv: 15, name: 'Chispa', pp: 20 }, { lv: 21, name: 'Autodestrucción', pp: 5 }, { lv: 26, name: 'Rodar', pp: 20 }, { lv: 32, name: 'Pantalla de Luz', pp: 30 }, { lv: 37, name: 'Rapidez', pp: 20 }, { lv: 43, name: 'Explosión', pp: 5 }, { lv: 48, name: 'Manto Espejo', pp: 20 }]
      },
      electrode: {
        name: 'Electrode', emoji: '⚽', type: 'electric', hp: 60, atk: 50, def: 70, spa: 80, spd: 80, spe: 140,
        learnset: [{ lv: 1, name: 'Carga', pp: 20 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Chirrido', pp: 40 }, { lv: 1, name: 'Onda Sónica', pp: 20 }, { lv: 8, name: 'Chirrido', pp: 40 }, { lv: 12, name: 'Onda Sónica', pp: 20 }, { lv: 15, name: 'Chispa', pp: 20 }, { lv: 21, name: 'Autodestrucción', pp: 5 }, { lv: 26, name: 'Rodar', pp: 20 }, { lv: 34, name: 'Pantalla de Luz', pp: 30 }, { lv: 41, name: 'Rapidez', pp: 20 }, { lv: 50, name: 'Explosión', pp: 5 }, { lv: 58, name: 'Manto Espejo', pp: 20 }]
      },
      exeggcute: {
        name: 'Exeggcute', emoji: '🥚', type: 'grass', hp: 60, atk: 40, def: 80, spa: 60, spd: 45, spe: 40,
        learnset: [{ lv: 1, name: 'Bombardeo', pp: 20 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 13, name: 'Reflejo', pp: 20 }, { lv: 19, name: 'Drenadoras', pp: 10 }, { lv: 25, name: 'Confusión', pp: 25 }, { lv: 31, name: 'Paralizador', pp: 30 }, { lv: 37, name: 'Polvo Veneno', pp: 35 }, { lv: 43, name: 'Somnífera', pp: 15 }, { lv: 50, name: 'Rayo Solar', pp: 10 }]
      },
      exeggutor: {
        name: 'Exeggutor', emoji: '🌴', type: 'grass', hp: 95, atk: 95, def: 85, spa: 125, spd: 75, spe: 55,
        learnset: [{ lv: 1, name: 'Barrera', pp: 20 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 1, name: 'Hipnosis', pp: 20 }, { lv: 19, name: 'Pisotón', pp: 20 }, { lv: 31, name: 'Huevo Bomba', pp: 10 }]
      },
      cubone: {
        name: 'Cubone', emoji: '🦴', type: 'ground', hp: 50, atk: 50, def: 95, spa: 40, spd: 50, spe: 35,
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Hueso Palo', pp: 20 }, { lv: 13, name: 'Cabezazo', pp: 15 }, { lv: 17, name: 'Malicioso', pp: 30 }, { lv: 21, name: 'Foco Energía', pp: 30 }, { lv: 25, name: 'Huesomerang', pp: 20 }, { lv: 29, name: 'Furia', pp: 20 }, { lv: 33, name: 'Falso Tortazo', pp: 40 }, { lv: 37, name: 'Atizar', pp: 20 }, { lv: 41, name: 'Doble Filo', pp: 15 }, { lv: 45, name: 'Hueso Rus', pp: 10 }]
      },
      marowak: {
        name: 'Marowak', emoji: '🦴', type: 'ground', hp: 60, atk: 80, def: 110, spa: 50, spd: 80, spe: 45,
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Hueso Palo', pp: 20 }, { lv: 1, name: 'Cabezazo', pp: 15 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 9, name: 'Hueso Palo', pp: 20 }, { lv: 13, name: 'Cabezazo', pp: 15 }, { lv: 17, name: 'Malicioso', pp: 30 }, { lv: 21, name: 'Foco Energía', pp: 30 }, { lv: 25, name: 'Huesomerang', pp: 20 }, { lv: 32, name: 'Furia', pp: 20 }, { lv: 39, name: 'Falso Tortazo', pp: 40 }, { lv: 46, name: 'Atizar', pp: 20 }, { lv: 53, name: 'Doble Filo', pp: 15 }, { lv: 61, name: 'Hueso Rus', pp: 10 }]
      },
      hitmonlee: {
        name: 'Hitmonlee', emoji: '🦶', type: 'fighting', hp: 50, atk: 120, def: 53, spa: 35, spd: 110, spe: 87,
        learnset: [{ lv: 1, name: 'Inversión', pp: 15 }, { lv: 1, name: 'Doble Patada', pp: 30 }, { lv: 6, name: 'Meditación', pp: 40 }, { lv: 11, name: 'Patada Giro', pp: 15 }, { lv: 16, name: 'Patada Salto', pp: 25 }, { lv: 21, name: 'Demolición', pp: 20 }, { lv: 26, name: 'Foco Energía', pp: 30 }, { lv: 31, name: 'Patada Salto Alta', pp: 20 }, { lv: 36, name: 'Telépata', pp: 5 }, { lv: 41, name: 'Previsión', pp: 40 }, { lv: 46, name: 'Patada Ígnea', pp: 10 }, { lv: 51, name: 'Inversión', pp: 15 }, { lv: 56, name: 'Mega Patada', pp: 5 }]
      },
      hitmonchan: {
        name: 'Hitmonchan', emoji: '🥊', type: 'fighting', hp: 50, atk: 105, def: 79, spa: 35, spd: 110, spe: 76,
        learnset: [{ lv: 1, name: 'Venganza', pp: 10 }, { lv: 1, name: 'Puño Cometa', pp: 15 }, { lv: 7, name: 'Agilidad', pp: 30 }, { lv: 13, name: 'Persecución', pp: 20 }, { lv: 20, name: 'Ultrapuño', pp: 30 }, { lv: 26, name: 'Puño Fuego', pp: 15 }, { lv: 32, name: 'Puño Hielo', pp: 15 }, { lv: 38, name: 'Puño Trueno', pp: 15 }, { lv: 44, name: 'Gancho Alto', pp: 15 }, { lv: 50, name: 'Mega Puño', pp: 20 }]
      },
      lickitung: {
        name: 'Lickitung', emoji: '👅', type: 'normal', hp: 90, atk: 55, def: 75, spa: 60, spd: 75, spe: 30,
        learnset: [{ lv: 1, name: 'Lengüetazo', pp: 30 }, { lv: 7, name: 'Supersónico', pp: 20 }, { lv: 12, name: 'Rizo Defensa', pp: 40 }, { lv: 18, name: 'Desarme', pp: 20 }, { lv: 23, name: 'Pisotón', pp: 20 }, { lv: 29, name: 'Envolver', pp: 20 }, { lv: 34, name: 'Anulación', pp: 20 }, { lv: 40, name: 'Portazo', pp: 20 }, { lv: 45, name: 'Chirrido', pp: 20 }, { lv: 51, name: 'Alivio', pp: 20 }]
      },
      koffing: {
        name: 'Koffing', emoji: '💨', type: 'poison', hp: 40, atk: 65, def: 95, spa: 60, spd: 45, spe: 35,
        learnset: [{ lv: 1, name: 'Pozo Venenoso', pp: 40 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 9, name: 'Polución', pp: 20 }, { lv: 17, name: 'Autodestrucción', pp: 5 }, { lv: 21, name: 'Residuos', pp: 20 }, { lv: 25, name: 'Pantalla Humo', pp: 20 }, { lv: 33, name: 'Niebla', pp: 30 }, { lv: 41, name: 'Explosión', pp: 5 }, { lv: 45, name: 'Mismodestino', pp: 5 }, { lv: 49, name: 'Legado', pp: 10 }]
      },
      weezing: {
        name: 'Weezing', emoji: '💨', type: 'poison', hp: 65, atk: 90, def: 120, spa: 85, spd: 70, spe: 60,
        learnset: [{ lv: 1, name: 'Pozo Venenoso', pp: 40 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Polución', pp: 20 }, { lv: 1, name: 'Autodestrucción', pp: 5 }, { lv: 9, name: 'Polución', pp: 20 }, { lv: 17, name: 'Autodestrucción', pp: 5 }, { lv: 21, name: 'Residuos', pp: 20 }, { lv: 25, name: 'Pantalla Humo', pp: 20 }, { lv: 33, name: 'Niebla', pp: 30 }, { lv: 44, name: 'Explosión', pp: 5 }, { lv: 51, name: 'Mismodestino', pp: 5 }, { lv: 58, name: 'Legado', pp: 10 }]
      },
      rhyhorn: {
        name: 'Rhyhorn', emoji: '🦏', type: 'ground', hp: 80, atk: 85, def: 95, spa: 30, spd: 30, spe: 25,
        learnset: [{ lv: 1, name: 'Cornada', pp: 25 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 10, name: 'Pisotón', pp: 20 }, { lv: 15, name: 'Ataque Furia', pp: 20 }, { lv: 24, name: 'Cara Susto', pp: 10 }, { lv: 29, name: 'Pedrada', pp: 10 }, { lv: 38, name: 'Perforador', pp: 5 }, { lv: 43, name: 'Derribo', pp: 20 }, { lv: 52, name: 'Terremoto', pp: 10 }, { lv: 57, name: 'Megacuerno', pp: 10 }]
      },
      rhydon: {
        name: 'Rhydon', emoji: '🦏', type: 'ground', hp: 105, atk: 130, def: 120, spa: 45, spd: 45, spe: 40,
        learnset: [{ lv: 1, name: 'Cornada', pp: 25 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Pisotón', pp: 20 }, { lv: 1, name: 'Ataque Furia', pp: 20 }, { lv: 10, name: 'Pisotón', pp: 20 }, { lv: 15, name: 'Ataque Furia', pp: 20 }, { lv: 24, name: 'Cara Susto', pp: 10 }, { lv: 29, name: 'Pedrada', pp: 10 }, { lv: 38, name: 'Perforador', pp: 5 }, { lv: 46, name: 'Derribo', pp: 20 }, { lv: 58, name: 'Terremoto', pp: 10 }, { lv: 66, name: 'Megacuerno', pp: 10 }]
      },
      chansey: {
        name: 'Chansey', emoji: '🥚', type: 'normal', hp: 250, atk: 5, def: 5, spa: 35, spd: 105, spe: 50,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 5, name: 'Gruñido', pp: 40 }, { lv: 9, name: 'Látigo', pp: 30 }, { lv: 13, name: 'Doble Bofetón', pp: 10 }, { lv: 17, name: 'Canto', pp: 15 }, { lv: 23, name: 'Bomba Huevo', pp: 10 }, { lv: 29, name: 'Fortaleza', pp: 30 }, { lv: 35, name: 'Amortiguador', pp: 10 }]
      },
      tangela: {
        name: 'Tangela', emoji: '🌿', type: 'grass', hp: 65, atk: 55, def: 115, spa: 100, spd: 40, spe: 60,
        learnset: [{ lv: 1, name: 'Arraigo', pp: 20 }, { lv: 1, name: 'Constricción', pp: 35 }, { lv: 4, name: 'Somnífera', pp: 15 }, { lv: 7, name: 'Absorber', pp: 25 }, { lv: 10, name: 'Látigo Cepa', pp: 25 }, { lv: 13, name: 'Polvo Veneno', pp: 35 }, { lv: 19, name: 'Paralizador', pp: 30 }, { lv: 22, name: 'Megaagotar', pp: 15 }, { lv: 28, name: 'Gigadrenado', pp: 10 }, { lv: 31, name: 'Poder Pasado', pp: 5 }, { lv: 37, name: 'Portazo', pp: 20 }, { lv: 40, name: 'Cosquillas', pp: 20 }]
      },
      kangaskhan: {
        name: 'Kangaskhan', emoji: '🦘', type: 'normal', hp: 105, atk: 95, def: 80, spa: 40, spd: 80, spe: 90,
        learnset: [{ lv: 1, name: 'Puño Cometa', pp: 15 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 7, name: 'Mordisco', pp: 25 }, { lv: 13, name: 'Látigo', pp: 30 }, { lv: 19, name: 'Sorpresa', pp: 10 }, { lv: 25, name: 'Mega Puño', pp: 5 }, { lv: 31, name: 'Furia', pp: 20 }, { lv: 37, name: 'Aguante', pp: 10 }, { lv: 43, name: 'Puño Mareo', pp: 10 }, { lv: 49, name: 'Inversión', pp: 15 }]
      },
      horsea: {
        name: 'Horsea', emoji: '🐎', type: 'water', hp: 30, atk: 40, def: 70, spa: 70, spd: 25, spe: 60,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 8, name: 'Pantalla Humo', pp: 20 }, { lv: 15, name: 'Malicioso', pp: 30 }, { lv: 22, name: 'Pistola Agua', pp: 25 }, { lv: 29, name: 'Ciclón', pp: 20 }, { lv: 36, name: 'Agilidad', pp: 30 }, { lv: 43, name: 'Hidrobomba', pp: 5 }, { lv: 50, name: 'Danza Dragón', pp: 20 }]
      },
      seadra: {
        name: 'Seadra', emoji: '🐎', type: 'water', hp: 55, atk: 65, def: 95, spa: 95, spd: 45, spe: 85,
        learnset: [{ lv: 1, name: 'Burbuja', pp: 30 }, { lv: 1, name: 'Pantalla Humo', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 8, name: 'Pantalla Humo', pp: 20 }, { lv: 15, name: 'Malicioso', pp: 30 }, { lv: 22, name: 'Pistola Agua', pp: 25 }, { lv: 29, name: 'Ciclón', pp: 20 }, { lv: 36, name: 'Agilidad', pp: 30 }, { lv: 45, name: 'Hidrobomba', pp: 5 }, { lv: 54, name: 'Danza Dragón', pp: 20 }]
      },
      goldeen: {
        name: 'Goldeen', emoji: '🐟', type: 'water', hp: 45, atk: 67, def: 60, spa: 35, spd: 50, spe: 63,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Hidrochorro', pp: 15 }, { lv: 10, name: 'Supersónico', pp: 20 }, { lv: 15, name: 'Cornada', pp: 25 }, { lv: 24, name: 'Azote', pp: 15 }, { lv: 29, name: 'Cascada', pp: 15 }, { lv: 38, name: 'Perforador', pp: 5 }, { lv: 43, name: 'Agilidad', pp: 30 }, { lv: 52, name: 'Megacuerno', pp: 10 }]
      },
      seaking: {
        name: 'Seaking', emoji: '🐟', type: 'water', hp: 80, atk: 92, def: 65, spa: 65, spd: 80, spe: 68,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Hidrochorro', pp: 15 }, { lv: 1, name: 'Supersónico', pp: 20 }, { lv: 10, name: 'Supersónico', pp: 20 }, { lv: 15, name: 'Cornada', pp: 25 }, { lv: 24, name: 'Azote', pp: 15 }, { lv: 29, name: 'Cascada', pp: 15 }, { lv: 38, name: 'Perforador', pp: 5 }, { lv: 46, name: 'Agilidad', pp: 30 }, { lv: 58, name: 'Megacuerno', pp: 10 }]
      },
      staryu: {
        name: 'Staryu', emoji: '⭐', type: 'water', hp: 30, atk: 45, def: 55, spa: 70, spd: 55, spe: 85,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Fortaleza', pp: 30 }, { lv: 6, name: 'Pistola Agua', pp: 25 }, { lv: 10, name: 'Giro Rápido', pp: 40 }, { lv: 15, name: 'Recuperación', pp: 10 }, { lv: 19, name: 'Rapidez', pp: 20 }, { lv: 24, name: 'Rayo Burbuja', pp: 20 }, { lv: 28, name: 'Camuflaje', pp: 20 }, { lv: 33, name: 'Minimizar', pp: 20 }, { lv: 37, name: 'Pantalla de Luz', pp: 30 }, { lv: 42, name: 'Masa Cósmica', pp: 20 }, { lv: 46, name: 'Hidrobomba', pp: 5 }]
      },
      starmie: {
        name: 'Starmie', emoji: '⭐', type: 'water', hp: 60, atk: 75, def: 85, spa: 100, spd: 85, spe: 115,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Rapidez', pp: 20 }, { lv: 1, name: 'Recuperación', pp: 10 }, { lv: 1, name: 'Rayo Confuso', pp: 10 }]
      },
      mr_mime: {
        name: 'Mr. Mime', emoji: '🤡', type: 'psychic', hp: 40, atk: 45, def: 65, spa: 100, spd: 120, spe: 90,
        learnset: [{ lv: 1, name: 'Barrera', pp: 20 }, { lv: 1, name: 'Confusión', pp: 25 }, { lv: 5, name: 'Sustituto', pp: 10 }, { lv: 9, name: 'Meditación', pp: 40 }, { lv: 13, name: 'Doble Bofetón', pp: 30 }, { lv: 17, name: 'Pantalla de Luz', pp: 30 }, { lv: 17, name: 'Reflejo', pp: 20 }, { lv: 21, name: 'Otra Vez', pp: 5 }, { lv: 25, name: 'Psicorrayo', pp: 20 }, { lv: 29, name: 'Reciclaje', pp: 10 }, { lv: 33, name: 'Truco', pp: 10 }, { lv: 37, name: 'Intercambio', pp: 10 }, { lv: 41, name: 'Psíquico', pp: 10 }, { lv: 45, name: 'Relevo', pp: 40 }, { lv: 49, name: 'Velo Sagrado', pp: 25 }]
      },
      scyther: {
        name: 'Scyther', emoji: '🦗', type: 'bug', hp: 70, atk: 110, def: 80, spa: 55, spd: 80, spe: 105,
        learnset: [{ lv: 1, name: 'Ataque Rápido', pp: 30 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 6, name: 'Foco Energía', pp: 30 }, { lv: 11, name: 'Persecución', pp: 20 }, { lv: 16, name: 'Falso Tortazo', pp: 40 }, { lv: 21, name: 'Agilidad', pp: 30 }, { lv: 26, name: 'Ataque Ala', pp: 35 }, { lv: 31, name: 'Cuchillada', pp: 20 }, { lv: 36, name: 'Danza Espada', pp: 20 }, { lv: 41, name: 'Doble Equipo', pp: 15 }, { lv: 46, name: 'Corte Furia', pp: 20 }]
      },
      jynx: {
        name: 'Jynx', emoji: '💃', type: 'ice', hp: 65, atk: 50, def: 35, spa: 115, spd: 95, spe: 95,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Lengüetazo', pp: 30 }, { lv: 1, name: 'Beso Dulce', pp: 10 }, { lv: 1, name: 'Nieve Polvo', pp: 25 }, { lv: 9, name: 'Beso Dulce', pp: 10 }, { lv: 13, name: 'Nieve Polvo', pp: 25 }, { lv: 21, name: 'Doble Bofetón', pp: 30 }, { lv: 25, name: 'Puño Hielo', pp: 15 }, { lv: 35, name: 'Mal de Ojo', pp: 5 }, { lv: 41, name: 'Llantopanto', pp: 20 }, { lv: 51, name: 'Golpe Cuerpo', pp: 15 }, { lv: 57, name: 'Canto Mortal', pp: 5 }]
      },
      electabuzz: {
        name: 'Electabuzz', emoji: '⚡', type: 'electric', hp: 65, atk: 83, def: 57, spa: 95, spd: 85, spe: 105,
        learnset: [{ lv: 1, name: 'Ataque Rápido', pp: 30 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Puño Trueno', pp: 15 }, { lv: 9, name: 'Puño Trueno', pp: 15 }, { lv: 17, name: 'Pantalla de Luz', pp: 30 }, { lv: 25, name: 'Rapidez', pp: 20 }, { lv: 36, name: 'Chirrido', pp: 40 }, { lv: 47, name: 'Rayo', pp: 15 }, { lv: 58, name: 'Trueno', pp: 10 }]
      },
      magmar: {
        name: 'Magmar', emoji: '🔥', type: 'fire', hp: 65, atk: 95, def: 57, spa: 100, spd: 85, spe: 93,
        learnset: [{ lv: 1, name: 'Ascuas', pp: 25 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Puño Fuego', pp: 15 }, { lv: 7, name: 'Malicioso', pp: 30 }, { lv: 13, name: 'Polución', pp: 20 }, { lv: 19, name: 'Puño Fuego', pp: 15 }, { lv: 25, name: 'Pantalla Humo', pp: 20 }, { lv: 33, name: 'Día Soleado', pp: 5 }, { lv: 41, name: 'Lanzallamas', pp: 15 }, { lv: 49, name: 'Rayo Confuso', pp: 10 }, { lv: 57, name: 'Llamarada', pp: 5 }]
      },
      pinsir: {
        name: 'Pinsir', emoji: '🪲', type: 'bug', hp: 65, atk: 125, def: 100, spa: 55, spd: 70, spe: 85,
        learnset: [{ lv: 1, name: 'Tenaza', pp: 30 }, { lv: 1, name: 'Foco Energía', pp: 30 }, { lv: 7, name: 'Atadura', pp: 20 }, { lv: 13, name: 'Mov. Sísmico', pp: 20 }, { lv: 19, name: 'Fortaleza', pp: 30 }, { lv: 25, name: 'Venganza', pp: 10 }, { lv: 31, name: 'Demolición', pp: 20 }, { lv: 37, name: 'Guillotina', pp: 5 }, { lv: 43, name: 'Sumisión', pp: 25 }, { lv: 49, name: 'Danza Espada', pp: 20 }]
      },
      tauros: {
        name: 'Tauros', emoji: '🐂', type: 'normal', hp: 75, atk: 100, def: 95, spa: 40, spd: 70, spe: 110,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 4, name: 'Látigo', pp: 30 }, { lv: 8, name: 'Furia', pp: 20 }, { lv: 13, name: 'Cornada', pp: 25 }, { lv: 19, name: 'Cara Susto', pp: 10 }, { lv: 26, name: 'Persecución', pp: 20 }, { lv: 34, name: 'Contoneo', pp: 15 }, { lv: 43, name: 'Atizar', pp: 20 }, { lv: 53, name: 'Derribo', pp: 20 }]
      },
      magikarp: {
        name: 'Magikarp', emoji: '🐟', type: 'water', hp: 20, atk: 10, def: 55, spa: 15, spd: 20, spe: 80,
        learnset: [{ lv: 1, name: 'Salpicadura', pp: 40 }, { lv: 15, name: 'Placaje', pp: 35 }, { lv: 30, name: 'Azote', pp: 15 }]
      },
      gyarados: {
        name: 'Gyarados', emoji: '🐉', type: 'water', hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81,
        learnset: [{ lv: 1, name: 'Atizar', pp: 20 }, { lv: 1, name: 'Mordisco', pp: 25 }, { lv: 20, name: 'Mordisco', pp: 25 }, { lv: 25, name: 'Furia Dragón', pp: 10 }, { lv: 30, name: 'Malicioso', pp: 30 }, { lv: 35, name: 'Ciclón', pp: 20 }, { lv: 40, name: 'Hidrobomba', pp: 5 }, { lv: 45, name: 'Danza Lluvia', pp: 5 }, { lv: 50, name: 'Danza Dragón', pp: 20 }, { lv: 55, name: 'Hiperrayo', pp: 5 }]
      },
      lapras: {
        name: 'Lapras', emoji: '🌊', type: 'water', hp: 130, atk: 85, def: 80, spa: 85, spd: 95, spe: 60,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Canto', pp: 15 }, { lv: 7, name: 'Neblina', pp: 30 }, { lv: 13, name: 'Golpe Cuerpo', pp: 15 }, { lv: 19, name: 'Rayo Confuso', pp: 10 }, { lv: 25, name: 'Canto Mortal', pp: 5 }, { lv: 31, name: 'Rayo Hielo', pp: 10 }, { lv: 37, name: 'Danza Lluvia', pp: 5 }, { lv: 43, name: 'Velo Sagrado', pp: 25 }, { lv: 49, name: 'Hidrobomba', pp: 5 }, { lv: 55, name: 'Frío Polar', pp: 5 }]
      },
      ditto: {
        name: 'Ditto', emoji: 'blob', type: 'normal', hp: 48, atk: 48, def: 48, spa: 48, spd: 48, spe: 48,
        learnset: [{ lv: 1, name: 'Transformación', pp: 10 }]
      },
      vaporeon: {
        name: 'Vaporeon', emoji: '🧜', type: 'water', hp: 130, atk: 65, def: 60, spa: 110, spd: 95, spe: 65,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Refuerzo', pp: 20 }, { lv: 8, name: 'Ataque Arena', pp: 15 }, { lv: 16, name: 'Pistola Agua', pp: 25 }, { lv: 23, name: 'Ataque Rápido', pp: 30 }, { lv: 30, name: 'Mordisco', pp: 25 }, { lv: 36, name: 'Rayo Aurora', pp: 20 }, { lv: 42, name: 'Neblina', pp: 30 }, { lv: 47, name: 'Armadura Ácida', pp: 20 }, { lv: 52, name: 'Hidrobomba', pp: 5 }]
      },
      jolteon: {
        name: 'Jolteon', emoji: '⚡', type: 'electric', hp: 65, atk: 65, def: 60, spa: 110, spd: 95, spe: 130,
        learnset: [{ lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Refuerzo', pp: 20 }, { lv: 8, name: 'Ataque Arena', pp: 15 }, { lv: 16, name: 'Impactrueno', pp: 30 }, { lv: 23, name: 'Ataque Rápido', pp: 30 }, { lv: 30, name: 'Doble Patada', pp: 30 }, { lv: 36, name: 'Pin Misil', pp: 20 }, { lv: 42, name: 'Onda Trueno', pp: 20 }, { lv: 47, name: 'Agilidad', pp: 30 }, { lv: 52, name: 'Trueno', pp: 10 }]
      },
      flareon: {
        name: 'Flareon', emoji: '🔥', type: 'fire', hp: 65, atk: 130, def: 60, spa: 95, spd: 110, spe: 65,
        learnset: [{ lv: 1, name: 'Ascuas', pp: 25 }, { lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 1, name: 'Refuerzo', pp: 20 }, { lv: 8, name: 'Ataque Arena', pp: 15 }, { lv: 16, name: 'Ascuas', pp: 25 }, { lv: 23, name: 'Ataque Rápido', pp: 30 }, { lv: 30, name: 'Mordisco', pp: 25 }, { lv: 36, name: 'Giro Fuego', pp: 15 }, { lv: 42, name: 'Polución', pp: 20 }, { lv: 47, name: 'Cara Susto', pp: 10 }, { lv: 52, name: 'Llamarada', pp: 5 }]
      },
      porygon: {
        name: 'Porygon', emoji: '🦆', type: 'normal', hp: 65, atk: 60, def: 70, spa: 85, spd: 75, spe: 40,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Conversión 2', pp: 30 }, { lv: 1, name: 'Conversión', pp: 30 }, { lv: 9, name: 'Agilidad', pp: 30 }, { lv: 12, name: 'Psicorrayo', pp: 20 }, { lv: 20, name: 'Recuperación', pp: 10 }, { lv: 24, name: 'Electrorrayo', pp: 15 }, { lv: 32, name: 'Triataque', pp: 10 }, { lv: 36, name: 'Fijar Blanco', pp: 5 }, { lv: 44, name: 'Reciclaje', pp: 10 }, { lv: 48, name: 'Zap Cannon', pp: 5 }]
      },
      omanyte: {
        name: 'Omanyte', emoji: '🐚', type: 'rock', hp: 35, atk: 40, def: 100, spa: 90, spd: 55, spe: 35,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Refugio', pp: 40 }, { lv: 1, name: 'Constricción', pp: 35 }, { lv: 13, name: 'Mordisco', pp: 25 }, { lv: 19, name: 'Rayo Aurora', pp: 20 }, { lv: 25, name: 'Disparo Lodo', pp: 15 }, { lv: 31, name: 'Protección', pp: 10 }, { lv: 37, name: 'Foco Energía', pp: 30 }, { lv: 43, name: 'Cosquillas', pp: 20 }, { lv: 49, name: 'Poder Pasado', pp: 5 }, { lv: 55, name: 'Hidrobomba', pp: 5 }]
      },
      omastar: {
        name: 'Omastar', emoji: '🐚', type: 'rock', hp: 70, atk: 60, def: 125, spa: 115, spd: 70, spe: 55,
        learnset: [{ lv: 1, name: 'Pistola Agua', pp: 25 }, { lv: 1, name: 'Refugio', pp: 40 }, { lv: 1, name: 'Constricción', pp: 35 }, { lv: 1, name: 'Mordisco', pp: 25 }, { lv: 13, name: 'Mordisco', pp: 25 }, { lv: 19, name: 'Rayo Aurora', pp: 20 }, { lv: 25, name: 'Disparo Lodo', pp: 15 }, { lv: 31, name: 'Protección', pp: 10 }, { lv: 37, name: 'Foco Energía', pp: 30 }, { lv: 40, name: 'Clavo Cañón', pp: 15 }, { lv: 46, name: 'Cosquillas', pp: 20 }, { lv: 55, name: 'Poder Pasado', pp: 5 }, { lv: 65, name: 'Hidrobomba', pp: 5 }]
      },
      kabuto: {
        name: 'Kabuto', emoji: '🦀', type: 'rock', hp: 30, atk: 80, def: 90, spa: 55, spd: 45, spe: 55,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Fortaleza', pp: 30 }, { lv: 13, name: 'Absorber', pp: 25 }, { lv: 19, name: 'Malicioso', pp: 30 }, { lv: 25, name: 'Disparo Lodo', pp: 15 }, { lv: 31, name: 'Ataque Arena', pp: 15 }, { lv: 37, name: 'Aguante', pp: 10 }, { lv: 43, name: 'Defensa Férrea', pp: 15 }, { lv: 49, name: 'Megaagotar', pp: 15 }, { lv: 55, name: 'Poder Pasado', pp: 5 }]
      },
      kabutops: {
        name: 'Kabutops', emoji: '🦀', type: 'rock', hp: 60, atk: 115, def: 105, spa: 65, spd: 70, spe: 80,
        learnset: [{ lv: 1, name: 'Arañazo', pp: 35 }, { lv: 1, name: 'Fortaleza', pp: 30 }, { lv: 1, name: 'Absorber', pp: 25 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 13, name: 'Absorber', pp: 25 }, { lv: 19, name: 'Malicioso', pp: 30 }, { lv: 25, name: 'Disparo Lodo', pp: 15 }, { lv: 31, name: 'Ataque Arena', pp: 15 }, { lv: 37, name: 'Aguante', pp: 10 }, { lv: 40, name: 'Cuchillada', pp: 20 }, { lv: 46, name: 'Defensa Férrea', pp: 15 }, { lv: 55, name: 'Megaagotar', pp: 15 }, { lv: 65, name: 'Poder Pasado', pp: 5 }]
      },
      aerodactyl: {
        name: 'Aerodactyl', emoji: '🦕', type: 'rock', hp: 80, atk: 105, def: 65, spa: 60, spd: 75, spe: 130,
        learnset: [{ lv: 1, name: 'Ataque Ala', pp: 35 }, { lv: 8, name: 'Agilidad', pp: 30 }, { lv: 15, name: 'Mordisco', pp: 25 }, { lv: 22, name: 'Supersónico', pp: 20 }, { lv: 29, name: 'Poder Pasado', pp: 5 }, { lv: 36, name: 'Cara Susto', pp: 10 }, { lv: 43, name: 'Rugido', pp: 20 }, { lv: 50, name: 'Derribo', pp: 20 }, { lv: 57, name: 'Hiperrayo', pp: 5 }]
      },
      snorlax: {
        name: 'Snorlax', emoji: '💤', type: 'normal', hp: 160, atk: 110, def: 65, spa: 65, spd: 110, spe: 30,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 5, name: 'Amnesia', pp: 20 }, { lv: 9, name: 'Rizo Defensa', pp: 40 }, { lv: 13, name: 'Tambor', pp: 10 }, { lv: 17, name: 'Cabezazo', pp: 15 }, { lv: 21, name: 'Bostezo', pp: 10 }, { lv: 25, name: 'Descanso', pp: 10 }, { lv: 29, name: 'Ronquido', pp: 15 }, { lv: 33, name: 'Golpe Cuerpo', pp: 15 }, { lv: 37, name: 'Sonámbulo', pp: 10 }, { lv: 41, name: 'Bloqueo', pp: 5 }, { lv: 45, name: 'Golpe', pp: 10 }, { lv: 49, name: 'Desenrrollar', pp: 20 }, { lv: 53, name: 'Doble Filo', pp: 15 }]
      },
      articuno: {
        name: 'Articuno', emoji: '❄️', type: 'ice', hp: 90, atk: 85, def: 100, spa: 95, spd: 125, spe: 85,
        learnset: [{ lv: 1, name: 'Tornado', pp: 35 }, { lv: 1, name: 'Nieve Polvo', pp: 25 }, { lv: 13, name: 'Neblina', pp: 30 }, { lv: 25, name: 'Agilidad', pp: 30 }, { lv: 37, name: 'Telépata', pp: 5 }, { lv: 49, name: 'Rayo Hielo', pp: 10 }, { lv: 61, name: 'Reflejo', pp: 20 }, { lv: 73, name: 'Ventisca', pp: 5 }, { lv: 85, name: 'Frío Polar', pp: 5 }]
      },
      zapdos: {
        name: 'Zapdos', emoji: '⚡', type: 'electric', hp: 90, atk: 90, def: 85, spa: 125, spd: 90, spe: 100,
        learnset: [{ lv: 1, name: 'Picoteo', pp: 35 }, { lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 13, name: 'Onda Trueno', pp: 20 }, { lv: 25, name: 'Agilidad', pp: 30 }, { lv: 37, name: 'Detección', pp: 5 }, { lv: 49, name: 'Pico Taladro', pp: 20 }, { lv: 61, name: 'Carga', pp: 20 }, { lv: 73, name: 'Pantalla de Luz', pp: 30 }, { lv: 85, name: 'Trueno', pp: 10 }]
      },
      moltres: {
        name: 'Moltres', emoji: '🔥', type: 'fire', hp: 90, atk: 100, def: 90, spa: 125, spd: 85, spe: 90,
        learnset: [{ lv: 1, name: 'Ataque Ala', pp: 35 }, { lv: 1, name: 'Ascuas', pp: 25 }, { lv: 13, name: 'Giro Fuego', pp: 15 }, { lv: 25, name: 'Agilidad', pp: 30 }, { lv: 37, name: 'Aguante', pp: 10 }, { lv: 49, name: 'Lanzallamas', pp: 15 }, { lv: 61, name: 'Velo Sagrado', pp: 25 }, { lv: 73, name: 'Onda Ígnea', pp: 10 }, { lv: 85, name: 'Ataque Aéreo', pp: 5 }]
      },
      dratini: {
        name: 'Dratini', emoji: '🐉', type: 'dragon', hp: 41, atk: 64, def: 45, spa: 50, spd: 50, spe: 50,
        learnset: [{ lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 8, name: 'Onda Trueno', pp: 20 }, { lv: 15, name: 'Ciclón', pp: 20 }, { lv: 22, name: 'Furia Dragón', pp: 10 }, { lv: 29, name: 'Portazo', pp: 20 }, { lv: 36, name: 'Agilidad', pp: 30 }, { lv: 43, name: 'Velo Sagrado', pp: 25 }, { lv: 50, name: 'Enfado', pp: 15 }, { lv: 57, name: 'Hiperrayo', pp: 5 }]
      },
      dragonair: {
        name: 'Dragonair', emoji: '🐉', type: 'dragon', hp: 61, atk: 84, def: 65, spa: 70, spd: 70, spe: 70,
        learnset: [{ lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Onda Trueno', pp: 20 }, { lv: 1, name: 'Ciclón', pp: 20 }, { lv: 8, name: 'Onda Trueno', pp: 20 }, { lv: 15, name: 'Ciclón', pp: 20 }, { lv: 22, name: 'Furia Dragón', pp: 10 }, { lv: 29, name: 'Portazo', pp: 20 }, { lv: 38, name: 'Agilidad', pp: 30 }, { lv: 47, name: 'Velo Sagrado', pp: 25 }, { lv: 56, name: 'Enfado', pp: 15 }, { lv: 65, name: 'Hiperrayo', pp: 5 }]
      },
      dragonite: {
        name: 'Dragonite', emoji: '🐉', type: 'dragon', hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80,
        learnset: [{ lv: 1, name: 'Envolver', pp: 20 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 1, name: 'Onda Trueno', pp: 20 }, { lv: 1, name: 'Ciclón', pp: 20 }, { lv: 8, name: 'Onda Trueno', pp: 20 }, { lv: 15, name: 'Ciclón', pp: 20 }, { lv: 22, name: 'Furia Dragón', pp: 10 }, { lv: 29, name: 'Portazo', pp: 20 }, { lv: 38, name: 'Agilidad', pp: 30 }, { lv: 47, name: 'Velo Sagrado', pp: 25 }, { lv: 55, name: 'Ataque Ala', pp: 35 }, { lv: 61, name: 'Enfado', pp: 15 }, { lv: 75, name: 'Hiperrayo', pp: 5 }]
      },
      mewtwo: {
        name: 'Mewtwo', emoji: '🧬', type: 'psychic', hp: 106, atk: 110, def: 90, spa: 154, spd: 90, spe: 130,
        learnset: [{ lv: 1, name: 'Confusión', pp: 25 }, { lv: 1, name: 'Anulación', pp: 20 }, { lv: 1, name: 'Barrera', pp: 20 }, { lv: 11, name: 'Rapidez', pp: 20 }, { lv: 22, name: 'Psicorrayo', pp: 20 }, { lv: 33, name: 'Amnesia', pp: 20 }, { lv: 44, name: 'Recuperación', pp: 10 }, { lv: 55, name: 'Velo Sagrado', pp: 25 }, { lv: 66, name: 'Psíquico', pp: 10 }, { lv: 77, name: 'Más Psique', pp: 10 }, { lv: 88, name: 'Recuperación', pp: 10 }, { lv: 99, name: 'Amnesia', pp: 20 }]
      },
      mew: {
        name: 'Mew', emoji: '✨', type: 'psychic', hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100,
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 10, name: 'Transformación', pp: 10 }, { lv: 20, name: 'Megaagotar', pp: 15 }, { lv: 30, name: 'Metrónomo', pp: 10 }, { lv: 40, name: 'Psíquico', pp: 10 }, { lv: 50, name: 'Poder Pasado', pp: 5 }]
      },
      pichu: { 
        name: 'Pichu', emoji: '🐭', type: 'electric', 
        hp: 20, atk: 40, def: 15, spa: 35, spd: 35, spe: 60, 
        learnset: [{ lv: 1, name: 'Impactrueno', pp: 30 }, { lv: 1, name: 'Encanto', pp: 20 }, { lv: 6, name: 'Látigo', pp: 30 }, { lv: 8, name: 'Onda Trueno', pp: 20 }, { lv: 11, name: 'Beso Dulce', pp: 10 }] 
      },
      magby: { 
        name: 'Magby', emoji: '🔥', type: 'fire', 
        hp: 45, atk: 75, def: 37, spa: 70, spd: 55, spe: 83, 
        learnset: [{ lv: 1, name: 'Ascuas', pp: 25 }, { lv: 7, name: 'Malicioso', pp: 30 }, { lv: 13, name: 'Polución', pp: 20 }, { lv: 19, name: 'Puño Fuego', pp: 15 }] 
      },
      elekid: { 
        name: 'Elekid', emoji: '🔌', type: 'electric', 
        hp: 45, atk: 63, def: 37, spa: 65, spd: 55, spe: 95, 
        learnset: [{ lv: 1, name: 'Ataque Rápido', pp: 30 }, { lv: 1, name: 'Malicioso', pp: 30 }, { lv: 9, name: 'Impactrueno', pp: 30 }, { lv: 17, name: 'Puño Trueno', pp: 15 }] 
      },
      cleffa: { 
        name: 'Cleffa', emoji: '⭐', type: 'normal', 
        hp: 50, atk: 25, def: 28, spa: 45, spd: 55, spe: 15, 
        learnset: [{ lv: 1, name: 'Destructor', pp: 35 }, { lv: 1, name: 'Encanto', pp: 20 }, { lv: 4, name: 'Otra Vez', pp: 5 }, { lv: 8, name: 'Canto', pp: 15 }, { lv: 13, name: 'Beso Dulce', pp: 10 }] 
      },
      igglybuff: { 
        name: 'Igglybuff', emoji: '🎈', type: 'normal', 
        hp: 90, atk: 30, def: 15, spa: 40, spd: 20, spe: 15, 
        learnset: [{ lv: 1, name: 'Canto', pp: 15 }, { lv: 1, name: 'Encanto', pp: 20 }, { lv: 4, name: 'Rizo Defensa', pp: 40 }, { lv: 9, name: 'Destructor', pp: 35 }, { lv: 14, name: 'Beso Dulce', pp: 10 }] 
      },
      togepi: { 
        name: 'Togepi', emoji: '🥚', type: 'normal', 
        hp: 35, atk: 20, def: 65, spa: 40, spd: 65, spe: 20, 
        learnset: [{ lv: 1, name: 'Gruñido', pp: 40 }, { lv: 1, name: 'Encanto', pp: 20 }, { lv: 7, name: 'Metrónomo', pp: 10 }, { lv: 18, name: 'Beso Dulce', pp: 10 }] 
      },
      eevee: {
        name: 'Eevee', emoji: '🦊', type: 'normal',
        hp: 55, atk: 55, def: 50, spa: 45, spd: 65, spe: 55,
        learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 1, name: 'Látigo', pp: 30 }, { lv: 8, name: 'Ataque Arena', pp: 15 }, { lv: 16, name: 'Gruñido', pp: 40 }]
      },
    };

    // Get moves a pokemon knows at a given level (up to 4, most recent)
    // Get species history from base form to the given id
    function getSpeciesHistory(id) {
      const history = [id];
      let current = id;
      
      // We need to look up into the evolution tables (assumed global)
      // They are in 13_evolution.js, but since this runs after all scripts load, they should be available.
      const findPreEvo = (speciesId) => {
        if (typeof EVOLUTION_TABLE === 'undefined') return null;
        for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
          if (data.to === speciesId) return from;
        }
        if (typeof STONE_EVOLUTIONS !== 'undefined') {
          for (const [from, data] of Object.entries(STONE_EVOLUTIONS)) {
            if (data.to === speciesId) return from;
          }
        }
        if (typeof TRADE_EVOLUTIONS !== 'undefined') {
          for (const [from, to] of Object.entries(TRADE_EVOLUTIONS)) {
            if (to === speciesId) return from;
          }
        }
        return null;
      };

      let pre;
      while ((pre = findPreEvo(current))) {
        if (history.includes(pre)) break; // Prevent loops
        history.unshift(pre);
        current = pre;
      }
      return history;
    }

    // Get moves a pokemon knows at a given level (up to 4, most recent)
    // Now considers the entire evolution chain to avoid missing moves from pre-evolutions.
    function getMovesAtLevel(id, level) {
      const history = getSpeciesHistory(id);
      let allPotentialMoves = [];
      const seenNames = new Set();

      // Collect learnset from all ancestors + current species
      // Process in reverse (newest to oldest) to prefer evolved forms' levels? 
      // Actually, we want a pool of all moves it COULD have learned by reaching this level.
      history.forEach(spId => {
        const db = POKEMON_DB[spId];
        if (db && db.learnset) {
          db.learnset.forEach(m => {
            if (m.lv <= level) {
              allPotentialMoves.push(m);
            }
          });
        }
      });

      // Sort by level (ascending) to take the last 4
      allPotentialMoves.sort((a, b) => a.lv - b.lv);

      // Keep only unique move names, taking the one with highest level if duplicates
      const uniqueMoves = [];
      for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
        const m = allPotentialMoves[i];
        if (!seenNames.has(m.name)) {
          uniqueMoves.unshift(m);
          seenNames.add(m.name);
        }
      }

      const last4 = uniqueMoves.slice(-4);
      return last4.map(m => {
        const moveData = MOVE_DATA[m.name] || {};
        return { 
          name: m.name, 
          pp: m.pp || moveData.pp || 35, 
          maxPP: m.pp || moveData.pp || 35,
          type: moveData.type || 'normal',
          power: moveData.power || 0
        };
      });
    }

    window.FIRE_RED_MAPS = [
      {
        id: 'route1', name: 'Ruta 1', icon: '🌾', badges: 0, desc: 'Pueblo Paleta - Ciudad Verde.',
        wild: { morning: ['pidgey', 'rattata'], day: ['pidgey', 'rattata'], dusk: ['rattata', 'pidgey'], night: ['rattata', 'pidgey'] },
        rates: { morning: [50, 50], day: [50, 50], dusk: [70, 30], night: [90, 10] }, lv: [2, 5]
      },
      {
        id: 'route2', name: 'Ruta 2', icon: '🌿', badges: 0, desc: 'Ciudad Verde - Ciudad Plateada.',
        wild: { morning: ['pidgey', 'rattata', 'caterpie', 'weedle'], day: ['pidgey', 'rattata', 'caterpie', 'weedle'], dusk: ['rattata', 'zubat', 'nidoran_f'], night: ['rattata', 'zubat', 'nidoran_m'] },
        rates: { morning: [40, 40, 10, 10], day: [40, 40, 10, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [3, 5]
      },
      {
        id: 'forest', name: 'Bosque Viridian', icon: '🌲', badges: 0, desc: 'Hogar de bichos y el raro Pikachu.',
        wild: { morning: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu', 'nidoran_f', 'nidoran_m'], day: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu', 'nidoran_f', 'nidoran_m'], dusk: ['weedle', 'kakuna', 'pikachu', 'metapod'], night: ['zubat', 'pikachu', 'weedle', 'kakuna'] },
        rates: { morning: [30, 10, 30, 10, 10, 5, 5], day: [30, 10, 30, 10, 10, 5, 5], dusk: [40, 30, 20, 10], night: [50, 20, 20, 10] }, lv: [3, 6]
      },
      {
        id: 'route22', name: 'Ruta 22', icon: '🌾', badges: 0, desc: 'Camino a la Liga Pokémon.',
        wild: { morning: ['rattata', 'spearow', 'mankey', 'nidoran_m', 'nidoran_f'], day: ['rattata', 'spearow', 'mankey', 'nidoran_m', 'nidoran_f'], dusk: ['rattata', 'mankey'], night: ['rattata', 'mankey'] },
        rates: { morning: [30, 30, 10, 15, 15], day: [30, 30, 10, 15, 15], dusk: [50, 50], night: [70, 30] }, lv: [3, 5],
        fishing: { pool: ['magikarp', 'goldeen', 'poliwag'], rates: [40, 40, 20], lv: [1, 5] }
      },
      {
        id: 'route3', name: 'Ruta 3', icon: '⛰️', badges: 1, desc: 'Hacia el Mt. Moon.',
        wild: { morning: ['pidgey', 'spearow', 'jigglypuff', 'nidoran_m', 'nidoran_f', 'mankey'], day: ['pidgey', 'spearow', 'jigglypuff', 'nidoran_m', 'nidoran_f', 'mankey'], dusk: ['zubat', 'rattata', 'jigglypuff'], night: ['zubat', 'rattata', 'jigglypuff'] },
        rates: { morning: [30, 25, 15, 15, 10, 5], day: [30, 25, 15, 15, 10, 5], dusk: [50, 30, 20], night: [50, 30, 20] }, lv: [6, 12]
      },
      {
        id: 'mt_moon', name: 'Mt. Moon', icon: '🌋', badges: 1, desc: 'Cueva de fósiles y Clefairy.',
        wild: { morning: ['zubat', 'geodude', 'paras', 'clefairy'], day: ['zubat', 'geodude', 'paras', 'clefairy'], dusk: ['zubat', 'paras'], night: ['zubat', 'geodude', 'paras', 'clefairy'] },
        rates: { morning: [60, 25, 10, 5], day: [60, 25, 10, 5], dusk: [70, 30], night: [50, 30, 15, 5] }, lv: [8, 12]
      },
      {
        id: 'route4', name: 'Ruta 4', icon: '🍃', badges: 1, desc: 'Salida de la cueva.',
        wild: { morning: ['rattata', 'spearow', 'ekans', 'sandshrew', 'mankey'], day: ['rattata', 'spearow', 'ekans', 'sandshrew', 'mankey'], dusk: ['rattata', 'ekans', 'mankey'], night: ['rattata', 'sandshrew', 'ekans'] },
        rates: { morning: [25, 25, 20, 20, 10], day: [25, 25, 20, 20, 10], dusk: [50, 30, 20], night: [50, 30, 20] }, lv: [10, 14]
      },
      {
        id: 'route24', name: 'Ruta 24', icon: '🌉', badges: 2, desc: 'Puente Pepita.',
        wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'abra', 'venonat'], day: ['pidgey', 'oddish', 'bellsprout', 'abra', 'venonat'], dusk: ['oddish', 'venonat', 'abra'], night: ['oddish', 'meowth', 'abra'] },
        rates: { morning: [25, 25, 25, 15, 10], day: [25, 25, 25, 15, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [12, 16],
        fishing: { pool: ['psyduck', 'krabby', 'horsea'], rates: [35, 35, 30], lv: [1, 5] }
      },
      {
        id: 'route25', name: 'Ruta 25', icon: '🏠', badges: 2, desc: 'Cerca de la casa de Bill.',
        wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'abra', 'metapod', 'kakuna'], day: ['pidgey', 'oddish', 'bellsprout', 'abra', 'metapod', 'kakuna'], dusk: ['abra', 'venonat'], night: ['abra', 'meowth'] },
        rates: { morning: [20, 20, 20, 10, 15, 15], day: [20, 20, 20, 10, 15, 15], dusk: [50, 50], night: [50, 50] }, lv: [12, 16]
      },
      {
        id: 'route5', name: 'Ruta 5', icon: '🌾', badges: 2, desc: 'Hacia Ciudad Azafrán.',
        wild: { morning: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'abra', 'tangela', 'mr_mime'], day: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'abra', 'tangela', 'mr_mime'], dusk: ['meowth', 'abra', 'tangela'], night: ['meowth', 'abra', 'mr_mime'] },
        rates: { morning: [25, 20, 15, 15, 15, 8, 2], day: [25, 20, 15, 15, 15, 8, 2], dusk: [50, 35, 15], night: [55, 35, 10] }, lv: [13, 16]
      },
      {
        id: 'route6', name: 'Ruta 6', icon: '🌾', badges: 2, desc: 'Conecta Celeste con Carmín.',
        wild: { morning: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'psyduck', 'mankey', 'tangela'], day: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'psyduck', 'mankey', 'tangela'], dusk: ['meowth', 'psyduck', 'tangela'], night: ['meowth', 'psyduck'] },
        rates: { morning: [20, 18, 13, 13, 13, 13, 10], day: [20, 18, 13, 13, 13, 13, 10], dusk: [45, 40, 15], night: [60, 40] }, lv: [13, 16],
        fishing: { pool: ['slowpoke', 'shellder', 'poliwhirl'], rates: [45, 45, 10], lv: [10, 15] }
      },
      {
        id: 'route11', name: 'Ruta 11', icon: '🌾', badges: 3, desc: 'Al este de Carmín.',
        wild: { morning: ['spearow', 'ekans', 'sandshrew', 'drowzee'], day: ['spearow', 'ekans', 'sandshrew', 'drowzee'], dusk: ['drowzee', 'spearow'], night: ['drowzee', 'hypno'] },
        rates: { morning: [25, 25, 25, 25], day: [25, 25, 25, 25], dusk: [70, 30], night: [90, 10] }, lv: [15, 19]
      },
      {
        id: 'diglett_cave', name: 'Cueva Diglett', icon: '🕳️', badges: 2, desc: 'Atajo bajo tierra.',
        wild: { morning: ['diglett', 'dugtrio'], day: ['diglett', 'dugtrio'], dusk: ['diglett'], night: ['diglett', 'dugtrio'] },
        rates: { morning: [95, 5], day: [95, 5], dusk: [100], night: [98, 2] }, lv: [15, 31]
      },
      {
        id: 'route9', name: 'Ruta 9', icon: '⛰️', badges: 3, desc: 'Hacia el Túnel Roca.',
        wild: { morning: ['spearow', 'rattata', 'ekans', 'sandshrew', 'nidoran_m', 'nidoran_f'], day: ['spearow', 'rattata', 'ekans', 'sandshrew', 'nidoran_m', 'nidoran_f'], dusk: ['zubat', 'rattata'], night: ['zubat', 'rattata'] },
        rates: { morning: [20, 20, 15, 15, 15, 15], day: [20, 20, 15, 15, 15, 15], dusk: [60, 40], night: [70, 30] }, lv: [14, 18]
      },
      {
        id: 'rock_tunnel', name: 'Túnel Roca', icon: '🔦', badges: 3, desc: 'Oscuridad total.',
        wild: { morning: ['zubat', 'geodude', 'machop', 'onix'], day: ['zubat', 'geodude', 'machop', 'onix'], dusk: ['zubat', 'geodude'], night: ['zubat', 'geodude', 'machop', 'onix'] },
        rates: { morning: [50, 40, 5, 5], day: [50, 40, 5, 5], dusk: [60, 40], night: [50, 35, 10, 5] }, lv: [16, 21]
      },
      {
        id: 'route10', name: 'Ruta 10', icon: '⚡', badges: 3, desc: 'Cerca de la Central Energía.',
        wild: { morning: ['spearow', 'ekans', 'sandshrew', 'voltorb', 'magnemite'], day: ['spearow', 'ekans', 'sandshrew', 'voltorb', 'magnemite'], dusk: ['magnemite', 'voltorb'], night: ['magnemite', 'voltorb'] },
        rates: { morning: [20, 20, 20, 20, 20], day: [20, 20, 20, 20, 20], dusk: [50, 50], night: [60, 40] }, lv: [16, 20]
      },
      {
        id: 'power_plant', name: 'Central Energía', icon: '⚡', badges: 5, desc: 'Hogar del legendario Zapdos.',
        wild: { morning: ['pikachu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz'], day: ['pikachu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz'], dusk: ['magnemite', 'voltorb'], night: ['magneton', 'electrode', 'electabuzz'] },
        rates: { morning: [25, 25, 10, 20, 10, 10], day: [25, 25, 10, 20, 10, 10], dusk: [50, 50], night: [40, 40, 20] }, lv: [30, 35]
      },
      {
        id: 'route8', name: 'Ruta 8', icon: '🌾', badges: 4, desc: 'Conecta Lavanda con Azafrán.',
        wild: { morning: ['pidgey', 'meowth', 'ekans', 'sandshrew', 'growlithe', 'vulpix', 'abra', 'tangela', 'mr_mime', 'lickitung'], day: ['pidgey', 'meowth', 'ekans', 'sandshrew', 'growlithe', 'vulpix', 'abra', 'tangela', 'mr_mime', 'lickitung'], dusk: ['meowth', 'abra', 'kadabra', 'tangela'], night: ['meowth', 'abra', 'kadabra', 'lickitung'] },
        rates: { morning: [18, 15, 13, 13, 10, 10, 10, 8, 2, 1], day: [18, 15, 13, 13, 10, 10, 10, 8, 2, 1], dusk: [38, 35, 20, 7], night: [40, 35, 20, 5] }, lv: [18, 22]
      },
      {
        id: 'pokemon_tower', name: 'Torre Pokémon', icon: '👻', badges: 4, desc: 'Descanso de los Pokémon.',
        wild: { morning: ['gastly'], day: ['gastly'], dusk: ['gastly', 'haunter'], night: ['gastly', 'haunter', 'cubone'] },
        rates: { morning: [100], day: [100], dusk: [80, 20], night: [70, 20, 10] }, lv: [20, 25]
      },
      {
        id: 'route12', name: 'Ruta 12', icon: '🌊', badges: 4, desc: 'Vía marítima.',
        wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'venonat', 'weepinbell', 'gloom', 'snorlax', 'farfetchd'], day: ['pidgey', 'oddish', 'bellsprout', 'venonat', 'weepinbell', 'gloom', 'snorlax', 'farfetchd'], dusk: ['venonat', 'zubat', 'farfetchd'], night: ['venonat', 'zubat', 'golbat'] },
        rates: { morning: [18, 18, 18, 13, 10, 10, 5, 8], day: [18, 18, 18, 13, 10, 10, 5, 8], dusk: [55, 35, 10], night: [50, 40, 10] }, lv: [22, 26],
        fishing: { pool: ['tentacool', 'seel', 'staryu'], rates: [40, 40, 20], lv: [10, 15] }
      },
      {
        id: 'route13', name: 'Ruta 13', icon: '🌾', badges: 5, desc: 'Laberinto de vallas.',
        wild: { morning: ['pidgey', 'pidgeotto', 'oddish', 'bellsprout', 'venonat', 'ditto', 'farfetchd'], day: ['pidgey', 'pidgeotto', 'oddish', 'bellsprout', 'venonat', 'ditto', 'farfetchd'], dusk: ['venonat', 'ditto', 'farfetchd'], night: ['venonat', 'ditto'] },
        rates: { morning: [18, 8, 18, 18, 18, 10, 10], day: [18, 8, 18, 18, 18, 10, 10], dusk: [50, 35, 15], night: [60, 40] }, lv: [24, 28]
      },
      {
        id: 'safari_zone', name: 'Zona Safari', icon: '🦒', badges: 5, desc: 'Pokémon raros de todo el mundo.',
        wild: { morning: ['nidoran_f', 'nidoran_m', 'parasect', 'venomoth', 'scyther', 'pinsir', 'chansey', 'tauros', 'kangaskhan', 'exeggcute', 'rhyhorn', 'slowpoke', 'lickitung', 'poliwag'], day: ['nidoran_f', 'nidoran_m', 'parasect', 'venomoth', 'scyther', 'pinsir', 'chansey', 'tauros', 'kangaskhan', 'exeggcute', 'rhyhorn', 'slowpoke', 'lickitung', 'poliwag'], dusk: ['venomoth', 'parasect', 'slowpoke'], night: ['venomoth', 'parasect', 'slowpoke', 'chansey'] },
        rates: { morning: [8, 8, 8, 8, 5, 5, 5, 5, 5, 15, 10, 8, 5, 5], day: [8, 8, 8, 8, 5, 5, 5, 5, 5, 15, 10, 8, 5, 5], dusk: [45, 40, 15], night: [30, 30, 20, 20] }, lv: [25, 35],
        fishing: { pool: ['seaking', 'dratini', 'dragonair'], rates: [90, 8, 2], lv: [30, 35] }
      },
      {
        id: 'seafoam_islands', name: 'Islas Espuma', icon: '❄️', badges: 6, desc: 'Cueva de hielo y Articuno.',
        wild: { morning: ['seel', 'dewgong', 'shellder', 'horsea', 'krabby', 'golduck', 'slowbro', 'jynx'], day: ['seel', 'dewgong', 'shellder', 'horsea', 'krabby', 'golduck', 'slowbro', 'jynx'], dusk: ['seel', 'shellder'], night: ['seel', 'dewgong', 'staryu'] },
        rates: { morning: [20, 10, 15, 15, 15, 10, 10, 5], day: [20, 10, 15, 15, 15, 10, 10, 5], dusk: [60, 40], night: [50, 30, 20] }, lv: [30, 40],
        fishing: { pool: ['shellder', 'dewgong', 'tentacruel'], rates: [50, 25, 25], lv: [30, 40] }
      },
      {
        id: 'mansion', name: 'Mansión Pokémon', icon: '🏚️', badges: 7, desc: 'Laboratorio quemado.',
        wild: { morning: ['koffing', 'weezing', 'grimer', 'muk', 'ponyta', 'rapidash', 'magmar', 'vulpix', 'growlithe'], day: ['koffing', 'weezing', 'grimer', 'muk', 'ponyta', 'rapidash', 'magmar', 'vulpix', 'growlithe'], dusk: ['koffing', 'grimer', 'magmar'], night: ['weezing', 'muk', 'magmar'] },
        rates: { morning: [15, 10, 15, 10, 15, 10, 5, 10, 10], day: [15, 10, 15, 10, 15, 10, 5, 10, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [32, 38]
      },
      {
        id: 'route23', name: 'Ruta 23', icon: '⛰️', badges: 8, desc: 'Acceso a Calle Victoria.',
        wild: { morning: ['spearow', 'fearow', 'ekans', 'arbok', 'sandshrew', 'sandslash', 'mankey', 'primeape'], day: ['spearow', 'fearow', 'ekans', 'arbok', 'sandshrew', 'sandslash', 'mankey', 'primeape'], dusk: ['fearow', 'arbok'], night: ['sandslash', 'primeape'] },
        rates: { morning: [15, 10, 15, 10, 15, 10, 15, 10], day: [15, 10, 15, 10, 15, 10, 15, 10], dusk: [50, 50], night: [50, 50] }, lv: [40, 45]
      },
      {
        id: 'victory_road', name: 'Calle Victoria', icon: '⛰️', badges: 8, desc: 'El desafío final.',
        wild: { morning: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'], day: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'], dusk: ['machoke', 'graveler', 'onix'], night: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'] },
        rates: { morning: [15, 15, 15, 15, 10, 10, 10, 10], day: [15, 15, 15, 15, 10, 10, 10, 10], dusk: [40, 30, 30], night: [15, 15, 15, 15, 10, 10, 10, 10] }, lv: [42, 50]
      },
      {
        id: 'cerulean_cave', name: 'Cueva Celeste', icon: '✨', badges: 8, desc: 'Lugar de descanso de Mewtwo.',
        wild: { morning: ['kadabra', 'rhydon', 'golduck', 'magneton', 'parasect', 'venomoth', 'dragonair'], day: ['kadabra', 'rhydon', 'golduck', 'magneton', 'parasect', 'venomoth', 'dragonair'], dusk: ['kadabra', 'magneton'], night: ['kadabra', 'magneton', 'dragonite'] },
        rates: { morning: [15, 15, 15, 15, 15, 15, 10], day: [15, 15, 15, 15, 15, 15, 10], dusk: [50, 50], night: [40, 40, 20] }, lv: [50, 65],
        fishing: { pool: ['golduck', 'poliwhirl', 'gyarados'], rates: [50, 40, 10], lv: [30, 50] }
      }
    ];

    const GYMS = [
      {
        id: 'pewter', name: 'Gimnasio Plateada', city: 'Ciudad Plateada',
        leader: 'Brock', type: 'rock', typeColor: '#c8a060',
        badge: '💎', badgeName: 'Medalla Roca',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/brock.png',
        quote: '¡Mis Pokémon de roca tienen una defensa impenetrable!',
        victoryQuote: 'Hay muchos tipos de entrenadores en el mundo... Tú pareces ser uno con un gran futuro. Toma esto, te ayudará en tu viaje.',
        rewardTM: 'MT39 Tumba Rocas',
        pokemon: ['geodude', 'onix'], levels: [12, 14], badgesRequired: 0,
        difficulties: {
          easy: { pokemon: ['geodude', 'onix'], levels: [12, 14] },
          normal: { pokemon: ['graveler', 'rhyhorn', 'omanyte', 'onix'], levels: [28, 30, 30, 32] },
          hard: { pokemon: ['golem', 'rhydon', 'omastar', 'kabutops', 'aerodactyl', 'onix'], levels: [62, 64, 64, 64, 65, 68] }
        }
      },
      {
        id: 'cerulean', name: 'Gimnasio Celeste', city: 'Ciudad Celeste',
        leader: 'Misty', type: 'water', typeColor: '#3B8BFF',
        badge: '💧', badgeName: 'Medalla Cascada',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/misty.png',
        quote: '¡Soy la chica sensacional del agua! ¡No te voy a perdonar!',
        victoryQuote: '¡Vaya! Eres mucho más fuerte de lo que pareces. Mi estrategia no fue suficiente... ¡Espero que esta MT te sea de utilidad!',
        rewardTM: 'MT03 Pulso Agua',
        pokemon: ['staryu', 'starmie'], levels: [18, 21], badgesRequired: 1,
        difficulties: {
          easy: { pokemon: ['staryu', 'starmie'], levels: [18, 21] },
          normal: { pokemon: ['golduck', 'seadra', 'dewgong', 'starmie'], levels: [35, 37, 38, 40] },
          hard: { pokemon: ['lapras', 'vaporeon', 'gyarados', 'blastoise', 'cloyster', 'starmie'], levels: [65, 67, 67, 68, 68, 70] }
        }
      },
      {
        id: 'vermilion', name: 'Gimnasio Carmín', city: 'Ciudad Carmín',
        leader: 'Lt. Surge', type: 'electric', typeColor: '#FFD93D',
        badge: '⚡', badgeName: 'Medalla Trueno',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/ltsurge.png',
        quote: '¡La electricidad es el arma definitiva! ¡Nunca me han derrotado!',
        victoryQuote: '¡Maldita sea! ¡Me has dejado frito! Eres un recluta de primera, sí señor. ¡Lleva esto contigo al campo de batalla!',
        rewardTM: 'MT24 Rayo',
        pokemon: ['voltorb', 'pikachu', 'raichu'], levels: [21, 24, 28], badgesRequired: 2,
        difficulties: {
          easy: { pokemon: ['voltorb', 'pikachu', 'raichu'], levels: [21, 24, 28] },
          normal: { pokemon: ['electrode', 'magneton', 'electabuzz', 'raichu'], levels: [42, 44, 46, 50] },
          hard: { pokemon: ['jolteon', 'magneton', 'electabuzz', 'electrode', 'porygon', 'raichu'], levels: [68, 70, 70, 72, 72, 75] }
        }
      },
      {
        id: 'celadon', name: 'Gimnasio Celacanto', city: 'Ciudad Celacanto',
        leader: 'Erika', type: 'grass', typeColor: '#6BCB77',
        badge: '🌿', badgeName: 'Medalla Arcoíris',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/erika.png',
        quote: '¡Mis Pokémon de planta son tan hermosos como poderosos!',
        victoryQuote: 'Vaya, me has derrotado... Tu valor es admirable. Por favor, acepta esta humilde muestra de mi respeto.',
        rewardTM: 'MT19 Gigadrenado',
        pokemon: ['victreebel', 'tangela', 'vileplume'], levels: [29, 24, 29], badgesRequired: 3,
        difficulties: {
          easy: { pokemon: ['victreebel', 'tangela', 'vileplume'], levels: [29, 24, 29] },
          normal: { pokemon: ['victreebel', 'tangela', 'exeggutor', 'vileplume'], levels: [48, 46, 48, 52] },
          hard: { pokemon: ['venusaur', 'exeggutor', 'victreebel', 'tangela', 'parasect', 'vileplume'], levels: [72, 74, 74, 74, 74, 76] }
        }
      },
      {
        id: 'fuchsia', name: 'Gimnasio Fucsia', city: 'Ciudad Fucsia',
        leader: 'Koga', type: 'poison', typeColor: '#C77DFF',
        badge: '☠️', badgeName: 'Medalla Alma',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/koga.png',
        quote: '¡El veneno es el arma más elegante de un ninja Pokémon!',
        victoryQuote: '¡Jajaja! Mis técnicas ninja han sido superadas. Has demostrado una gran tenacidad. ¡Usa esta técnica secreta con sabiduría!',
        rewardTM: 'MT06 Tóxico',
        pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43], badgesRequired: 4,
        difficulties: {
          easy: { pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43] },
          normal: { pokemon: ['golbat', 'venomoth', 'muk', 'weezing'], levels: [54, 56, 58, 62] },
          hard: { pokemon: ['gengar', 'muk', 'venomoth', 'tentacruel', 'arbok', 'weezing'], levels: [74, 76, 76, 76, 76, 80] }
        }
      },
      {
        id: 'saffron', name: 'Gimnasio Azafrán', city: 'Ciudad Azafrán',
        leader: 'Sabrina', type: 'psychic', typeColor: '#FF6EFF',
        badge: '🔮', badgeName: 'Medalla Marsh',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/sabrina.png',
        quote: '¡Puedo leer tu mente y ver cada uno de tus movimientos!',
        victoryQuote: 'Lo predije... Tu victoria estaba escrita en las estrellas. Toma esto, desarrolla tu fuerza interior tanto como la de tus Pokémon.',
        rewardTM: 'MT04 Paz Mental',
        pokemon: ['kadabra', 'mr_mime', 'jynx', 'alakazam'], levels: [38, 37, 38, 43], badgesRequired: 5,
        difficulties: {
          easy: { pokemon: ['kadabra', 'mr_mime', 'jynx', 'alakazam'], levels: [38, 37, 38, 43] },
          normal: { pokemon: ['kadabra', 'mr_mime', 'jynx', 'alakazam'], levels: [58, 56, 58, 62] },
          hard: { pokemon: ['hypno', 'slowbro', 'jynx', 'mr_mime', 'exeggutor', 'alakazam'], levels: [78, 78, 78, 78, 78, 82] }
        }
      },
      {
        id: 'cinnabar', name: 'Gimnasio Canela', city: 'Isla Canela',
        leader: 'Blaine', type: 'fire', typeColor: '#FF6B35',
        badge: '🔥', badgeName: 'Medalla Volcán',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/blaine.png',
        quote: '¡Si no podés soportar el calor, ¡salí de mi gimnasio!',
        victoryQuote: '¡Fuego! ¡Me has quemado vivo! ¡Qué combate más ardiente! ¡Lleva esta MT y haz que tu pasión arda con la misma intensidad!',
        rewardTM: 'MT38 Llamarada',
        pokemon: ['growlithe', 'ponyta', 'rapidash', 'arcanine'], levels: [42, 40, 42, 47], badgesRequired: 6,
        difficulties: {
          easy: { pokemon: ['growlithe', 'ponyta', 'rapidash', 'arcanine'], levels: [42, 40, 42, 47] },
          normal: { pokemon: ['magmar', 'ninetales', 'rapidash', 'arcanine'], levels: [62, 60, 62, 66] },
          hard: { pokemon: ['flareon', 'magmar', 'ninetales', 'rapidash', 'charizard', 'arcanine'], levels: [80, 82, 82, 82, 83, 85] }
        }
      },
      {
        id: 'viridian', name: 'Gimnasio Verde', city: 'Ciudad Verde',
        leader: 'Giovanni', type: 'ground', typeColor: '#c8a060',
        badge: '🌍', badgeName: 'Medalla Tierra',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/giovanni.png',
        quote: '¡Seré el último y más difícil obstáculo en tu camino!',
        victoryQuote: 'He perdido... Una vez más. Tu fuerza es incuestionable. No tengo nada más que enseñarte por ahora. Toma esto y sigue tu camino.',
        rewardTM: 'MT26 Terremoto',
        pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50], badgesRequired: 7,
        difficulties: {
          easy: { pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50] },
          normal: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [65, 66, 67, 70] },
          hard: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'marowak', 'sandslash', 'rhydon'], levels: [85, 87, 87, 87, 87, 90] }
        }
      },
    ];

    const // Categories: 'physical' | 'special' | 'status'
      // Effects: 'stat_drop_enemy_atk' | 'stat_drop_enemy_def' | 'stat_drop_enemy_spe' | 'stat_drop_enemy_spa' | 'stat_drop_enemy_spd'
      //          'stat_up_player_atk' | 'stat_up_player_def' | 'stat_up_player_spa' | 'stat_up_player_spd' | 'stat_up_player_spe'
      //          'stat_up_player_evasion' | 'burn' | 'paralyze' | 'poison' | 'sleep' | 'freeze'
      //          'drain_half' | 'recharge' | 'flinch_30' | 'confuse_30'
      // In Gen 1: Normal/Fighting/Flying/Poison/Ground/Rock/Bug/Ghost = physical; Fire/Water/Grass/Electric/Ice/Psychic/Dragon = special
      MOVE_DATA = {
        'Placaje': { power: 35, acc: 95, type: 'normal', cat: 'physical', pp: 35 },
        'Ataque Rápido': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 30, priority: 1 },
        'Hiperrayo': { power: 150, acc: 90, type: 'normal', cat: 'special', pp: 5, effect: 'recharge' },
        'Doble Filo': { power: 120, acc: 100, type: 'normal', cat: 'physical', pp: 15, recoil: 3 },
        'Cuerpo Pesado': { power: 85, acc: 100, type: 'normal', cat: 'physical', pp: 15 },
        'Explosión': { power: 250, acc: 100, type: 'normal', cat: 'physical', pp: 5, selfKO: true },
        'Autodestrucción': { power: 200, acc: 100, type: 'normal', cat: 'physical', pp: 5, selfKO: true },
        'Hiper Colmillo': { power: 65, acc: 95, type: 'normal', cat: 'physical', pp: 15, effect: 'flinch_10' },
        'Mordisco': { power: 60, acc: 100, type: 'dark', cat: 'physical', pp: 25, effect: 'flinch_30' },
        'Cuchillada': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 30 },
        'Bofetón Lodo': { power: 20, acc: 100, type: 'ground', cat: 'special', pp: 20, effect: 'stat_down_enemy_acc' },
        'Doble Bofetón': { power: 15, acc: 85, type: 'normal', cat: 'physical', pp: 10, hits: '2-5' },
        'Pisotón': { power: 65, acc: 100, type: 'normal', cat: 'physical', pp: 20, effect: 'flinch_30' },
        'Doble Patada': { power: 30, acc: 100, type: 'fighting', cat: 'physical', pp: 30, hits: 2 },
        'Portazo': { power: 80, acc: 75, type: 'normal', cat: 'physical', pp: 20 },
        'Golpe Cuerpo': { power: 85, acc: 100, type: 'normal', cat: 'physical', pp: 15, effect: 'paralyze_30' },
        'Retribución': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 20, effect: 'status_boost' },
        'Enfado': { power: 120, acc: 100, type: 'dragon', cat: 'physical', pp: 15, effect: 'thrash' },
        'Derribo': { power: 90, acc: 85, type: 'normal', cat: 'physical', pp: 20, recoil: 4 },
        'Destructor': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 35 },
        'Golpe': { power: 120, acc: 100, type: 'normal', cat: 'physical', pp: 10, effect: 'thrash' },
        'Ataque': { power: 35, acc: 95, type: 'normal', cat: 'physical', pp: 35 },
        'Puño Lodo': {'power':55,'acc':100,'type':'ground','cat':'special','pp':10,'effect':'stat_down_enemy_acc_30'},
        'Patada Ígnea': { power: 85, acc: 90, type: 'fire', cat: 'physical', pp: 10, effect: 'burn_10' },
        'Patada Salto Alta': { power: 130, acc: 90, type: 'fighting', cat: 'physical', pp: 10, recoil: true },
        'Patada Salto': { power: 100, acc: 95, type: 'fighting', cat: 'physical', pp: 10, recoil: true },
        'Picotazo': {'power':35,'acc':100,'type':'flying','cat':'physical','pp':35},
        'Pájaro Osado': {'power':120,'acc':100,'type':'flying','cat':'physical','pp':15,'recoil':3},
        'Golpe Cabeza': {'power':70,'acc':100,'type':'normal','cat':'physical','pp':15,'effect':'flinch_30'},
        'Engullir': {'power':40,'acc':100,'type':'normal', 'cat':'special', 'pp':20, 'drain':true},
        'Puño Cometa': { power: 18, acc: 85, type: 'normal', cat: 'physical', pp: 15, hits: '2-5' },
        'Bomba Huevo': {'power':100,'acc':75,'type':'normal','cat':'physical','pp':10},
        'Alboroto': { power: 90, acc: 100, type: 'normal', cat: 'special', pp: 10, sound: true },
        'Triturar': { power: 80, acc: 100, type: 'dark', cat: 'physical', pp: 15, effect: 'stat_down_enemy_spd_20' },
        'Gruñido': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 40, effect: 'stat_down_enemy_atk' },
        'Dulce Aroma': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_down_enemy_eva' },
        'Ataque Furia': { power: 15, acc: 85, type: 'normal', cat: 'physical', pp: 20, hits: '2-5' },
        'Esfuerzo': { power: 1, acc: 100, type: 'normal', cat: 'physical', pp: 5 },
        'Persecución': { power: 40, acc: 100, type: 'dark', cat: 'physical', pp: 20 },
        'Espejo': { power: 0, acc: 100, type: 'flying', cat: 'status', pp: 20, effect: 'mirror_move' },
        'Paralizador': { power: 0, acc: 75, type: 'grass', cat: 'status', pp: 30, effect: 'paralyze' },
        'Disparo Demora': { power: 0, acc: 95, type: 'bug', cat: 'status', pp: 40, effect: 'stat_down_enemy_spe' },
        'Bucle Arena': { power: 35, acc: 85, type: 'ground', cat: 'physical', pp: 15, effect: 'bind' },
        'Golpes Furia': { power: 18, acc: 80, type: 'normal', cat: 'physical', pp: 15, hits: '2-5' },
        'Colmillo Veneno': { power: 50, acc: 100, type: 'poison', cat: 'physical', pp: 15, effect: 'poison_30' },
        'Puño Meteoro': { power: 90, acc: 90, type: 'steel', cat: 'physical', pp: 10, effect: 'stat_up_self_atk_20' },
        'Fuego Fatuo': { power: 0, acc: 85, type: 'fire', cat: 'status', pp: 15, effect: 'burn' },
        'Vozarrón': { power: 90, acc: 100, type: 'normal', cat: 'special', pp: 10, sound: true },
        'Rodar': { power: 30, acc: 90, type: 'rock', cat: 'physical', pp: 20 },
        'Niebla': { power: 0, acc: 100, type: 'ice', cat: 'status', pp: 30, effect: 'reset_stats' },
        'Impresionar': { power: 30, acc: 100, type: 'ghost', cat: 'physical', pp: 15, effect: 'flinch_30' },
        'Danza Pétalo': { power: 120, acc: 100, type: 'grass', cat: 'special', pp: 10 },
        'Aromaterapia': { power: 0, acc: 100, type: 'grass', cat: 'status', pp: 5, effect: 'heal_status_party' },
        'Megacuerno': { power: 120, acc: 85, type: 'bug', cat: 'physical', pp: 10 },
        'Seguimiento': { power: 40, acc: 100, type: 'dark', cat: 'physical', pp: 20 },
        'Cola': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'stat_down_enemy_def' },
        'Látigo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'stat_down_enemy_def' },
        'Fortaleza': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'stat_up_self_def' },
        'Defensa Férrea': { power: 0, acc: 100, type: 'steel', cat: 'status', pp: 15, effect: 'stat_up_self_def_2' },
        'Agilidad': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 30, effect: 'stat_up_self_spe_2' },
        'Desarrollo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_up_self_atk' },
        'Danza Espada': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_up_self_atk_2' },
        'Amnesia': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'stat_up_self_spa_2' },
        'Rugido': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'roar', sound: true },
        'Canto': { power: 0, acc: 55, type: 'normal', cat: 'status', pp: 15, effect: 'sleep', sound: true },
        'Somnífera': { power: 0, acc: 75, type: 'normal', cat: 'status', pp: 15, effect: 'sleep' },
        'Supersónico': { power: 0, acc: 55, type: 'normal', cat: 'status', pp: 20, effect: 'confuse', sound: true },
        'Salpicadura': { power: 0, acc: 100, type: 'water', cat: 'status', pp: 40 },
        'Furia': { power: 20, acc: 100, type: 'normal', cat: 'physical', pp: 20, effect: 'rage' },
        'Malicioso': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'stat_down_enemy_def' },
        'Chirrido': { power: 0, acc: 85, type: 'normal', cat: 'status', pp: 40, effect: 'stat_down_enemy_def_2', sound: true },
        'Día de Pago': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 20 },
        'Finta': { power: 60, acc: 1000, type: 'dark', cat: 'physical', pp: 20, effect: 'always_hits' },
        'Psicocontrol': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 10, effect: 'psych_up' },
        'Venganza': { power: 60, acc: 100, type: 'fighting', cat: 'physical', pp: 10 },
        'Contoneo': { power: 0, acc: 85, type: 'normal', cat: 'status', pp: 15, effect: 'swagger' },
        'Tajo Cruzado': { power: 100, acc: 80, type: 'fighting', cat: 'physical', pp: 5 },
        'Rastreo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 40 },
        'Rueda Fuego': { power: 60, acc: 100, type: 'fire', cat: 'physical', pp: 25, effect: 'burn_10' },
        'Tambor': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'belly_drum' },
        'Premonición': { power: 120, acc: 100, type: 'psychic', cat: 'special', pp: 10, effect: 'future_sight_simple' },
        'Kinético': { power: 0, acc: 80, type: 'psychic', cat: 'status', pp: 15, effect: 'stat_down_enemy_acc' },
        'Truco': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 10, effect: 'trick' },
        'Previsión': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 40, effect: 'identify' },
        'Tiro Vital': { power: 70, acc: 1000, type: 'fighting', cat: 'physical', pp: 10, effect: 'always_hits', priority: -1 },
        'Velocidad Extrema': { power: 80, acc: 100, type: 'normal', cat: 'physical', pp: 5, priority: 2 },
        'Fisura': { power: 1, acc: 30, type: 'ground', cat: 'physical', pp: 5, ohko: true },
        'Metrónomo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'metronome' },
        'Cabezazo': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 15, effect: 'flinch_30' },
        'Sorpresa': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 10, effect: 'flinch_100', priority: 3 },
        'Zap Cannon': { power: 120, acc: 50, type: 'electric', cat: 'special', pp: 5, effect: 'paralyze_100' },
        'Tormenta Arena': { power: 0, acc: 100, type: 'rock', cat: 'status', pp: 10, effect: 'weather_sandstorm' },
        'Relevo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 40 },
        'Llantopanto': { power: 0, acc: 100, type: 'dark', cat: 'status', pp: 20, effect: 'stat_down_enemy_spd_2' },
        'Canto Mortal': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 5 },
        'Frío Polar': { power: 1, acc: 30, type: 'ice', cat: 'special', pp: 5, ohko: true },
        'Onda Sónica': { power: 0, acc: 90, type: 'normal', cat: 'special', pp: 20, fixedDmg: 20 },
        'Electrocañón': { power: 120, acc: 50, type: 'electric', cat: 'special', pp: 5, effect: 'paralyze_100' },
        'Fijar Blanco': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 5, effect: 'lock_on' },
        'Eco Metálico': { power: 0, acc: 85, type: 'steel', cat: 'status', pp: 10, effect: 'stat_down_enemy_spd_2' },
        'Corte Furia': { power: 20, acc: 95, type: 'bug', cat: 'physical', pp: 20, effect: 'fury_cutter' },
        'Falso Tortazo': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 40, effect: 'false_swipe' },
        'Viento Hielo': { power: 55, acc: 95, type: 'ice', cat: 'special', pp: 15, effect: 'stat_down_enemy_spe' },
        'Armadura Ácida': { power: 0, acc: 100, type: 'poison', cat: 'status', pp: 20, effect: 'stat_up_self_def_2' },
        'Rencor': { power: 0, acc: 100, type: 'ghost', cat: 'status', pp: 10 },
        'Mal de Ojo': { power: 0, acc: 1000, type: 'ghost', cat: 'status', pp: 5, effect: 'trap' },
        'Mismodestino': { power: 0, acc: 1000, type: 'ghost', cat: 'status', pp: 5 },
        'Puño Sombra': { power: 60, acc: 1000, type: 'ghost', cat: 'physical', pp: 20, effect: 'always_hits' },
        'Arraigo': { power: 0, acc: 100, type: 'grass', cat: 'status', pp: 20, effect: 'ingrain' },
        'Cosquillas': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_down_enemy_atk_def' },
        'Puño Mareo': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 10, effect: 'confuse_20' },
        'Aguante': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'endure' },
        'Ciclón': { power: 40, acc: 100, type: 'dragon', cat: 'special', pp: 20, effect: 'flinch_20' },
        'Danza Dragón': { power: 0, acc: 100, type: 'dragon', cat: 'status', pp: 20, effect: 'stat_up_self_atk_spe' },
        'Cascada': { power: 80, acc: 100, type: 'water', cat: 'physical', pp: 15, effect: 'flinch_20' },
        'Giro Rápido': { power: 20, acc: 100, type: 'normal', cat: 'physical', pp: 40, effect: 'rapid_spin' },
        'Reciclaje': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10 },
        'Disparo Lodo': { power: 55, acc: 95, type: 'ground', cat: 'special', pp: 15, effect: 'stat_down_enemy_spe' },
        'Amortiguador': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'heal_50' },
        'Bostezo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'sleep' },
        'Anulación': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'disable' },
        'Otra Vez': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 5, effect: 'encore' },
        'Foco Energía': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'focus_energy' },
        'Refuerzo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20 },
        'Conversión 2': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 30 },
        'Conversión': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 30 },
        'Electrorrayo': { power: 65, acc: 100, type: 'electric', cat: 'special', pp: 15 },
        'Ronquido': { power: 50, acc: 100, type: 'normal', cat: 'special', pp: 15, effect: 'flinch_30' },
        'Sonámbulo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10 },
        'Bloqueo': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 5, effect: 'trap' },
        'Desenrrollar': { power: 30, acc: 90, type: 'rock', cat: 'physical', pp: 20 },
        'Detección': { power: 0, acc: 1000, type: 'fighting', cat: 'status', pp: 5, effect: 'protect' },
        'Onda Ígnea': { power: 95, acc: 90, type: 'fire', cat: 'special', pp: 10, effect: 'burn_10' },
        'Ataque Aéreo': { power: 140, acc: 90, type: 'flying', cat: 'physical', pp: 5, effect: 'flinch_30' },
        'Más Psique': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 10 },
        'Rapidez': { power: 60, acc: 1000, type: 'normal', cat: 'special', pp: 20, effect: 'always_hits' },
        'Camuflaje': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20 },
        'Masa Cósmica': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'stat_up_self_def_spd' },
        'Arañazo': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 35 },
        'Garra Metal': { power: 50, acc: 95, type: 'steel', cat: 'physical', pp: 35, effect: 'stat_up_self_atk_10' },
        'Pantalla Humo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_down_enemy_acc' },
        'Furia Dragón': { power: 1, acc: 100, type: 'dragon', cat: 'special', pp: 10, effect: 'fixedDmg' },
        'Cara Susto': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'stat_down_enemy_spe_2' },
        'Ataque Ala': { power: 60, acc: 100, type: 'flying', cat: 'physical', pp: 35 },
        'Remolino': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 20, effect: 'roar' },
        'Súper Colmillo': { power: 1, acc: 90, type: 'normal', cat: 'physical', pp: 10, effect: 'halfHP' },
        'Envolver': { power: 15, acc: 90, type: 'normal', cat: 'physical', pp: 20, effect: 'bind' },
        'Ácido': { power: 40, acc: 100, type: 'poison', cat: 'special', pp: 30, effect: 'stat_down_enemy_spd_10' },
        'Rizo Defensa': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 40, effect: 'stat_up_self_def' },
        'Cornada': { power: 65, acc: 100, type: 'normal', cat: 'physical', pp: 25 },
        'Perforador': { power: 1, acc: 30, type: 'normal', cat: 'physical', pp: 5, ohko: true },
        'Atizar': { power: 80, acc: 75, type: 'normal', cat: 'physical', pp: 20 },
        'Descanso': { power: 0, acc: 1000, type: 'psychic', cat: 'status', pp: 10, effect: 'rest' },
        'Aire Afilado': { power: 55, acc: 95, type: 'flying', cat: 'special', pp: 25 },
        'Magnitud': { power: 70, acc: 100, type: 'ground', cat: 'physical', pp: 30, effect: 'magnitude' },
        'Triataque': { power: 80, acc: 100, type: 'normal', cat: 'special', pp: 10, effect: 'tri_attack' },
        'Patada Baja': { power: 50, acc: 100, type: 'fighting', cat: 'physical', pp: 20 },
        'Puñetazo': { power: 40, acc: 100, type: 'normal', cat: 'physical', pp: 35 },
        'Constricción': { power: 10, acc: 100, type: 'normal', cat: 'physical', pp: 35, effect: 'stat_down_enemy_spe_10' },
        'Maldición': { power: 0, acc: 1000, type: 'ghost', cat: 'status', pp: 10, effect: 'curse' },
        'Tenaza': { power: 35, acc: 85, type: 'water', cat: 'physical', pp: 15, effect: 'bind' },
        'Residuos': { power: 65, acc: 100, type: 'poison', cat: 'special', pp: 20, effect: 'poison_30' },
        'Púas': { power: 0, acc: 1000, type: 'ground', cat: 'status', pp: 20 },
        'Clavo Cañón': { power: 20, acc: 100, type: 'normal', cat: 'physical', pp: 15, hits: '2-5' },
        'Carga': { power: 0, acc: 1000, type: 'electric', cat: 'status', pp: 20, effect: 'stat_up_self_spd' },
        'Chispa': { power: 65, acc: 100, type: 'electric', cat: 'physical', pp: 20, effect: 'paralyze_30' },
        'Manto Espejo': { power: 1, acc: 100, type: 'psychic', cat: 'special', pp: 20, counter: true },
        'Bombardeo': { power: 15, acc: 85, type: 'normal', cat: 'physical', pp: 20, hits: '2-5' },
        'Huevo Bomba': { power: 100, acc: 75, type: 'normal', cat: 'physical', pp: 10 },
        'Hueso Palo': { power: 65, acc: 85, type: 'ground', cat: 'physical', pp: 20, effect: 'flinch_10' },
        'Huesomerang': { power: 50, acc: 90, type: 'ground', cat: 'physical', pp: 10, hits: 2 },
        'Hueso Rus': { power: 25, acc: 90, type: 'ground', cat: 'physical', pp: 10, hits: '2-5' },
        'Inversión': { power: 100, acc: 100, type: 'fighting', cat: 'physical', pp: 15 },
        'Patada Giro': { power: 60, acc: 85, type: 'fighting', cat: 'physical', pp: 15, effect: 'flinch_30' },
        'Telépata': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 5 },
        'Mega Patada': { power: 120, acc: 75, type: 'normal', cat: 'physical', pp: 5 },
        'Ultrapuño': { power: 40, acc: 100, type: 'fighting', cat: 'physical', pp: 30, priority: 1 },
        'Gancho Alto': { power: 85, acc: 90, type: 'fighting', cat: 'physical', pp: 15 },
        'Mega Puño': { power: 80, acc: 85, type: 'normal', cat: 'physical', pp: 20 },
        'Desarme': { power: 20, acc: 100, type: 'dark', cat: 'physical', pp: 20 },
        'Alivio': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 5 },
        'Pozo Venenoso': { power: 0, acc: 90, type: 'poison', cat: 'status', pp: 40, effect: 'poison' },
        'Polución': { power: 20, acc: 70, type: 'poison', cat: 'special', pp: 20, effect: 'poison_30' },
        'Legado': { power: 0, acc: 1000, type: 'dark', cat: 'status', pp: 10, effect: 'selfKO' },
        'Pedrada': { power: 25, acc: 90, type: 'rock', cat: 'physical', pp: 15, hits: '2-5' },
        'Poder Pasado': { power: 60, acc: 100, type: 'rock', cat: 'special', pp: 5, effect: 'stat_up_self_all_10' },
        'Hidrochorro': { power: 0, acc: 1000, type: 'water', cat: 'status', pp: 15 },
        'Azote': { power: 100, acc: 100, type: 'normal', cat: 'physical', pp: 15 },
        'Sustituto': { power: 0, acc: 1000, type: 'normal', cat: 'status', pp: 10 },
        'Nieve Polvo': { power: 40, acc: 100, type: 'ice', cat: 'special', pp: 25, effect: 'freeze_10' },
        'Atadura': { power: 15, acc: 85, type: 'normal', cat: 'physical', pp: 20, effect: 'bind' },
        'Neblina': { power: 0, acc: 1000, type: 'ice', cat: 'status', pp: 30 },
        'Ascuas': { power: 40, acc: 100, type: 'fire', cat: 'special', pp: 25, effect: 'burn_10' },
        'Lanzallamas': { power: 90, acc: 100, type: 'fire', cat: 'special', pp: 15, effect: 'burn_10' },
        'Giro Fuego': { power: 35, acc: 85, type: 'fire', cat: 'special', pp: 15, effect: 'bind' },
        'Llamarada': { power: 120, acc: 85, type: 'fire', cat: 'special', pp: 5, effect: 'burn_10' },
        'Puño Fuego': { power: 75, acc: 100, type: 'fire', cat: 'physical', pp: 15, effect: 'burn_10' },
        'Burbuja': { power: 40, acc: 100, type: 'water', cat: 'special', pp: 30, effect: 'stat_down_enemy_spe_10' },
        'Pistola Agua': { power: 40, acc: 100, type: 'water', cat: 'special', pp: 25 },
        'Rayo Burbuja': { power: 65, acc: 100, type: 'water', cat: 'special', pp: 20, effect: 'stat_down_enemy_spe_10' },
        'Surf': { power: 95, acc: 100, type: 'water', cat: 'special', pp: 15 },
        'Hidrobomba': { power: 110, acc: 80, type: 'water', cat: 'special', pp: 5 },
        'Refugio': { power: 0, acc: 100, type: 'water', cat: 'status', pp: 40, effect: 'stat_up_self_def' },
        'Pin Misil': { power: 25, acc: 95, type: 'bug', cat: 'physical', pp: 20, hits: '2-5' },
        'Rayo Aurora': { power: 65, acc: 100, type: 'ice', cat: 'special', pp: 20, effect: 'stat_down_enemy_atk_10' },
        'Rayo Hielo': { power: 90, acc: 100, type: 'ice', cat: 'special', pp: 10, effect: 'freeze_10' },
        'Ventisca': { power: 110, acc: 70, type: 'ice', cat: 'special', pp: 5, effect: 'freeze_10' },
        'Látigo Cepa': { power: 45, acc: 100, type: 'grass', cat: 'physical', pp: 25 },
        'Drenadoras': { power: 0, acc: 55, type: 'grass', cat: 'status', pp: 10, effect: 'leech_seed' },
        'Polvo Veneno': { power: 0, acc: 75, type: 'grass', cat: 'status', pp: 35, effect: 'poison' },
        'Hoja Afilada': { power: 55, acc: 95, type: 'grass', cat: 'physical', pp: 25 },
        'Rayo Solar': { power: 120, acc: 100, type: 'grass', cat: 'special', pp: 10 },
        'Absorber': { power: 20, acc: 100, type: 'grass', cat: 'special', pp: 25, drain: true },
        'Megaagotar': { power: 40, acc: 100, type: 'grass', cat: 'special', pp: 15, drain: true },
        'Gigadrenado': { power: 75, acc: 100, type: 'grass', cat: 'special', pp: 10, drain: true },
        'Vampiro': { power: 80, acc: 100, type: 'grass', cat: 'physical', pp: 10, drain: true },
        'Impactrueno': { power: 40, acc: 100, type: 'electric', cat: 'special', pp: 30, effect: 'paralyze_10' },
        'Onda Trueno': { power: 0, acc: 90, type: 'electric', cat: 'status', pp: 20, effect: 'paralyze' },
        'Rayo': { power: 90, acc: 100, type: 'electric', cat: 'special', pp: 15, effect: 'paralyze_10' },
        'Trueno': { power: 110, acc: 70, type: 'electric', cat: 'special', pp: 10, effect: 'paralyze_30' },
        'Puño Trueno': { power: 75, acc: 100, type: 'electric', cat: 'physical', pp: 15, effect: 'paralyze_10' },
        'Confusión': { power: 50, acc: 100, type: 'psychic', cat: 'special', pp: 25, effect: 'confuse_10' },
        'Psíquico': { power: 90, acc: 100, type: 'psychic', cat: 'special', pp: 10, effect: 'stat_down_enemy_spd_10' },
        'Psicorrayo': { power: 65, acc: 100, type: 'psychic', cat: 'special', pp: 20, effect: 'confuse_10' },
        'Psicoataque': { power: 90, acc: 100, type: 'psychic', cat: 'special', pp: 10, effect: 'stat_down_enemy_spd_10' },
        'Hipnosis': { power: 0, acc: 60, type: 'psychic', cat: 'status', pp: 20, effect: 'sleep' },
        'Meditación': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 40, effect: 'stat_up_self_atk' },
        'Teletransporte': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'teleport' },
        'Recuperación': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 10, effect: 'heal_50' },
        'Síntesis': { power: 0, acc: 100, type: 'grass', cat: 'status', pp: 5, effect: 'heal_weather' },
        'Barrera': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'stat_up_self_def_2' },
        'Psicocorte': { power: 70, acc: 100, type: 'psychic', cat: 'physical', pp: 20 },
        'Lanzarrocas': { power: 50, acc: 90, type: 'rock', cat: 'physical', pp: 15 },
        'Avalancha': { power: 75, acc: 90, type: 'rock', cat: 'physical', pp: 10, effect: 'flinch_30' },
        'Terremoto': { power: 100, acc: 100, type: 'ground', cat: 'physical', pp: 10 },
        'Arena': { power: 0, acc: 100, type: 'ground', cat: 'status', pp: 15, effect: 'stat_down_enemy_acc' },
        'Ataque Arena': { power: 0, acc: 100, type: 'ground', cat: 'status', pp: 15, effect: 'stat_down_enemy_acc' },
        'Minimizar': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 20, effect: 'stat_up_self_eva_2' },
        'Golpe Karatazo': { power: 50, acc: 100, type: 'fighting', cat: 'physical', pp: 25 },
        'Sumisión': { power: 80, acc: 80, type: 'fighting', cat: 'physical', pp: 20, recoil: 4 },
        'Mov. Sísmico': { power: 1, acc: 100, type: 'fighting', cat: 'physical', pp: 20, levelDmg: true },
        'Tornado': { power: 40, acc: 100, type: 'flying', cat: 'special', pp: 35 },
        'Tajo Aéreo': { power: 60, acc: 95, type: 'flying', cat: 'special', pp: 20, effect: 'flinch_30' },
        'Ala de Acero': { power: 70, acc: 90, type: 'steel', cat: 'physical', pp: 25, effect: 'stat_up_self_def_10' },
        'Picoteo': { power: 60, acc: 100, type: 'flying', cat: 'physical', pp: 20 },
        'Pico Taladro': { power: 80, acc: 100, type: 'flying', cat: 'physical', pp: 20 },
        'Picotazo Veneno': { power: 15, acc: 100, type: 'poison', cat: 'physical', pp: 35, effect: 'poison_20' },
        'Bomba Lodo': { power: 90, acc: 100, type: 'poison', cat: 'special', pp: 10, effect: 'poison_30' },
        'Deslumbrar': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 30, effect: 'paralyze' },
        'Gas Venenoso': { power: 0, acc: 80, type: 'poison', cat: 'status', pp: 40, effect: 'poison' },
        'Acidificación': { power: 0, acc: 100, type: 'poison', cat: 'status', pp: 40, effect: 'stat_up_self_def_2' },
        'Chupa-vidas': { power: 20, acc: 100, type: 'bug', cat: 'physical', pp: 15, drain: true },
        'Doble Ataque': { power: 25, acc: 95, type: 'bug', cat: 'physical', pp: 20, hits: 2, effect: 'poison_20' },
        'Bola Sombra': { power: 80, acc: 100, type: 'ghost', cat: 'special', pp: 15, effect: 'stat_down_enemy_spd_20' },
        'Lengüetazo': { power: 30, acc: 100, type: 'ghost', cat: 'physical', pp: 30, effect: 'paralyze_30' },
        'Tinieblas': { power: 1, acc: 100, type: 'ghost', cat: 'special', pp: 15, levelDmg: true },
        'Contraataque': { power: 1, acc: 100, type: 'fighting', cat: 'physical', pp: 20, counter: true, priority: -5 },
        'Rayo Confuso': { power: 0, acc: 100, type: 'ghost', cat: 'status', pp: 10, effect: 'confuse' },
        'Comesueños': { power: 100, acc: 100, type: 'psychic', cat: 'special', pp: 15, drain: true, effect: 'dream_eater' },
        'Guillotina': { power: 1, acc: 30, type: 'normal', cat: 'physical', pp: 5, ohko: true },
        'Martillazo': { power: 100, acc: 90, type: 'water', cat: 'physical', pp: 10 },
        'Puño Hielo': { power: 75, acc: 100, type: 'ice', cat: 'physical', pp: 15, effect: 'freeze_10' },
        'Luz Lunar': { power: 0, acc: 100, type: 'fairy', cat: 'status', pp: 5, effect: 'heal_weather' },
        'Encanto': { power: 0, acc: 100, type: 'fairy', cat: 'status', pp: 20, effect: 'stat_down_enemy_atk_2' },
        'Beso Dulce': { power: 0, acc: 75, type: 'fairy', cat: 'status', pp: 10, effect: 'confuse' },
        'Espora': { power: 0, acc: 100, type: 'grass', cat: 'status', pp: 15, effect: 'sleep' },
        'Transformación': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'transform' },
        'Puño Certero': { power: 150, acc: 100, type: 'fighting', cat: 'physical', pp: 20 },
        'Garra Dragón': { power: 80, acc: 100, type: 'dragon', cat: 'physical', pp: 15 },
        'Hidropulso': { power: 60, acc: 100, type: 'water', cat: 'special', pp: 20, effect: 'confuse_20' },
        'Paz Mental': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'stat_up_self_spa_spd' },
        'Tóxico': { power: 0, acc: 85, type: 'poison', cat: 'status', pp: 10, effect: 'bad_poison' },
        'Granizo': { power: 0, acc: 100, type: 'ice', cat: 'status', pp: 10, effect: 'hail' },
        'Corpulencia': { power: 0, acc: 100, type: 'fighting', cat: 'status', pp: 20, effect: 'stat_up_self_atk_def' },
        'Recurrente': { power: 10, acc: 100, type: 'grass', cat: 'physical', pp: 30, hits: '2-5' },
        'Poder Oculto': { power: 60, acc: 100, type: 'normal', cat: 'special', pp: 15 },
        'Día Soleado': { power: 0, acc: 100, type: 'fire', cat: 'status', pp: 5, effect: 'sun' },
        'Mofa': { power: 0, acc: 100, type: 'dark', cat: 'status', pp: 20, effect: 'taunt' },
        'Pantalla de Luz': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 30, effect: 'light_screen' },
        'Protección': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 10, effect: 'protect' },
        'Danza Lluvia': { power: 0, acc: 100, type: 'water', cat: 'status', pp: 5, effect: 'rain' },
        'Velo Sagrado': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 25, effect: 'safeguard' },
        'Frustración': { power: 85, acc: 100, type: 'normal', cat: 'physical', pp: 20 },
        'Cola Férrea': { power: 100, acc: 75, type: 'steel', cat: 'physical', pp: 15, effect: 'stat_down_enemy_def_30' },
        'Excavar': { power: 80, acc: 100, type: 'ground', cat: 'physical', pp: 10 },
        'Demolición': { power: 75, acc: 100, type: 'fighting', cat: 'physical', pp: 15, effect: 'break_screens' },
        'Doble Equipo': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 15, effect: 'stat_up_self_eva' },
        'Reflejo': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 20, effect: 'reflect' },
        'Onda Voltio': { power: 60, acc: 100, type: 'electric', cat: 'special', pp: 20 },
        'Tormenta de Arena': { power: 0, acc: 100, type: 'rock', cat: 'status', pp: 10, effect: 'sandstorm' },
        'Tumba Rocas': { power: 60, acc: 95, type: 'rock', cat: 'physical', pp: 15, effect: 'stat_down_enemy_spe' },
        'Golpe Aéreo': { power: 60, acc: 100, type: 'flying', cat: 'physical', pp: 20, effect: 'always_hits' },
        'Tormento': { power: 0, acc: 100, type: 'dark', cat: 'status', pp: 15, effect: 'torment' },
        'Imagen': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 20, effect: 'status_boost' },
        'Daño Secreto': { power: 70, acc: 100, type: 'normal', cat: 'physical', pp: 20 },
        'Atracción': { power: 0, acc: 100, type: 'normal', cat: 'status', pp: 15, effect: 'attract' },
        'Ladrón': { power: 40, acc: 100, type: 'dark', cat: 'physical', pp: 10, effect: 'steal_item' },
        'Intercambio': { power: 0, acc: 100, type: 'psychic', cat: 'status', pp: 10, effect: 'skill_swap' },
        'Robo': { power: 0, acc: 100, type: 'dark', cat: 'status', pp: 10, effect: 'snatch' },
        'Sofoco': { power: 130, acc: 90, type: 'fire', cat: 'special', pp: 5, effect: 'stat_down_self_spa_2' },
      };
    
      function validateMoveData() {
        if (typeof Object.entries(POKEMON_DB) === 'undefined') return;
        const missing = new Set();
        const pokemonWithMissing = {};

        for (const [id, p] of Object.entries(POKEMON_DB)) {
          if (!p.learnset) continue;
          for (const m of p.learnset) {
            if (!MOVE_DATA[m.name]) {
              missing.add(m.name);
              if (!pokemonWithMissing[m.name]) pokemonWithMissing[m.name] = [];
              pokemonWithMissing[m.name].push(p.name);
            }
          }
        }

        if (missing.size > 0) {
          console.warn("[MoveDataAudit] Faltan " + missing.size + " movimientos en MOVE_DATA:");
          for (const mName of Array.from(missing).sort()) {
            console.warn("  - \"" + mName + "\" (usado por: " + pokemonWithMissing[mName].join(', ') + ")");
          }
        } else {
          console.log("[MoveDataAudit] 100% de consistencia de datos de movimientos lograda.");
        }
      }
      setTimeout(validateMoveData, 2000);

    // Backwards compat
    const MOVE_POWER = Object.fromEntries(Object.entries(MOVE_DATA).map(([k, v]) => [k, v.power || 0]));

    // ── Type effectiveness chart ──────────────────────────────
    const TYPE_CHART = {
      normal: { rock: 0.5, ghost: 0, steel: 0.5 },
      fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
      water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
      grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
      electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
      ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
      fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
      poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
      ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
      flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
      psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
      bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
      rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
      ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon: { dragon: 2, steel: 0.5, fairy: 0 },
      dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
      fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
    };

    function getTypeEffectiveness(moveType, defType) {
      const row = TYPE_CHART[moveType] || {};
      return row[defType] ?? 1;
    }

    function getTypeEffectivenessMsg(eff) {
      if (eff === 0) return '¡No afecta!';
      if (eff >= 2) return '¡Es muy eficaz!';
      if (eff <= 0.5) return 'No es muy eficaz...';
      return null;
    }

    // Secondary types for dual-type Gen 1 Pokémon
    const POKE_TYPE2 = {
      bulbasaur:'poison',ivysaur:'poison',venusaur:'poison',
      charizard:'flying',
      butterfree:'flying',
      weedle:'poison',kakuna:'poison',beedrill:'poison',
      pidgey:'flying',pidgeotto:'flying',pidgeot:'flying',
      spearow:'flying',fearow:'flying',
      farfetchd:'flying',doduo:'flying',dodrio:'flying',
      nidoqueen:'ground',nidoking:'ground',
      zubat:'flying',golbat:'flying',
      oddish:'poison',gloom:'poison',vileplume:'poison',
      bellsprout:'poison',weepinbell:'poison',victreebel:'poison',
      paras:'grass',parasect:'grass',
      venonat:'poison',venomoth:'poison',
      poliwrath:'fighting',
      tentacool:'poison',tentacruel:'poison',
      geodude:'ground',graveler:'ground',golem:'ground',
      rhyhorn:'rock',rhydon:'rock',
      onix:'ground',
      slowpoke:'psychic',slowbro:'psychic',
      starmie:'psychic',
      magnemite:'steel',magneton:'steel',
      dewgong:'ice',cloyster:'ice',lapras:'ice',
      gastly:'poison',haunter:'poison',gengar:'poison',
      exeggcute:'psychic',exeggutor:'psychic',
      jynx:'psychic',
      omanyte:'water',omastar:'water',
      kabuto:'water',kabutops:'water',
      aerodactyl:'flying',
      articuno:'flying',
      zapdos:'flying',
      moltres:'flying',
      dragonite:'flying',
      gyarados:'flying',
      scyther:'flying',
    };

    // ── Stat stage multipliers (2/N to N/2) ─────────────────────────
    const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];
    // ── Accuracy/Evasion multipliers (3/N to N/3) ───────────────────
    const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];
    
    // Index 6 = stage 0 (neutral)
    function stageMult(stage) { return STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }
    function accStageMult(stage) { return ACC_STAGE_MULT[Math.max(0, Math.min(12, stage + 6))]; }




    // ===== REAL NATURE DATA (official) =====
    const NATURE_DATA = {
      'Hardy': { up: null, down: null, desc: 'Sin efecto en estadísticas.' },
      'Audaz': { up: 'Ataque', down: 'Def. Esp', desc: '⬆ +10% Ataque / ⬇ -10% Def. Especial' },
      'Firme': { up: 'Ataque', down: 'Velocidad', desc: '⬆ +10% Ataque / ⬇ -10% Velocidad' },
      'Pícaro': { up: 'Ataque', down: 'Defensa', desc: '⬆ +10% Ataque / ⬇ -10% Defensa' },
      'Manso': { up: 'Ataque', down: 'At. Esp', desc: '⬆ +10% Ataque / ⬇ -10% At. Especial' },
      'Serio': { up: null, down: null, desc: 'Sin efecto en estadísticas.' },
      'Osado': { up: 'Defensa', down: 'Ataque', desc: '⬆ +10% Defensa / ⬇ -10% Ataque' },
      'Plácido': { up: 'Defensa', down: 'At. Esp', desc: '⬆ +10% Defensa / ⬇ -10% At. Especial' },
      'Agitado': { up: 'Defensa', down: 'Velocidad', desc: '⬆ +10% Defensa / ⬇ -10% Velocidad' },
      'Jovial': { up: 'Defensa', down: 'Def. Esp', desc: '⬆ +10% Defensa / ⬇ -10% Def. Especial' },
      'Ingenuo': { up: 'At. Esp', down: 'Def. Esp', desc: '⬆ +10% At. Especial / ⬇ -10% Def. Especial' },
      'Modesto': { up: 'At. Esp', down: 'Ataque', desc: '⬆ +10% At. Especial / ⬇ -10% Ataque' },
      'Moderado': { up: 'At. Esp', down: 'Defensa', desc: '⬆ +10% At. Especial / ⬇ -10% Defensa' },
      'Raro': { up: 'At. Esp', down: 'Velocidad', desc: '⬆ +10% At. Especial / ⬇ -10% Velocidad' },
      'Dócil': { up: null, down: null, desc: 'Sin efecto en estadísticas.' },
      'Tímido': { up: 'Velocidad', down: 'Ataque', desc: '⬆ +10% Velocidad / ⬇ -10% Ataque' },
      'Activo': { up: 'Velocidad', down: 'Defensa', desc: '⬆ +10% Velocidad / ⬇ -10% Defensa' },
      'Alocado': { up: 'Velocidad', down: 'At. Esp', desc: '⬆ +10% Velocidad / ⬇ -10% At. Especial' },
      'Tranquilo': { up: 'Def. Esp', down: 'Velocidad', desc: '⬆ +10% Def. Especial / ⬇ -10% Velocidad' },
      'Grosero': { up: 'Def. Esp', down: 'At. Esp', desc: '⬆ +10% Def. Especial / ⬇ -10% At. Especial' },
      'Cauto': { up: 'Def. Esp', down: 'Ataque', desc: '⬆ +10% Def. Especial / ⬇ -10% Ataque' },
    };

    // ===== REAL ABILITY DATA (official descriptions) =====
    const ABILITY_DATA = {
      'Espesura': 'Cuando el HP baja a 1/3 o menos, los movimientos de tipo Planta aumentan su poder un 50%.',
      'Clorofila': 'Bajo el sol o durante el día, la Velocidad del Pokémon se duplica.',
      'Mar llamas': 'Cuando el HP baja a 1/3 o menos, los movimientos de tipo Fuego aumentan su poder un 50%.',
      'Poder Solar': 'Bajo el sol, el At. Especial sube un 50%, pero pierde HP cada turno.',
      'Torrente': 'Cuando el HP baja a 1/3 o menos, los movimientos de tipo Agua aumentan su poder un 50%.',
      'Lluvia Ligera': 'Bajo la lluvia o durante la noche, la Velocidad del Pokémon se duplica.',
      'Vista lince': 'Evita que baje la Precisión.',
      'Alboroto': 'Hace ruido en la batalla e impide que los Pokémon rivales se queden dormidos.',
      'Escape': 'Permite huir de batallas con Pokémon salvajes sin fallar.',
      'Agallas': 'Aumenta el Ataque si sufre un problema de estado.',
      'Polvo escudo': 'Evita los efectos secundarios de los ataques recibidos.',
      'Mudar': 'A veces cura los problemas de estado mudando la piel.',
      'Electricidad estática': 'Paraliza al mínimo contacto.',
      'Pararrayos': 'Atrae todos los movimientos de tipo Eléctrico. En vez de daño, sube el At. Especial.',
      'Robustez': 'Permite sobrevivir con 1 HP un golpe que lo noquearía desde HP completo.',
      'Nerviosismo': 'El Pokémon no puede comer bayas en batalla por su tensión.',
      'Infiltrador': 'Los movimientos atraviesan las barreras y pantallas del rival.',
      'Humedad': 'Evita que cualquier Pokémon en el campo use movimientos de explosión.',
      'Aclimatación': 'Elimina los efectos del clima en combate.',
      'Nado rápido': 'Sube la Velocidad cuando llueve.',
      'Ráfaga': 'Cuando el HP baja a 1/3 o menos, la Velocidad se triplica.',
      'Adaptable': 'Potencia el bonus STAB (mismo tipo que el movimiento) de x1.5 a x2.',
      'Cura natural': 'Cura los problemas de estado al ser retirado del combate.',
      'Velo húmedo': 'Evita los problemas de estado si está lloviendo.',
      'Sebo': 'Reduce a la mitad el daño recibido por movimientos de tipo Fuego y Hielo.',
      'Caparazón': 'Protege al Pokémon de los golpes críticos del rival.',
      'Armadura Batalla': 'Protege al Pokémon de los golpes críticos del rival.',
      'Francotirador': 'Potencia los golpes críticos de x2 a x3.',
      'Intrépido': 'Permite golpear a Pokémon de tipo Fantasma con movimientos de tipo Normal y Lucha.',
      'Ojo Compuesto': 'Aumenta la precisión de los movimientos en un 30%.',
      'Velo arena': 'Aumenta la Evasión durante las tormentas de arena.',
      'Insonorizar': 'Protege al Pokémon de los movimientos basados en sonido.',
      'Intimidación': 'Baja el Ataque del rival al entrar en combate.',
      'Mudar': 'A veces cura los problemas de estado mudando la piel.',
      'Absorbe Fuego': 'Los movimientos de tipo Fuego no le hacen daño y potencian sus propios ataques de Fuego.',
      'Absorbe Agua': 'Los movimientos de tipo Agua no le hacen daño y le curan un 25% de HP.',
      'Efecto Espora': 'El contacto con el Pokémon puede paralizar, envenenar o dormir al rival (30%).',
      'Trampa Arena': 'Impide que el rival escape o sea cambiado (salvo tipos Volador).',
      'Recogida': 'El Pokémon puede encontrar objetos después de una batalla.',
      'Espíritu Vital': 'Impide que el Pokémon se quede dormido.',
      'Sincronía': 'Si el Pokémon es envenenado, paralizado o quemado, el rival sufre lo mismo.',
      'Agallas': 'Aumenta el Ataque un 50% si el Pokémon sufre un estado alterado.',
      'Cura Natural': 'Cura los problemas de estado al retirar al Pokémon del combate.',
      'Cuerpo Puro': 'Evita que las estadísticas del Pokémon sean bajadas por el rival.',
      'Despiste': 'Impide que el Pokémon sea atraído, intimidado o confundido.',
      'Imán': 'Impide que los Pokémon de tipo Acero escapen o sean cambiados.',
      'Fuga': 'Permite huir siempre de Pokémon salvajes.',
      'Hedor': 'Puede hacer retroceder al rival al atacarlo (10% de probabilidad).',
      'Levitación': 'Proporciona inmunidad total contra movimientos de tipo Tierra.',
      'Cabeza Roca': 'Protege al Pokémon del daño de retroceso al usar sus movimientos.',
      'Insomnio': 'Impide que el Pokémon se quede dormido.',
      'Corte Fuerte': 'Impide que el Ataque del Pokémon sea bajado por el rival.',
      'Flexibilidad': 'Protege al Pokémon de la parálisis.',
      'Madrugar': 'El Pokémon se despierta el doble de rápido de lo normal.',
      'Enjambre': 'Cuando el HP baja a 1/3 o menos, los movimientos Bicho aumentan su poder.',
      'Cuerpo Llama': 'El contacto con este Pokémon puede quemar al rival (30% de probabilidad).',
      'Rastro': 'Copia la habilidad del oponente al entrar en combate.',
      'Inmunidad': 'Protege al Pokémon del envenenamiento.',
      'Presión': 'Hace que el rival gaste el doble de PP al usar sus movimientos.',
      'Punto tóxico': 'Puede envenenar al objetivo al mínimo contacto.',
      'Descarga': 'Sube el Ataque o At. Especial según la defensa del rival al entrar.',
      'Nado rápido': 'Sube la Velocidad cuando llueve.',
      'Experto': 'Aumenta un 50% el poder de los movimientos con potencia de 60 o menos.',
      'Absorbe Voltio': 'Los movimientos de tipo Eléctrico no le hacen daño y le curan un 25% de HP.',
      'Foco interno': 'Evita que el Pokémon retroceda.',
      'Rivalidad': 'Aumenta el Ataque un 25% si el rival es del mismo género.',
      'Muro Mágico': 'El Pokémon solo recibe daño de ataques directos. Es inmune al veneno o clima.',
    };

    function getMoveDescription(name, md) {
      if (!md) md = (typeof MOVE_DATA !== 'undefined' ? MOVE_DATA[name] : null);
      if (!md) return "Causa daño al oponente sin efectos secundarios adicionales.";
      
      if (md.ohko) return "Fulmina al enemigo de un solo golpe si acierta.";
      if (md.halfHP) return "Reduce a la mitad los PS actuales del oponente.";
      if (md.recoil) return "El usuario recibe daño por retroceso al golpear.";
      if (md.drain && md.cat !== 'status') return "Restaura PS al usuario según el daño causado."; // Added non-status check
      if (md.selfKO) return "El usuario se debilita para causar un daño masivo.";
      if (md.priority > 0) return "Ataque rápido que siempre golpea primero.";
      if (md.levelDmg) return "Causa un daño igual al nivel del usuario.";
      if (md.counter) return "Devuelve al rival el doble del daño físico recibido este turno.";
      
      const effects = {
        'burn_10': "Puede quemar al objetivo (10%).",
        'burn': "Quema al objetivo de forma garantizada.",
        'paralyze_10': "Puede paralizar al objetivo (10%).",
        'paralyze_20': "Puede paralizar al objetivo (20%).",
        'paralyze_30': "Puede paralizar al objetivo (30%).",
        'paralyze': "Paraliza al objetivo de forma garantizada.",
        'poison_20': "Puede envenenar al objetivo (20%).",
        'poison_30': "Puede envenenar al objetivo (30%).",
        'poison': "Envenena al objetivo de forma garantizada.",
        'freeze_10': "Puede congelar al objetivo (10%).",
        'flinch_30': "Puede hacer retroceder al objetivo (30%).",
        'confuse_10': "Puede confundir al objetivo (10%).",
        'confuse_20': "Puede confundir al objetivo (20%).",
        'confuse_30': "Puede confundir al objetivo (30%).",
        'confuse': "Confunde al objetivo de forma garantizada.",
        'stat_down_enemy_atk': "Reduce el Ataque del oponente.",
        'stat_down_enemy_atk_10': "Puede reducir el Ataque del oponente (10%).",
        'stat_down_enemy_atk_2': "Reduce mucho el Ataque del oponente.",
        'stat_down_enemy_def': "Reduce la Defensa del oponente.",
        'stat_down_enemy_def_2': "Reduce mucho la Defensa del oponente.",
        'stat_down_enemy_spe': "Reduce la Velocidad del oponente.",
        'stat_down_enemy_spe_10': "Puede reducir la Velocidad del oponente (10%).",
        'stat_down_enemy_acc': "Reduce la Precisión del oponente.",
        'stat_down_enemy_acc_30': "Puede reducir la Precisión del oponente (30%).",
        'stat_down_enemy_spd_10': "Puede reducir la Def. Especial del oponente (10%).",
        'stat_down_enemy_spd_20': "Puede reducir la Def. Especial del oponente (20%).",
        'stat_up_self_atk': "Aumenta el Ataque del usuario.",
        'stat_up_self_atk_2': "Aumenta mucho el Ataque del usuario.",
        'stat_up_self_def': "Aumenta la Defensa del usuario.",
        'stat_up_self_def_2': "Aumenta mucho la Defensa del usuario.",
        'stat_up_self_spa_2': "Aumenta mucho el At. Especial del usuario.",
        'stat_up_self_spe_2': "Aumenta mucho la Velocidad del usuario.",
        'stat_up_self_eva': "Aumenta la Evasión del usuario.",
        'stat_up_self_eva_2': "Aumenta mucho la Evasión del usuario.",
        'stat_up_self_atk_def': "Aumenta el Ataque y la Defensa del usuario.",
        'stat_up_self_spa_spd': "Aumenta el At. Especial y la Def. Especial del usuario.",
        'heal_50': "Restaura el 50% de los PS máximos del usuario.",
        'heal_weather': "Restaura PS según el clima o momento del día.",
        'leech_seed': "Planta una semilla que drena PS cada turno.",
        'metronome': "Usa un movimiento aleatorio de entre casi todos los existentes.",
        'roar': "Ahuyenta al rival o lo fuerza a cambiar por otro aliado.",
        'disable': "Deshabilita el último movimiento usado por el oponente.",
        'encore': "Obliga al oponente a repetir su último movimiento.",
        'sleep': "Duerme al oponente de forma garantizada.",
        'bad_poison': "Envenena gravemente al oponente (daño progresivo).",
        'transform': "Copia la forma, tipos y movimientos del oponente.",
        'focus_energy': "Aumenta la probabilidad de asestar golpes críticos.",
        'bind': "Atrapa al oponente y le causa daño durante varios turnos.",
        'magnitude': "Causa un daño aleatorio basado en la intensidad sísmica.",
        'recharge': "El usuario debe descansar el siguiente turno tras atacar.",
        'teleport': "Permite huir de un combate contra un Pokémon salvaje.",
        'dream_eater': "Absorbe PS a un oponente dormido para restaurar salud.",
        'rest': "El usuario duerme dos turnos para recuperar todos sus PS.",
        'curse': "Si es Fantasma, pierde PS para maldecir al rival cada turno.",
        'tri_attack': "Puede quemar, paralizar o congelar al objetivo.",
        'stat_down_enemy_spe_2': "Reduce mucho la Velocidad del oponente.",
        'stat_down_enemy_eva': "Reduce la Evasión del oponente.",
        'mirror_move': "Copia y utiliza el último movimiento usado por el oponente.",
        'stat_up_self_def_spd': "Aumenta la Defensa y la Def. Especial del usuario.",
        'stat_up_self_atk_20': "Aumenta el Ataque del usuario (20% de probabilidad).",
        'reset_stats': "Elimina todos los cambios de estadísticas de ambos Pokémon.",
        'heal_status_party': "Cura los estados alterados de todo el equipo.",
        'flinch_100': "Hace retroceder al oponente de forma garantizada (solo primer turno).",
        'swagger': "Confunde al oponente y aumenta mucho su Ataque.",
        'belly_drum': "Reduce a la mitad los PS para maximizar el Ataque.",
        'psych_up': "Copia los cambios de estadísticas del oponente.",
        'always_hits': "Ataque veloz e infalible que nunca falla.",
        'stat_down_enemy_def_30': "Puede reducir la Defensa del oponente (30%).",
        'stat_up_self_def_10': "Puede aumentar la Defensa del usuario (10%).",
        'rage': "Aumenta el Ataque cada vez que el usuario recibe daño consecutivo.",
      };
      
      if (effects[md.effect]) return effects[md.effect];
      
      // Better default for status moves
      if (md.cat === 'status') return "Un movimiento que causa un efecto de estado o alteración.";
      
      return "Causa daño al oponente sin efectos secundarios adicionales.";
    }


