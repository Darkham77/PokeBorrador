import { defineStore } from 'pinia'
import { useGameStore } from './game'
import { useBattleStore } from './battle'
import { makePokemon } from '@/logic/pokemonFactory'

export const useGymsStore = defineStore('gyms', {
  state: () => ({
    gyms: [
      {
        id: 'pewter', name: 'Gimnasio Plateada', city: 'Ciudad Plateada',
        leader: 'Brock', type: 'rock', typeColor: '#c8a060',
        badge: '💎', badgeName: 'Medalla Roca',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/brock.webp',
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
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/misty.webp',
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
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/ltsurge.webp',
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
        id: 'celadon', name: 'Gimnasio Celadón', city: 'Ciudad Celadón',
        leader: 'Erika', type: 'grass', typeColor: '#6BCB77',
        badge: '🌿', badgeName: 'Medalla Arcoíris',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/erika.webp',
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
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/koga.webp',
        quote: '¡El veneno es el arma más elegante de un ninja Pokémon!',
        victoryQuote: '¡Jajaja! Mis técnicas ninja han sido superadas. Has demostrado una gran tenacidad. ¡Usa esta técnica secreta con sabiduría!',
        rewardTM: 'MT06 Tóxico',
        pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43], badgesRequired: 4,
        difficulties: {
          easy: { pokemon: ['koffing', 'muk', 'koffing', 'weezing'], levels: [37, 39, 37, 43] },
          normal: { pokemon: ['golbat', 'venomoth', 'muk', 'weezing'], levels: [54, 56, 58, 62] },
          hard: { pokemon: ['crobat', 'venomoth', 'muk', 'nidoking', 'nidoqueen', 'weezing'], levels: [74, 76, 76, 78, 78, 80] }
        }
      },
      {
        id: 'saffron', name: 'Gimnasio Azafrán', city: 'Ciudad Azafrán',
        leader: 'Sabrina', type: 'psychic', typeColor: '#FF793F',
        badge: '🔮', badgeName: 'Medalla Marsh',
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/sabrina.webp',
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
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/blaine.webp',
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
        sprite: 'https://play.pokemonshowdown.com/sprites/trainers/giovanni.webp',
        quote: '¡Seré el último y más difícil obstáculo en tu camino!',
        victoryQuote: 'He perdido... Una vez más. Tu fuerza es incuestionable. No tengo nada más que enseñarte por ahora. Toma esto y sigue tu camino.',
        rewardTM: 'MT26 Terremoto',
        pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50], badgesRequired: 7,
        difficulties: {
          easy: { pokemon: ['rhyhorn', 'dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [45, 42, 44, 45, 50] },
          normal: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'rhydon'], levels: [65, 66, 67, 70] },
          hard: { pokemon: ['dugtrio', 'nidoqueen', 'nidoking', 'marowak', 'sandslash', 'rhydon'], levels: [85, 87, 87, 87, 87, 90] }
        }
      }
    ],
    defeatedGyms: []
  }),
  actions: {
    async loadGymProgress() {
      const gameStore = useGameStore()
      this.defeatedGyms = gameStore.state.defeatedGyms || []
    },
    isGymDefeated(gymId) {
      return this.defeatedGyms.includes(gymId)
    },
    async challengeGym(gymId, difficulty = 'easy') {
      const battleStore = useBattleStore()
      
      const gym = this.gyms.find(g => g.id === gymId)
      if (!gym) return

      const diffData = gym.difficulties[difficulty] || gym.difficulties.easy
      const enemyTeam = diffData.pokemon.map((id, idx) => makePokemon(id, diffData.levels[idx]))
      
      const mainEnemy = enemyTeam[enemyTeam.length - 1] // The ace

      await battleStore.startBattle(mainEnemy, {
        isGym: true,
        gymId: gym.id,
        trainerName: `Líder ${gym.leader}`,
        enemyTeam: enemyTeam,
        locationId: 'gym',
        battleOptions: {
          difficulty,
          rewardTM: gym.rewardTM
        }
      })
    }
  }
})
