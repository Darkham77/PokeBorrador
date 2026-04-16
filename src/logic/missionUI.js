export function getMissionDescription(missionId, cls) {
  if (cls === 'cazabichos') {
    return 'Captura 3 Pokémon Bicho con IVs garantizados y mayor probabilidad de Shiny.';
  }
  if (cls === 'rocket') {
    const mults = { mission_6h: '1.0', mission_12h: '1.3', mission_24h: '1.8' };
    return `Vende Pokémon Veneno en el mercado negro con un multiplicador de ₽ x${mults[missionId] || '1'}.`;
  }
  if (cls === 'entrenador') {
    return `Entrena a un Pokémon para que gane mucha EXP${missionId === 'mission_24h' ? ' y un +1 NV (nivel) extra' : ''}.`;
  }
  if (cls === 'criador') {
    const blocks = { mission_6h: 1, mission_12h: 2, mission_24h: 4 };
    return `Aumenta ${blocks[missionId]} IVs aleatorios del Pokémon enviado a cambio de Vigor.`;
  }
  return 'Realiza tareas especiales para obtener recompensas de clase.';
}
