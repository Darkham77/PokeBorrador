/**
 * scripts/economy_simulator/types.ts
 * Definiciones de tipos para el motor de simulación de economía y meta balance.
 */

export type PlayerArchetype = 'casual' | 'regular' | 'hardcore';
export type PlayerClassId = 'cazabichos' | 'rocket' | 'criador' | 'entrenador';

export interface PlayerDailyHours {
  archetype: PlayerArchetype;
  hoursPerDay: number;
}

export const ARCHETYPE_HOURS: Record<PlayerArchetype, number> = {
  casual: 1.0,     // 1 hora de juego diario
  regular: 3.5,    // 3.5 horas de juego diario
  hardcore: 9.0    // 9 horas de juego diario (hardcore / farmer dedicado)
};

export interface MarketListing {
  id: string;
  sellerId: string;
  sellerClass: PlayerClassId;
  category: 'pokemon_grade_s' | 'pokemon_grade_a' | 'pokemon_shiny' | 'material' | 'tm_official' | 'crafted_ball';
  itemId: string;
  title: string;
  price: number;
  quantity: number;
  listedDay: number;
  expiresDay: number;
  sold: boolean;
}

export interface PlayerAgent {
  id: string;
  name: string;
  playerClass: PlayerClassId;
  archetype: PlayerArchetype;
  wallet: number;             // Dinero líquido en mano (₽)
  bankSavings: number;        // Ahorro seguro
  inventory: Record<string, number>;
  totalEarnedFromFaucets: number; // Dinero creado de la nada (NPCs, combates, ventas a tiendas)
  totalSpentOnSinks: number;      // Dinero destruido (curaciones, impuestos, guardería, dojo)
  marketBoughtAmount: number;     // Dinero pagado a otros jugadores en el mercado
  marketSoldAmount: number;       // Dinero recibido de otros jugadores en el mercado
  capturedCount: number;
  bredCount: number;
  gymsDefeatedCount: number;
  highIvStock: number;
}

export interface DailyEconomyMetrics {
  day: number;
  totalM0MoneySupply: number;    // Masa monetaria global en circulación (₽)
  dailyFaucetInjected: number;   // Total inyectado hoy por grifos
  dailySinkDestroyed: number;    // Total destruido hoy por sumideros
  dailyMarketVolume: number;     // Volumen transaccionado en el mercado entre jugadores
  dailyMarketTaxesDestroyed: number; // Impuestos destruidos (5% por venta)
  averageNetWorthByClass: Record<PlayerClassId, number>;
  averageNetWorthByArchetype: Record<PlayerArchetype, number>;
  activeListingsCount: number;
}
