import { defineStore } from 'pinia'
import { useGameStore } from './game'
import { useUIStore } from './ui'
import { supabase } from '@/logic/supabase'

export const useBreedingStore = defineStore('breeding', {
  state: () => ({
    slots: [
      { id: 'a', pokemon: null, item: null },
      { id: 'b', pokemon: null, item: null }
    ],
    eggs: [],
    loading: false,
    
    // Static data from legacy code
    EGG_GROUPS: {
      abra: ['humanshape'], aerodactyl: ['flying'], alakazam: ['humanshape'],
      arbok: ['dragon', 'ground'], arcanine: ['ground'], articuno: ['no-eggs'],
      beedrill: ['bug'], bellsprout: ['plant'], blastoise: ['monster', 'water1'],
      bulbasaur: ['monster', 'plant'], butterfree: ['bug'], caterpie: ['bug'],
      chansey: ['fairy'], charizard: ['dragon', 'monster'], charmander: ['dragon', 'monster'],
      charmeleon: ['dragon', 'monster'], clefable: ['fairy'], clefairy: ['fairy'],
      cleffa: ['no-eggs'], cloyster: ['water3'], cubone: ['monster'],
      dewgong: ['ground', 'water1'], diglett: ['ground'], ditto: ['ditto'],
      dodrio: ['flying'], doduo: ['flying'], dragonair: ['dragon', 'water1'],
      dragonite: ['dragon', 'water1'], dratini: ['dragon', 'water1'], drowzee: ['humanshape'],
      dugtrio: ['ground'], eevee: ['ground'], ekans: ['dragon', 'ground'],
      electabuzz: ['humanshape'], electrode: ['mineral'], elekid: ['no-eggs'],
      exeggcute: ['plant'], exeggutor: ['plant'], farfetchd: ['flying', 'ground'],
      fearow: ['flying'], flareon: ['ground'], gastly: ['indeterminate'],
      gengar: ['indeterminate'], geodude: ['mineral'], gloom: ['plant'],
      golbat: ['flying'], goldeen: ['water2'], golduck: ['ground', 'water1'],
      golem: ['mineral'], graveler: ['mineral'], grimer: ['indeterminate'],
      growlithe: ['ground'], gyarados: ['dragon', 'water2'], haunter: ['indeterminate'],
      hitmonchan: ['humanshape'], hitmonlee: ['humanshape'], horsea: ['dragon', 'water1'],
      hypno: ['humanshape'], igglybuff: ['no-eggs'], ivysaur: ['monster', 'plant'],
      jigglypuff: ['fairy'], jolteon: ['ground'], jynx: ['humanshape'],
      kabuto: ['water1', 'water3'], kabutops: ['water1', 'water3'], kadabra: ['humanshape'],
      kakuna: ['bug'], kangaskhan: ['monster'], kingler: ['water3'],
      koffing: ['indeterminate'], krabby: ['water3'], lapras: ['monster', 'water1'],
      lickitung: ['monster'], machamp: ['humanshape'], machoke: ['humanshape'],
      machop: ['humanshape'], magby: ['no-eggs'], magikarp: ['dragon', 'water2'],
      magmar: ['humanshape'], magnemite: ['mineral'], magneton: ['mineral'],
      mankey: ['ground'], marowak: ['monster'], meowth: ['ground'],
      metapod: ['bug'], mew: ['no-eggs'], mewtwo: ['no-eggs'], moltres: ['no-eggs'],
      mr_mime: ['humanshape'], muk: ['indeterminate'], nidoking: ['ground', 'monster'],
      nidoqueen: ['no-eggs'], nidoran_f: ['ground', 'monster'], nidoran_m: ['ground', 'monster'],
      nidorina: ['no-eggs'], nidorino: ['ground', 'monster'], ninetales: ['ground'],
      oddish: ['plant'], omanyte: ['water1', 'water3'], omastar: ['water1', 'water3'],
      onix: ['mineral'], paras: ['bug', 'plant'], parasect: ['bug', 'plant'],
      persian: ['ground'], pichu: ['no-eggs'], pidgeot: ['flying'],
      pidgeotto: ['flying'], pidgey: ['flying'], pikachu: ['fairy', 'ground'],
      pinsir: ['bug'], poliwag: ['water1'], poliwhirl: ['water1'],
      poliwrath: ['water1'], ponyta: ['ground'], porygon: ['mineral'],
      primeape: ['ground'], psyduck: ['ground', 'water1'], raichu: ['fairy', 'ground'],
      rapidash: ['ground'], raticate: ['ground'], rattata: ['ground'],
      rhydon: ['ground', 'monster'], rhyhorn: ['ground', 'monster'], sandshrew: ['ground'],
      sandslash: ['ground'], scyther: ['bug'], seadra: ['dragon', 'water1'],
      seaking: ['water2'], seel: ['ground', 'water1'], shellder: ['water3'],
      slowbro: ['monster', 'water1'], slowpoke: ['monster', 'water1'], snorlax: ['monster'],
      spearow: ['flying'], squirtle: ['monster', 'water1'], starmie: ['water3'],
      staryu: ['water3'], tangela: ['plant'], tauros: ['ground'],
      tentacool: ['water3'], tentacruel: ['water3'], togepi: ['no-eggs'],
      vaporeon: ['ground'], venomoth: ['bug'], venonat: ['bug'],
      venusaur: ['monster', 'plant'], victreebel: ['plant'], vileplume: ['plant'],
      voltorb: ['mineral'], vulpix: ['ground'], wartortle: ['monster', 'water1'],
      weedle: ['bug'], weepinbell: ['plant'], weezing: ['indeterminate'],
      wigglytuff: ['fairy'], zapdos: ['no-eggs'], zubat: ['flying']
    },
    
    COMPAT_TEXT: {
      0: { label: '❌ Incompatibles', color: '#ff5252' },
      1: { label: '😐 Poco interés', color: '#ffb142' },
      2: { label: '🙂 Compatibles', color: '#33d9b2' },
      3: { label: '❤️ Muy compatibles', color: '#ff793f' }
    },
    
    EGG_SPAWN_INTERVAL_MS: {
      1: 12 * 60 * 60 * 1000, 
      2: 9 * 60 * 60 * 1000, 
      3: 6 * 60 * 60 * 1000 
    }

  }),
  
  getters: {
    compatibility() {
      if (!this.slots[0].pokemon || !this.slots[1].pokemon) return { level: 0 }
      return this.checkCompatibility(this.slots[0].pokemon, this.slots[1].pokemon)
    }
  },
  
  actions: {
    async loadDaycareData() {
      this.loading = true
      const gameStore = useGameStore()
      const userId = gameStore.user?.id
      if (!userId) return

      try {
        const { data, error } = await supabase
          .from('daycare_slots')
          .select('*')
          .eq('player_id', userId)
          .order('slot_index')

        if (error) throw error

        this.slots = [
          { id: 'a', pokemon: null, item: null },
          { id: 'b', pokemon: null, item: null }
        ]

        data.forEach(s => {
          const idx = s.slot_index === 1 ? 0 : 1
          const p = gameStore.state.team.find(x => x.uid === s.pokemon_id) || 
                    gameStore.state.box?.find(x => x.uid === s.pokemon_id)
          
          if (p) {
            p.inDaycare = true
            this.slots[idx].pokemon = p
            this.slots[idx].item = p.heldItem || null
          }
        })

        // Also load eggs
        const { data: eggData } = await supabase
          .from('eggs')
          .select('*')
          .eq('player_id', userId)
        
        this.eggs = eggData || []
      } catch (err) {
        console.error('Error fetching daycare:', err)
      } finally {
        this.loading = false
      }
    },

    getBaseEvolution(id) {
      if (!id) return id
      const baseIdMap = {
        ivysaur: 'bulbasaur', venusaur: 'bulbasaur',
        charmeleon: 'charmander', charizard: 'charmander',
        wartortle: 'squirtle', blastoise: 'squirtle',
        metapod: 'caterpie', butterfree: 'caterpie',
        kakuna: 'weedle', beedrill: 'weedle',
        pidgeotto: 'pidgey', pidgeot: 'pidgey',
        raticate: 'rattata', fearow: 'spearow',
        arbok: 'ekans', raichu: 'pikachu',
        sandslash: 'sandshrew', nidorina: 'nidoran_f',
        nidoqueen: 'nidoran_f', nidorino: 'nidoran_m',
        nidoking: 'nidoran_m', clefable: 'clefairy',
        ninetales: 'vulpix', wigglytuff: 'jigglypuff',
        golbat: 'zubat', gloom: 'oddish',
        vileplume: 'oddish', parasect: 'paras',
        venomoth: 'venonat', dugtrio: 'diglett',
        persian: 'meowth', golduck: 'psyduck',
        primeape: 'mankey', arcanine: 'growlithe',
        poliwhirl: 'poliwag', poliwrath: 'poliwag',
        kadabra: 'abra', alakazam: 'abra',
        machoke: 'machop', machamp: 'machop',
        weepinbell: 'bellsprout', victreebel: 'bellsprout',
        tentacruel: 'tentacool', graveler: 'geodude',
        golem: 'geodude', rapidash: 'ponyta',
        slowbro: 'slowpoke', magneton: 'magnemite',
        dodrio: 'doduo', dewgong: 'seel',
        muk: 'grimer', cloyster: 'shellder',
        haunter: 'gastly', gengar: 'gastly',
        hypno: 'drowzee', kingler: 'krabby',
        electrode: 'voltorb', exeggutor: 'exeggcute',
        marowak: 'cubone', weezing: 'koffing',
        rhydon: 'rhyhorn', seadra: 'horsea',
        seaking: 'goldeen', starmie: 'staryu',
        vaporeon: 'eevee', jolteon: 'eevee',
        flareon: 'eevee', kabutops: 'kabuto',
        omastar: 'omanyte', dragonair: 'dratini',
        dragonite: 'dratini', gyarados: 'magikarp'
      }
      return baseIdMap[id] || id
    },

    getBabyOrBase(motherId) {
      const base = this.getBaseEvolution(motherId)
      const BABY_MAP = {
        pikachu: 'pichu',
        clefairy: 'cleffa',
        jigglypuff: 'igglybuff',
        electabuzz: 'elekid',
        magmar: 'magby'
      }
      const baby = BABY_MAP[base]
      if (baby && baby in this.EGG_GROUPS) return baby
      return base
    },

    checkCompatibility(pA, pB) {
      const idA = pA.id
      const idB = pB.id
      const gA = this.EGG_GROUPS[idA] || []
      const gB = this.EGG_GROUPS[idB] || []
      
      const shared = gA.filter(g => gB.includes(g) && g !== 'ditto')
      const LEGENDARIES = ['mewtwo', 'mew', 'articuno', 'zapdos', 'moltres']
      
      if (gA.includes('no-eggs') || gB.includes('no-eggs')) return { level: 0, reason: 'No cría' }
      
      const aDitto = idA === 'ditto', bDitto = idB === 'ditto'
      if (aDitto !== bDitto) {
        const other = aDitto ? pB : pA
        return { level: 2, eggSpecies: this.getBabyOrBase(other.id), reason: 'OK' }
      }

      if (!pA.gender || !pB.gender) return { level: 0, reason: 'Sin género' }
      if (LEGENDARIES.includes(idA) || LEGENDARIES.includes(idB)) return { level: 0, reason: 'Legendario' }
      if (pA.gender === pB.gender) return { level: 0, reason: 'Mismo género' }
      if (shared.length === 0) return { level: 0, reason: 'Incompatible' }

      const mother = pA.gender === 'F' ? pA : pB
      const level = (idA === idB) ? 3 : 2
      return { level, eggSpecies: this.getBabyOrBase(mother.id), reason: 'OK' }
    },

    calculateBreedingCost(pA, pB) {
      const isPerfect = (v) => v >= 30
      let perfectCount = 0
      if (pA?.ivs) Object.values(pA.ivs).forEach(v => { if (isPerfect(v)) perfectCount++ })
      if (pB?.ivs) Object.values(pB.ivs).forEach(v => { if (isPerfect(v)) perfectCount++ })
      
      if (perfectCount <= 2) return 2000
      if (perfectCount <= 5) return 5000
      if (perfectCount <= 8) return 12000
      if (perfectCount <= 11) return 25000
      return 50000
    },

    async depositPokemon(slotIdx, pokemonUid) {
      const gameStore = useGameStore()
      const userId = gameStore.user?.id
      if (!userId) return

      // Find pokemon in team or box
      let pIdx = gameStore.state.team.findIndex(p => p.uid === pokemonUid)
      let p = pIdx !== -1 ? gameStore.state.team[pIdx] : gameStore.state.box?.find(p => p.uid === pokemonUid)
      
      if (!p) return

      // Pre-check for last alive pokemon if in team
      if (pIdx !== -1) {
        const aliveCount = gameStore.state.team.filter(x => x.hp > 0).length
        if (aliveCount <= 1 && p.hp > 0) {
          const uiStore = useUIStore()
          uiStore.notify('No podés depositar a tu único Pokémon sano.', '⚠️')
          return
        }
      }

      try {
        // Delete any existing entry for this slot
        await supabase.from('daycare_slots').delete().eq('player_id', userId).eq('slot_index', slotIdx + 1)
        
        // Insert new entry
        const nowIso = new Date().toISOString()
        const { error } = await supabase.from('daycare_slots').insert({
          player_id: userId,
          pokemon_id: pokemonUid,
          slot_index: slotIdx + 1,
          deposited_at: nowIso
        })

        if (error) throw error

        // Update deposited_at for all slots to reset timer
        await supabase.from('daycare_slots').update({ deposited_at: nowIso }).eq('player_id', userId)

        // If in team, move to box and heal
        if (pIdx !== -1) {
          const removed = gameStore.state.team.splice(pIdx, 1)[0]
          removed.hp = removed.maxHp
          removed.status = null
          removed.moves?.forEach(m => { m.pp = m.maxPP })
          if (!gameStore.state.box) gameStore.state.box = []
          gameStore.state.box.push(removed)
        }

        const uiStore = useUIStore()
        uiStore.notify('Pokémon depositado.', '🏡')
        await gameStore.saveGame(true)
        await this.loadDaycareData()
      } catch (err) {
        console.error('Deposit error:', err)
        const uiStore = useUIStore()
        uiStore.notify('Error al depositar: ' + err.message, '❌')
      }
    },

    async withdrawPokemon(slotId) {
      const gameStore = useGameStore()
      const userId = gameStore.user?.id
      if (!userId) return
      
      const slotIdx = slotId === 'a' ? 1 : 2

      try {
        const { error } = await supabase.from('daycare_slots').delete().eq('player_id', userId).eq('slot_index', slotIdx)
        if (error) throw error

        const nowIso = new Date().toISOString()
        await supabase.from('daycare_slots').update({ deposited_at: nowIso }).eq('player_id', userId)
        
        const uiStore = useUIStore()
        uiStore.notify('Pokémon retirado.', '🏡')
        await gameStore.saveGame(true)
        await this.loadDaycareData()
      } catch (err) {
        console.error('Withdraw error:', err)
        const uiStore = useUIStore()
        uiStore.notify('Error al retirar: ' + err.message, '❌')
      }
    },

    async collectEgg(egg) {
      const gameStore = useGameStore()
      const userId = gameStore.user?.id
      if (!userId) return

      const cost = egg.inherited_ivs?._cost || 0
      if (gameStore.state.money < cost) {
        const uiStore = useUIStore()
        uiStore.notify(`No tienes suficiente dinero ($${cost.toLocaleString()}).`, '💰')
        return
      }

      // Logical call to stateBridge/legacy addEgg for now until fully migrated
      if (window.addEgg) {
        const extra = {
          origin: 'breeding',
          isShiny: egg.shiny_roll,
          inherited_ivs: egg.inherited_ivs
        }
        const newPoke = window.addEgg(egg.species, 'breeding', extra)
        if (newPoke) {
          // Remove egg, add to box, save
          const { error: delErr } = await supabase.from('eggs').delete().eq('egg_id', egg.egg_id)
          if (delErr) throw delErr

          gameStore.state.box.push(newPoke)
          
          // Modal Reveal
          const uiStore = useUIStore()
          uiStore.hatchedPokemon = newPoke
          uiStore.isHatchModalOpen = true

          uiStore.notify(`¡Se ha eclosionado el huevo de ${newPoke.name}!`, '🎉')
          await gameStore.saveGame(true)
          await this.loadDaycareData()
        }
      }
    },

    async updateEggIvs(eggId, newIvs) {
      try {
        const { error } = await supabase.from('eggs').update({ inherited_ivs: newIvs }).eq('egg_id', eggId)
        if (error) throw error
        await this.loadDaycareData()
      } catch (err) {
        console.error('Update egg error:', err)
      }
    },

    async deleteEgg(eggId) {
      try {
        const { error } = await supabase.from('eggs').delete().eq('egg_id', eggId)
        if (error) throw error
        await this.loadDaycareData()
      } catch (err) {
        console.error('Delete egg error:', err)
      }
    },

    async deliverMission(missionIdx, pokemonUid) {
      const gameStore = useGameStore()
      if (!gameStore.state.daycare_missions) return

      const m = gameStore.state.daycare_missions[missionIdx]
      if (!m) return

      // Find pokemon
      let pIdx = gameStore.state.team.findIndex(p => p.uid === pokemonUid)
      let p = pIdx !== -1 ? gameStore.state.team[pIdx] : gameStore.state.box?.find(p => p.uid === pokemonUid)
      if (!p) return

      if (!confirm(`¿Seguro que quieres entregar a ${p.name}? Se irá para siempre.`)) return

      // Remove pokemon
      if (pIdx !== -1) {
        if (gameStore.state.team.length <= 1) {
          const uiStore = useUIStore()
          uiStore.notify('No puedes entregar tu único Pokémon.', '❌')
          return
        }
        gameStore.state.team.splice(pIdx, 1)
      } else {
        const boxIdx = gameStore.state.box.findIndex(x => x.uid === pokemonUid)
        if (boxIdx !== -1) gameStore.state.box.splice(boxIdx, 1)
      }

      // Complete mission
      m.completed = true
      
      // Award prize
      const itemName = m.reward.name
      gameStore.state.inventory[itemName] = (gameStore.state.inventory[itemName] || 0) + m.reward.qty
      
      const uiStore = useUIStore()
      uiStore.notify(`¡Misión completada! Recibiste ${itemName} x${m.reward.qty}`, m.reward.icon)
      await gameStore.saveGame(true)
      if (window.updateHud) window.updateHud()
    }
  }
}
)
