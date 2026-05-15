export const FIRE_RED_MAPS = [
  {
    id: 'route1', name: 'Ruta 1', icon: '🌾', badges: 0, desc: 'Pueblo Paleta - Ciudad Verde.', isPlains: true,
    wild: { morning: ['pidgey', 'rattata'], day: ['pidgey', 'rattata'], dusk: ['rattata', 'pidgey'], night: ['rattata', 'pidgey'] },
    rates: { morning: [50, 50], day: [50, 50], dusk: [70, 30], night: [90, 10] }, lv: [2, 5],
    weather: {
      rain: { visitors: { poliwag: 70, oddish: 30 }, exclusive: { castform: 100 } },
      storm: { visitors: { pikachu: 100 } },
      fog: { visitors: { gastly: 100 } },
      snow: { visitors: { seel: 100 } },
      blizzard: { visitors: { jynx: 95 }, exclusive: { articuno: 5 } },
      wind: { visitors: { pidgeotto: 80, butterfree: 20 } },
      cold: { visitors: { seel: 100 } },
      heavy_rain: { visitors: { poliwag: 50, poliwhirl: 40 }, exclusive: { squirtle: 10 } },
      thunderstorm: { visitors: { raichu: 50, jolteon: 45 }, exclusive: { zapdos: 5 } },
      heatwave: { visitors: { arcanine: 50, ponyta: 50 } }
    }
  },
  {
    id: 'route2', name: 'Ruta 2', icon: '🌿', badges: 0, desc: 'Ciudad Verde - Ciudad Plateada.', isForest: true,
    wild: { morning: ['pidgey', 'rattata', 'caterpie', 'weedle'], day: ['pidgey', 'rattata', 'caterpie', 'weedle'], dusk: ['rattata', 'zubat', 'nidoran_f'], night: ['rattata', 'zubat', 'nidoran_m'] },
    rates: { morning: [40, 40, 10, 10], day: [40, 40, 10, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [3, 5],
    weather: {
      rain: { visitors: { psyduck: 60, bellsprout: 40 } },
      sun: { visitors: { bulbasaur: 10 }, exclusive: { sunflora: 100 } },
      fog: { visitors: { abra: 100 } },
      mist: { visitors: { oddish: 50, bellsprout: 50 } },
      wind: { visitors: { pidgey: 70, spearow: 30 } },
      heatwave: { visitors: { exeggutor: 100 } },
      heavy_rain: { visitors: { psyduck: 80, golduck: 20 } },
      thunderstorm: { visitors: { pikachu: 100 } }
    }
  },
  {
    id: 'forest', name: 'Bosque Viridian', icon: '🌲', badges: 0, desc: 'Hogar de bichos y el raro Pikachu.', isForest: true,
    wild: { morning: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu', 'nidoran_f', 'nidoran_m'], day: ['caterpie', 'metapod', 'weedle', 'kakuna', 'pikachu', 'nidoran_f', 'nidoran_m'], dusk: ['weedle', 'kakuna', 'pikachu', 'metapod'], night: ['zubat', 'pikachu', 'weedle', 'kakuna'] },
    rates: { morning: [30, 10, 30, 10, 10, 5, 5], day: [30, 10, 30, 10, 10, 5, 5], dusk: [40, 30, 20, 10], night: [50, 20, 20, 10] }, lv: [3, 6],
    weather: {
      rain: { visitors: { scyther: 20, paras: 80 } },
      storm: { visitors: { voltorb: 90 }, exclusive: { raichu: 10 } },
      fog: { visitors: { venonat: 70, gastly: 30 } },
      mist: { visitors: { pinsir: 10, venomoth: 90 } },
      heavy_rain: { visitors: { scyther: 50, pinsir: 50 } },
      thunderstorm: { visitors: { electabuzz: 100 } }
    }
  },
  {
    id: 'route22', name: 'Ruta 22', icon: '🌾', badges: 0, desc: 'Camino a la Liga Pokémon.', isMountain: true, isPlains: true,
    wild: { morning: ['rattata', 'spearow', 'mankey', 'nidoran_m', 'nidoran_f'], day: ['rattata', 'spearow', 'mankey', 'nidoran_m', 'nidoran_f'], dusk: ['rattata', 'mankey'], night: ['rattata', 'mankey'] },
    rates: { morning: [30, 30, 10, 15, 15], day: [30, 30, 10, 15, 15], dusk: [50, 50], night: [70, 30] }, lv: [3, 5],
    fishing: { pool: ['magikarp', 'goldeen', 'poliwag'], rates: [40, 40, 20], lv: [1, 5] },
    weather: {
      storm: { visitors: { pikachu: 80, magnemite: 20 } },
      sun: { visitors: { ponyta: 100 } },
      sandstorm: { visitors: { sandshrew: 100 } },
      wind: { visitors: { spearow: 80, fearow: 20 } },
      dust_storm: { visitors: { sandslash: 100 } },
      thunderstorm: { visitors: { raichu: 100 } },
      heatwave: { visitors: { ponyta: 80, rapidash: 20 } }
    }
  },
  {
    id: 'route3', name: 'Ruta 3', icon: '⛰️', badges: 1, desc: 'Hacia el Mt. Moon.', isMountain: true,
    wild: { morning: ['pidgey', 'spearow', 'jigglypuff', 'nidoran_m', 'nidoran_f', 'mankey'], day: ['pidgey', 'spearow', 'jigglypuff', 'nidoran_m', 'nidoran_f', 'mankey'], dusk: ['zubat', 'rattata', 'jigglypuff'], night: ['zubat', 'rattata', 'jigglypuff'] },
    rates: { morning: [30, 25, 15, 15, 10, 5], day: [30, 25, 15, 15, 10, 5], dusk: [50, 30, 20], night: [50, 30, 20] }, lv: [6, 12],
    weather: {
      sandstorm: { visitors: { geodude: 80, onix: 20 } },
      sun: { visitors: { growlithe: 100 } },
      fog: { visitors: { drowzee: 100 } },
      cold: { visitors: { jynx: 50, seel: 50 } },
      dust_storm: { visitors: { graveler: 100 } },
      heatwave: { visitors: { growlithe: 70, arcanine: 30 } }
    }
  },
  {
    id: 'mt_moon', name: 'Mt. Moon', icon: '🌋', badges: 1, desc: 'Cueva de fósiles y Clefairy.', isCave: true, isMountain: true,
    wild: { morning: ['zubat', 'geodude', 'paras', 'clefairy'], day: ['zubat', 'geodude', 'paras', 'clefairy'], dusk: ['zubat', 'paras'], night: ['zubat', 'geodude', 'paras', 'clefairy'] },
    rates: { morning: [60, 25, 10, 5], day: [60, 25, 10, 5], dusk: [70, 30], night: [50, 30, 15, 5] }, lv: [8, 12],
    weather: {
      sandstorm: { visitors: { rhyhorn: 95 }, exclusive: { aerodactyl: 5 } },
      fog: { visitors: { gastly: 80, haunter: 20 } },
      snow: { visitors: { jynx: 100 } },
      coldwave: { visitors: { cloyster: 100 } },
      blizzard: { visitors: { jynx: 80, lapras: 20 } },
      dust_storm: { visitors: { rhydon: 100 } }
    }
  },
  {
    id: 'route4', name: 'Ruta 4', icon: '🍃', badges: 1, desc: 'Salida de la cueva.', isMountain: true,
    wild: { morning: ['rattata', 'spearow', 'ekans', 'sandshrew', 'mankey'], day: ['rattata', 'spearow', 'ekans', 'sandshrew', 'mankey'], dusk: ['rattata', 'ekans', 'mankey'], night: ['rattata', 'sandshrew', 'ekans'] },
    rates: { morning: [25, 25, 20, 20, 10], day: [25, 25, 20, 20, 10], dusk: [50, 30, 20], night: [50, 30, 20] }, lv: [10, 14],
    weather: {
      rain: { visitors: { psyduck: 70, goldeen: 30 } },
      sun: { visitors: { vulpix: 100 } },
      sandstorm: { visitors: { diglett: 100 } },
      wind: { visitors: { pidgeotto: 100 } },
      dust_storm: { visitors: { sandslash: 100 } },
      heavy_rain: { visitors: { golduck: 100 } },
      heatwave: { visitors: { ninetales: 100 } }
    }
  },
  {
    id: 'route24', name: 'Ruta 24', icon: '🌉', badges: 2, desc: 'Puente Pepita.', isCoastal: true,
    wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'abra', 'venonat'], day: ['pidgey', 'oddish', 'bellsprout', 'abra', 'venonat'], dusk: ['oddish', 'venonat', 'abra'], night: ['oddish', 'meowth', 'abra'] },
    rates: { morning: [25, 25, 25, 15, 10], day: [25, 25, 25, 15, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [12, 16],
    fishing: { pool: ['psyduck', 'krabby', 'horsea'], rates: [35, 35, 30], lv: [1, 5] },
    weather: {
      rain: { visitors: { slowpoke: 70, poliwag: 30 } },
      storm: { visitors: { pikachu: 95 }, exclusive: { zapdos: 5 } },
      fog: { visitors: { venomoth: 100 } },
      strong_winds: { visitors: { dragonair: 100 } },
      heavy_rain: { visitors: { poliwrath: 100 } },
      thunderstorm: { visitors: { raichu: 90, dragonite: 10 } }
    }
  },
  {
    id: 'route25', name: 'Ruta 25', icon: '🏠', badges: 2, desc: 'Cerca de la casa de Bill.', isCoastal: true,
    wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'abra', 'metapod', 'kakuna'], day: ['pidgey', 'oddish', 'bellsprout', 'abra', 'metapod', 'kakuna'], dusk: ['abra', 'venonat'], night: ['abra', 'meowth'] },
    rates: { morning: [20, 20, 20, 10, 15, 15], day: [20, 20, 20, 10, 15, 15], dusk: [50, 50], night: [50, 50] }, lv: [12, 16],
    weather: {
      rain: { visitors: { krabby: 70, staryu: 30 } },
      sun: { visitors: { charmander: 10 } },
      fog: { visitors: { kadabra: 100 } },
      mist: { visitors: { abra: 100 } },
      heavy_rain: { visitors: { kingler: 100 } },
      heatwave: { visitors: { charmander: 50, charmeleon: 50 } },
      thunderstorm: { visitors: { electabuzz: 100 } }
    }
  },
  {
    id: 'route5', name: 'Ruta 5', icon: '🌾', badges: 2, desc: 'Hacia Ciudad Azafrán.', isPlains: true,
    wild: { morning: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'abra', 'tangela', 'mr_mime'], day: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'abra', 'tangela', 'mr_mime'], dusk: ['meowth', 'abra', 'tangela'], night: ['meowth', 'abra', 'mr_mime'] },
    rates: { morning: [25, 20, 15, 15, 15, 8, 2], day: [25, 20, 15, 15, 15, 8, 2], dusk: [50, 35, 15], night: [55, 35, 10] }, lv: [13, 16],
    weather: {
      sun: { visitors: { growlithe: 50, vulpix: 50 } },
      fog: { visitors: { drowzee: 80, hypno: 20 } },
      rain: { visitors: { psyduck: 100 } },
      wind: { visitors: { pidgeotto: 50, fearow: 50 } },
      heatwave: { visitors: { ninetales: 100 } },
      heavy_rain: { visitors: { golduck: 100 } },
      strong_winds: { visitors: { pidgeot: 100 } }
    }
  },
  {
    id: 'route6', name: 'Ruta 6', icon: '🌾', badges: 2, desc: 'Conecta Celeste con Carmín.', isPlains: true, isCoastal: true,
    wild: { morning: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'psyduck', 'mankey', 'tangela'], day: ['pidgey', 'meowth', 'oddish', 'bellsprout', 'psyduck', 'mankey', 'tangela'], dusk: ['meowth', 'psyduck', 'tangela'], night: ['meowth', 'psyduck'] },
    rates: { morning: [20, 18, 13, 13, 13, 13, 10], day: [20, 18, 13, 13, 13, 13, 10], dusk: [45, 40, 15], night: [60, 40] }, lv: [13, 16],
    fishing: { pool: ['slowpoke', 'shellder', 'poliwhirl'], rates: [45, 45, 10], lv: [10, 15] },
    weather: {
      rain: { visitors: { golduck: 70, poliwrath: 30 } },
      storm: { visitors: { magnemite: 100 } },
      sun: { visitors: { ponyta: 100 } },
      wind: { visitors: { pidgeotto: 100 } },
      heavy_rain: { visitors: { poliwrath: 100 } },
      thunderstorm: { visitors: { raichu: 100 } },
      heatwave: { visitors: { rapidash: 100 } },
      strong_winds: { visitors: { pidgeot: 100 } }
    }
  },
  {
    id: 'route11', name: 'Ruta 11', icon: '🌾', badges: 3, desc: 'Al este de Carmín.', isCoastal: true,
    wild: { morning: ['spearow', 'ekans', 'sandshrew', 'drowzee'], day: ['spearow', 'ekans', 'sandshrew', 'drowzee'], dusk: ['drowzee', 'spearow'], night: ['drowzee', 'hypno'] },
    rates: { morning: [25, 25, 25, 25], day: [25, 25, 25, 25], dusk: [70, 30], night: [90, 10] }, lv: [15, 19],
    weather: {
      storm: { visitors: { voltorb: 80, electrode: 20 } },
      sandstorm: { visitors: { diglett: 70, dugtrio: 30 } },
      fog: { visitors: { mr_mime: 100 } },
      thunderstorm: { visitors: { electrode: 100 } },
      dust_storm: { visitors: { dugtrio: 100 } }
    }
  },
  {
    id: 'diglett_cave', name: 'Cueva Diglett', icon: '🕳️', badges: 2, desc: 'Atajo bajo tierra.', isCave: true, isMountain: true,
    wild: { morning: ['diglett', 'dugtrio'], day: ['diglett', 'dugtrio'], dusk: ['diglett'], night: ['diglett', 'dugtrio'] },
    rates: { morning: [95, 5], day: [95, 5], dusk: [100], night: [98, 2] }, lv: [15, 31],
    weather: {
      sandstorm: { visitors: { onix: 50, geodude: 40 }, exclusive: { golem: 10 } },
      fog: { visitors: { zubat: 80, golbat: 20 } },
      dust_storm: { visitors: { rhydon: 100 } }
    }
  },
  {
    id: 'route9', name: 'Ruta 9', icon: '⛰️', badges: 3, desc: 'Hacia el Túnel Roca.', isMountain: true,
    wild: { morning: ['spearow', 'rattata', 'ekans', 'sandshrew', 'nidoran_m', 'nidoran_f'], day: ['spearow', 'rattata', 'ekans', 'sandshrew', 'nidoran_m', 'nidoran_f'], dusk: ['zubat', 'rattata'], night: ['zubat', 'rattata'] },
    rates: { morning: [20, 20, 15, 15, 15, 15], day: [20, 20, 15, 15, 15, 15], dusk: [60, 40], night: [70, 30] }, lv: [14, 18],
    weather: {
      sandstorm: { visitors: { machop: 70, geodude: 30 } },
      sun: { visitors: { mankey: 80, primeape: 20 } },
      fog: { visitors: { drowzee: 100 } },
      dust_storm: { visitors: { machoke: 100 } },
      heatwave: { visitors: { primeape: 100 } }
    }
  },
  {
    id: 'rock_tunnel', name: 'Túnel Roca', icon: '🔦', badges: 3, desc: 'Oscuridad total.', isCave: true, isMountain: true,
    wild: { morning: ['zubat', 'geodude', 'machop', 'onix'], day: ['zubat', 'geodude', 'machop', 'onix'], dusk: ['zubat', 'geodude'], night: ['zubat', 'geodude', 'machop', 'onix'] },
    rates: { morning: [50, 40, 5, 5], day: [50, 40, 5, 5], dusk: [60, 40], night: [50, 35, 10, 5] }, lv: [16, 21],
    weather: {
      sandstorm: { visitors: { graveler: 80, rhyhorn: 20 } },
      fog: { visitors: { gastly: 85, haunter: 10 }, exclusive: { gengar: 5 } },
      snow: { visitors: { seel: 100 } },
      mist: { visitors: { zubat: 90, golbat: 10 } },
      cold: { visitors: { seel: 90, shellder: 10 } },
      coldwave: { visitors: { dewgong: 100 } },
      dust_storm: { visitors: { graveler: 100 } },
      blizzard: { visitors: { cloyster: 100 } }
    }
  },
  {
    id: 'route10', name: 'Ruta 10', icon: '⚡', badges: 3, desc: 'Cerca de la Central Energía.', isMountain: true, isCoastal: true,
    wild: { morning: ['spearow', 'ekans', 'sandshrew', 'voltorb', 'magnemite'], day: ['spearow', 'ekans', 'sandshrew', 'voltorb', 'magnemite'], dusk: ['magnemite', 'voltorb'], night: ['magnemite', 'voltorb'] },
    rates: { morning: [20, 20, 20, 20, 20], day: [20, 20, 20, 20, 20], dusk: [50, 50], night: [60, 40] }, lv: [16, 20],
    weather: {
      storm: { visitors: { pikachu: 80, electabuzz: 20 } },
      rain: { visitors: { krabby: 100 } },
      fog: { visitors: { abra: 100 } },
      strong_winds: { visitors: { fearow: 100 } },
      wind: { visitors: { spearow: 80, pidgey: 20 } },
      cold: { visitors: { shellder: 100 } },
      thunderstorm: { visitors: { electabuzz: 90, zapdos: 10 } },
      heavy_rain: { visitors: { kingler: 100 } }
    }
  },
  {
    id: 'power_plant', name: 'Central Energía', icon: '⚡', badges: 5, desc: 'Hogar del legendario Zapdos.', isIndoors: true, isCoastal: true,
    wild: { morning: ['pikachu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz'], day: ['pikachu', 'magnemite', 'magneton', 'voltorb', 'electrode', 'electabuzz'], dusk: ['magnemite', 'voltorb'], night: ['magneton', 'electrode', 'electabuzz'] },
    rates: { morning: [25, 25, 10, 20, 10, 10], day: [25, 25, 10, 20, 10, 10], dusk: [50, 50], night: [40, 40, 20] }, lv: [30, 35],
    weather: {
      storm: { visitors: { jolteon: 60, raichu: 35 }, exclusive: { zapdos: 5 } },
      fog: { visitors: { kadabra: 90, alakazam: 10 } },
      heatwave: { visitors: { magmar: 100 } },
      thunderstorm: { visitors: { jolteon: 60, raichu: 30 }, exclusive: { zapdos: 10 } }
    }
  },
  {
    id: 'route8', name: 'Ruta 8', icon: '🌾', badges: 4, desc: 'Conecta Lavanda con Azafrán.', isPlains: true,
    wild: { morning: ['pidgey', 'meowth', 'ekans', 'sandshrew', 'growlithe', 'vulpix', 'abra', 'tangela', 'mr_mime', 'lickitung'], day: ['pidgey', 'meowth', 'ekans', 'sandshrew', 'growlithe', 'vulpix', 'abra', 'tangela', 'mr_mime', 'lickitung'], dusk: ['meowth', 'abra', 'kadabra', 'tangela'], night: ['meowth', 'abra', 'kadabra', 'lickitung'] },
    rates: { morning: [18, 15, 13, 13, 10, 10, 10, 8, 2, 1], day: [18, 15, 13, 13, 10, 10, 10, 8, 2, 1], dusk: [38, 35, 20, 7], night: [40, 35, 20, 5] }, lv: [18, 22],
    weather: {
      sun: { visitors: { arcanine: 50, ninetales: 50 } },
      fog: { visitors: { kadabra: 70, haunter: 30 } },
      heatwave: { visitors: { magmar: 100 } },
      intense_sun: { visitors: { exeggutor: 100 } },
      rain: { visitors: { psyduck: 100 } },
      wind: { visitors: { pidgeotto: 100 } },
      strong_winds: { visitors: { fearow: 100 } },
      cold: { visitors: { jynx: 100 } },
      heavy_rain: { visitors: { gyarados: 100 } },
      thunderstorm: { visitors: { jolteon: 100 } }
    }
  },
  {
    id: 'pokemon_tower', name: 'Torre Pokémon', icon: '👻', badges: 4, desc: 'Descanso de los Pokémon.', isIndoors: true, isUrban: true,
    wild: { morning: ['gastly'], day: ['gastly'], dusk: ['gastly', 'haunter'], night: ['gastly', 'haunter', 'cubone'] },
    rates: { morning: [100], day: [100], dusk: [80, 20], night: [70, 20, 10] }, lv: [20, 25],
    weather: {
      fog: { visitors: { gengar: 80, alakazam: 20 } },
      mist: { visitors: { gastly: 100 } },
      cold: { visitors: { misdreavus: 100 } }
    }
  },
  {
    id: 'route12', name: 'Ruta 12', icon: '🌊', badges: 4, desc: 'Vía marítima.', isCoastal: true,
    wild: { morning: ['pidgey', 'oddish', 'bellsprout', 'venonat', 'weepinbell', 'gloom', 'snorlax', 'farfetchd'], day: ['pidgey', 'oddish', 'bellsprout', 'venonat', 'weepinbell', 'gloom', 'snorlax', 'farfetchd'], dusk: ['venonat', 'zubat', 'farfetchd'], night: ['venonat', 'zubat', 'golbat'] },
    rates: { morning: [18, 18, 18, 13, 10, 10, 5, 8], day: [18, 18, 18, 13, 10, 10, 5, 8], dusk: [55, 35, 10], night: [50, 40, 10] }, lv: [22, 26],
    fishing: { pool: ['tentacool', 'seel', 'staryu'], rates: [40, 40, 20], lv: [10, 15] },
    weather: {
      rain: { visitors: { slowbro: 60, poliwhirl: 40 } },
      storm: { visitors: { dragonair: 100 } },
      sun: { visitors: { tangela: 100 } },
      strong_winds: { visitors: { dragonite: 95 }, exclusive: { lugia: 5 } },
      mist: { visitors: { tentacruel: 100 } },
      fog: { visitors: { shellder: 100 } },
      wind: { visitors: { pidgeotto: 100 } },
      heavy_rain: { visitors: { gyarados: 100 } },
      thunderstorm: { visitors: { dragonite: 100 } },
      heatwave: { visitors: { exeggutor: 100 } }
    }
  },
  {
    id: 'route13', name: 'Ruta 13', icon: '🌾', badges: 5, desc: 'Laberinto de vallas.', isCoastal: true,
    wild: { morning: ['pidgey', 'pidgeotto', 'oddish', 'bellsprout', 'venonat', 'ditto', 'farfetchd'], day: ['pidgey', 'pidgeotto', 'oddish', 'bellsprout', 'venonat', 'ditto', 'farfetchd'], dusk: ['venonat', 'ditto', 'farfetchd'], night: ['venonat', 'ditto'] },
    rates: { morning: [18, 8, 18, 18, 18, 10, 10], day: [18, 8, 18, 18, 18, 10, 10], dusk: [50, 35, 15], night: [60, 40] }, lv: [24, 28],
    weather: {
      sun: { visitors: { vileplume: 50, victreebel: 50 } },
      rain: { visitors: { farfetchd: 100 } },
      fog: { visitors: { venomoth: 100 } },
      mist: { visitors: { gloom: 50, weepinbell: 50 } },
      heatwave: { visitors: { vileplume: 50, victreebel: 50 } },
      heavy_rain: { visitors: { poliwrath: 100 } },
      thunderstorm: { visitors: { dragonair: 100 } }
    }
  },
  {
    id: 'safari_zone', name: 'Zona Safari', icon: '🦒', badges: 5, desc: 'Pokémon raros de todo el mundo.', isForest: true, isSwamp: true,
    wild: { morning: ['nidoran_f', 'nidoran_m', 'parasect', 'venomoth', 'scyther', 'pinsir', 'chansey', 'tauros', 'kangaskhan', 'exeggcute', 'rhyhorn', 'slowpoke', 'lickitung', 'poliwag'], day: ['nidoran_f', 'nidoran_m', 'parasect', 'venomoth', 'scyther', 'pinsir', 'chansey', 'tauros', 'kangaskhan', 'exeggcute', 'rhyhorn', 'slowpoke', 'lickitung', 'poliwag'], dusk: ['venomoth', 'parasect', 'slowpoke'], night: ['venomoth', 'parasect', 'slowpoke', 'chansey'] },
    rates: { morning: [8, 8, 8, 8, 5, 5, 5, 5, 5, 15, 10, 8, 5, 5], day: [8, 8, 8, 8, 5, 5, 5, 5, 5, 15, 10, 8, 5, 5], dusk: [45, 40, 15], night: [30, 30, 20, 20] }, lv: [25, 35],
    fishing: { pool: ['seaking', 'dratini', 'dragonair'], rates: [90, 8, 2], lv: [30, 35] },
    weather: {
      rain: { visitors: { psyduck: 70, golduck: 30 } },
      sun: { visitors: { exeggutor: 60, tangela: 40 } },
      sandstorm: { visitors: { rhydon: 100 } },
      mist: { visitors: { pinsir: 50, scyther: 50 } },
      fog: { visitors: { venonat: 100 } },
      wind: { visitors: { pidgeotto: 100 } },
      heatwave: { visitors: { magmar: 100 } },
      intense_sun: { visitors: { tangela: 100 } },
      heavy_rain: { visitors: { chansey: 100 } },
      thunderstorm: { visitors: { scyther: 50, pinsir: 50 } },
      dust_storm: { visitors: { rhydon: 100 } },
      strong_winds: { visitors: { dragonite: 100 } }
    }
  },
  {
    id: 'seafoam_islands', name: 'Islas Espuma', icon: '❄️', badges: 6, desc: 'Cueva de hielo y Articuno.', isCave: true, isArctic: true,
    wild: { morning: ['seel', 'dewgong', 'shellder', 'horsea', 'krabby', 'golduck', 'slowbro', 'jynx'], day: ['seel', 'dewgong', 'shellder', 'horsea', 'krabby', 'golduck', 'slowbro', 'jynx'], dusk: ['seel', 'shellder'], night: ['seel', 'dewgong', 'staryu'] },
    rates: { morning: [20, 10, 15, 15, 15, 10, 10, 5], day: [20, 10, 15, 15, 15, 10, 10, 5], dusk: [60, 40], night: [50, 30, 20] }, lv: [30, 40],
    fishing: { pool: ['shellder', 'dewgong', 'tentacruel'], rates: [50, 25, 25], lv: [30, 40] },
    weather: {
      snow: { visitors: { cloyster: 85, lapras: 10 }, exclusive: { articuno: 5 } },
      rain: { visitors: { tentacruel: 60, kingler: 40 } },
      coldwave: { visitors: { dewgong: 100 } },
      cold: { visitors: { shellder: 70, seel: 30 } },
      blizzard: { visitors: { jynx: 100 } },
      fog: { visitors: { staryu: 100 } },
      heavy_rain: { visitors: { cloyster: 100 } }
    }
  },
  {
    id: 'mansion', name: 'Mansión Pokémon', icon: '🏚️', badges: 7, desc: 'Laboratorio quemado.', isCave: true, isIndoors: true, isVolcanic: true,
    wild: { morning: ['koffing', 'weezing', 'grimer', 'muk', 'ponyta', 'rapidash', 'magmar', 'vulpix', 'growlithe'], day: ['koffing', 'weezing', 'grimer', 'muk', 'ponyta', 'rapidash', 'magmar', 'vulpix', 'growlithe'], dusk: ['koffing', 'grimer', 'magmar'], night: ['weezing', 'muk', 'magmar'] },
    rates: { morning: [15, 10, 15, 10, 15, 10, 5, 10, 10], day: [15, 10, 15, 10, 15, 10, 5, 10, 10], dusk: [40, 40, 20], night: [40, 40, 20] }, lv: [32, 38],
    weather: {
      sun: { visitors: { arcanine: 60, rapidash: 40 } },
      heatwave: { visitors: { magmar: 95 }, exclusive: { moltres: 5 } },
      fog: { visitors: { haunter: 80, muk: 20 } },
      mist: { visitors: { koffing: 100 } }
    }
  },
  {
    id: 'route23', name: 'Ruta 23', icon: '⛰️', badges: 8, desc: 'Acceso a Calle Victoria.', isMountain: true,
    wild: { morning: ['spearow', 'fearow', 'ekans', 'arbok', 'sandshrew', 'sandslash', 'mankey', 'primeape'], day: ['spearow', 'fearow', 'ekans', 'arbok', 'sandshrew', 'sandslash', 'mankey', 'primeape'], dusk: ['fearow', 'arbok'], night: ['sandslash', 'primeape'] },
    rates: { morning: [15, 10, 15, 10, 15, 10, 15, 10], day: [15, 10, 15, 10, 15, 10, 15, 10], dusk: [50, 50], night: [50, 50] }, lv: [40, 45],
    weather: {
      sandstorm: { visitors: { rhydon: 70, marowak: 30 } },
      sun: { visitors: { primeape: 80, fearow: 20 } },
      storm: { visitors: { magneton: 100 } },
      wind: { visitors: { pidgeot: 100 } },
      strong_winds: { visitors: { dragonite: 100 } },
      dust_storm: { visitors: { rhydon: 70, tyranitar: 30 } },
      thunderstorm: { visitors: { dragonite: 100 } },
      heatwave: { visitors: { moltres: 100 } }
    }
  },
  {
    id: 'victory_road', name: 'Calle Victoria', icon: '⛰️', badges: 8, desc: 'El desafío final.', isCave: true, isMountain: true,
    wild: { morning: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'], day: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'], dusk: ['machoke', 'graveler', 'onix'], night: ['machop', 'machoke', 'geodude', 'graveler', 'onix', 'marowak', 'hitmonlee', 'hitmonchan'] },
    rates: { morning: [15, 15, 15, 15, 10, 10, 10, 10], day: [15, 15, 15, 15, 10, 10, 10, 10], dusk: [40, 30, 30], night: [15, 15, 15, 15, 10, 10, 10, 10] }, lv: [42, 50],
    weather: {
      sandstorm: { visitors: { machamp: 80, golem: 20 } },
      fog: { visitors: { haunter: 80, kadabra: 20 } },
      snow: { visitors: { dewgong: 100 } },
      mist: { visitors: { onix: 100 } },
      cold: { visitors: { cloyster: 100 } },
      dust_storm: { visitors: { machamp: 100 } },
      blizzard: { visitors: { artincuno: 10, lapras: 90 } },
      coldwave: { visitors: { jynx: 100 } }
    }
  },
  {
    id: 'cerulean_cave', name: 'Cueva Celeste', icon: '✨', badges: 8, desc: 'Lugar de descanso de Mewtwo.', isCave: true, isCoastal: true,
    wild: { morning: ['kadabra', 'rhydon', 'golduck', 'magneton', 'parasect', 'venomoth', 'dragonair'], day: ['kadabra', 'rhydon', 'golduck', 'magneton', 'parasect', 'venomoth', 'dragonair'], dusk: ['kadabra', 'magneton'], night: ['kadabra', 'magneton', 'dragonite'] },
    rates: { morning: [15, 15, 15, 15, 15, 15, 10], day: [15, 15, 15, 15, 15, 15, 10], dusk: [50, 50], night: [40, 40, 20] }, lv: [50, 65],
    fishing: { pool: ['golduck', 'poliwhirl', 'gyarados'], rates: [50, 40, 10], lv: [30, 50] },
    weather: {
      fog: { visitors: { alakazam: 90, gengar: 9 }, exclusive: { mewtwo: 1 } },
      storm: { visitors: { dragonite: 80, magneton: 20 } },
      mist: { visitors: { ditto: 100 } },
      thunderstorm: { visitors: { dragonite: 80, magneton: 20 } }
    }
  }
];
