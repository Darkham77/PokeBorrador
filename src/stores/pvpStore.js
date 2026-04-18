import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase } from '@/logic/supabase';
import { useGameStore } from './game';
import { useUIStore } from './ui';

export const usePvPStore = defineStore('pvp', () => {
  const gameStore = useGameStore();
  const uiStore = useUIStore();

  const activeBattle = ref(null);
  const channel = ref(null);
  const phase = ref('idle'); // idle, sync, choosing, results, over
  const invites = ref([]);

  // Battle State
  const myTeam = ref([]);
  const enemyTeam = ref([]);
  const myActiveIndex = ref(0);
  const enemyActiveIndex = ref(0);
  const myPick = ref(null);
  const enemyPick = ref(null);
  const logs = ref([]);

  /**
   * Inicia la conexión de tiempo real para una batalla.
   */
  async function connect(inviteId, isHost) {
    if (channel.value) {
      channel.value.unsubscribe();
    }

    const channelName = `pvp-${inviteId}`;
    channel.value = supabase.channel(channelName, {
      config: { broadcast: { self: false } }
    });

    channel.value
      .on('broadcast', { event: 'pvp_team' }, handleIncomingTeam)
      .on('broadcast', { event: 'pvp_pick' }, handleIncomingPick)
      .on('broadcast', { event: 'pvp_turn_result' }, handleTurnResult)
      .on('broadcast', { event: 'pvp_sync_request' }, handleSyncRequest)
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          phase.value = 'sync';
          sendTeam();
        }
      });
  }

  function sendTeam() {
    if (!channel.value) return;
    const team = gameStore.state.team.filter(p => p.hp > 0 && !p.onMission);
    channel.value.send({
      type: 'broadcast',
      event: 'pvp_team',
      payload: { team }
    });
  }

  function handleIncomingTeam({ payload }) {
    enemyTeam.value = payload.team;
    if (phase.value === 'sync') {
      phase.value = 'choosing';
      uiStore.notify('¡Batalla conectada! Elige tu movimiento.', '⚔️');
    }
  }

  function makePick(pick) {
    if (phase.value !== 'choosing') return;
    myPick.value = pick;
    
    if (channel.value) {
      channel.value.send({
        type: 'broadcast',
        event: 'pvp_pick',
        payload: { pick }
      });
    }

    // Si somos el host y ya tenemos el pick del enemigo, resolver turno
    if (activeBattle.value?.isHost && enemyPick.value) {
      resolveTurn();
    }
  }

  function handleIncomingPick({ payload }) {
    enemyPick.value = payload.pick;
    
    // Si somos el host y ya tenemos nuestro propio pick, resolver turno
    if (activeBattle.value?.isHost && myPick.value) {
      resolveTurn();
    }
  }

  /**
   * Solo el HOST resuelve el turno para garantizar consistencia.
   */
  async function resolveTurn() {
    if (!activeBattle.value?.isHost) return;

    // Aquí iría la lógica pesada de resolución de combate (velocidad, daño, etc.)
    // Por ahora simulamos un resultado para el bridge
    const result = {
      myPick: myPick.value,
      enemyPick: enemyPick.value,
      timestamp: Date.now()
      // ... más data de daño y estados
    };

    channel.value.send({
      type: 'broadcast',
      event: 'pvp_turn_result',
      payload: { result }
    });

    handleTurnResult({ payload: { result } });
  }

  function handleTurnResult({ payload }) {
    // Aplicar animaciones y cambios de HP
    phase.value = 'results';
    
    // Reset picks para el siguiente turno
    setTimeout(() => {
      myPick.value = null;
      enemyPick.value = null;
      phase.value = 'choosing';
    }, 3000);
  }

  function handleSyncRequest() {
    if (!channel.value) return;
    channel.value.send({
      type: 'broadcast',
      event: 'pvp_sync_data',
      payload: {
        phase: phase.value,
        myActive: myActiveIndex.value,
        enemyActive: enemyActiveIndex.value
      }
    });
  }

  function disconnect() {
    if (channel.value) {
      channel.value.unsubscribe();
      channel.value = null;
    }
    phase.value = 'idle';
    activeBattle.value = null;
  }

  return {
    activeBattle,
    phase,
    invites,
    myTeam,
    enemyTeam,
    myPick,
    enemyPick,
    logs,
    connect,
    makePick,
    disconnect
  };
});
