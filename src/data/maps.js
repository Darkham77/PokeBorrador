export const FIRE_RED_MAPS = [
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
