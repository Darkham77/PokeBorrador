/**
 * Configuración del Sistema de Guerra de Facciones (War Config)
 */

export const WAR_CONFIG = {
  // Costo de cambio de bando (Team Unión <-> Team Poder)
  FACTION_CHANGE_COST: 25000,

  // Límites Diarios
  DAILY_PT_CAP_PER_MAP: 300,
  DAILY_COIN_CAP: 50,

  // Tabla de Recompensas Semanales (Basado en contribución de PT)
  WEEKLY_REWARD_TIERS: [
    { minPt: 1501, coins: 150, label: 'Élite' },
    { minPt: 501,  coins: 75,  label: 'Veterano' },
    { minPt: 101,  coins: 35,  label: 'Soldado' },
    { minPt: 1,    coins: 10,  label: 'Participante' }
  ],

  // Bonus por victoria de la facción (si tu bando gana la semana)
  FACTION_WIN_BONUS_COINS: 50,

  // Tabla de Puntos por Evento
  PTS_TABLE: {
    capture:        { win: 5,   lose: 1 },
    trainer_win:    { win: 8,   lose: 2 },
    wild_win:       { win: 1,   lose: 0 },
    fishing:        { win: 4,   lose: 1 },
    shiny_capture:  { win: 40,  lose: 10 },
    event:          { win: 20,  lose: 5 },
    guardian:       { win: 150, lose: 10 }
  }
};
