/**
 * scripts/economy_simulator/marketEngine.ts
 * Motor de Mercado entre Jugadores (Subasta, Oferta, Demanda e Impuesto del 5%).
 */

import type { MarketListing, PlayerAgent, PlayerClassId } from './types.ts';

export class SimulatedMarketEngine {
  private listings: MarketListing[] = [];
  private listingIdCounter = 1;
  public totalTaxesDestroyed = 0;
  public totalVolumeTraded = 0;

  // Precios Base y Pisos de Seguridad (Venta garantizada a NPC si nadie compra)
  public static NPC_FLOOR_PRICES: Record<string, number> = {
    pokemon_grade_s: 45000,    // Si ningún jugador compra, un coleccionista NPC paga el piso
    pokemon_grade_a: 8000,
    pokemon_shiny: 50000,
    tm_official: 15000,
    material: 150,
    crafted_ball: 800
  };

  // Precios dinámicos de mercado actuales (Fluctúan según oferta y demanda)
  public currentMarketPrices: Record<string, number> = {
    pokemon_grade_s: 160000,
    pokemon_grade_a: 14000,
    pokemon_shiny: 175000,
    tm_official: 38000,
    material: 450,
    crafted_ball: 3200
  };

  public postListing(
    seller: PlayerAgent,
    category: MarketListing['category'],
    itemId: string,
    title: string,
    quantity = 1
  ): MarketListing {
    // El precio de lista sigue la cotización actual con una ligera dispersión individual (±10%)
    const baseVal = this.currentMarketPrices[category] || 1000;
    const randomizedPrice = Math.round(baseVal * (0.90 + Math.random() * 0.20));

    const listing: MarketListing = {
      id: `list_${this.listingIdCounter++}`,
      sellerId: seller.id,
      sellerClass: seller.playerClass,
      category,
      itemId,
      title,
      price: randomizedPrice,
      quantity,
      listedDay: 0,
      expiresDay: 2, // Expira a los 2 días si nadie compra
      sold: false
    };

    this.listings.push(listing);
    return listing;
  }

  public getActiveListings(): MarketListing[] {
    return this.listings.filter(l => !l.sold);
  }

  public getActiveListingsCountByCategory(category: string): number {
    return this.listings.filter(l => !l.sold && l.category === category).length;
  }

  /**
   * Intenta encontrar una oferta y ejecutar la compra por parte de un comprador interesado.
   */
  public attemptPurchase(buyer: PlayerAgent, category: MarketListing['category'], allAgentsMap: Map<string, PlayerAgent>): boolean {
    const available = this.listings
      .filter(l => !l.sold && l.category === category && l.sellerId !== buyer.id && l.price <= buyer.wallet)
      .sort((a, b) => a.price - b.price); // El comprador elige la oferta más económica

    if (available.length === 0) return false;

    const chosen = available[0];
    if (!chosen) return false;

    const seller = allAgentsMap.get(chosen.sellerId);
    if (!seller) return false;

    const totalPrice = chosen.price;
    const marketTax = Math.round(totalPrice * 0.05); // 5% de impuesto del mercado (Sumidero de dinero)
    const netSellerProceeds = totalPrice - marketTax;

    // Ejecutar transferencia
    buyer.wallet -= totalPrice;
    buyer.marketBoughtAmount += totalPrice;

    seller.wallet += netSellerProceeds;
    seller.marketSoldAmount += netSellerProceeds;

    // Destrucción de dinero por impuesto
    this.totalTaxesDestroyed += marketTax;
    this.totalVolumeTraded += totalPrice;

    chosen.sold = true;
    return true;
  }

  /**
   * Ajuste diario de Oferta y Demanda:
   * - Si hay abundancia de stock sin vender (>10 ítems): el precio de mercado baja un 4%.
   * - Si hay escasez crítica (<3 ítems): el precio de mercado sube un 5%.
   * - Si expira (más de 2 días en lista): se vende al NPC por el precio piso garantizado.
   */
  public processDailyMarketCycles(currentDay: number, allAgentsMap: Map<string, PlayerAgent>): { liquidatedCount: number; liquidatedValue: number } {
    let liquidatedCount = 0;
    let liquidatedValue = 0;

    // 1. Elasticidad de Precios por Categoría
    const categories = ['pokemon_grade_s', 'pokemon_grade_a', 'pokemon_shiny', 'tm_official', 'material', 'crafted_ball'];
    for (const cat of categories) {
      const count = this.getActiveListingsCountByCategory(cat);
      const floor = SimulatedMarketEngine.NPC_FLOOR_PRICES[cat] || 100;

      if (count > 12) {
        // Exceso de oferta: deflación de precio en esa categoría
        this.currentMarketPrices[cat] = Math.max(floor, Math.round(this.currentMarketPrices[cat] * 0.96));
      } else if (count < 4) {
        // Escasez: inflación de precio en esa categoría
        this.currentMarketPrices[cat] = Math.round(this.currentMarketPrices[cat] * 1.05);
      }
    }

    // 2. Liquidación de subastas vencidas al piso de NPC
    for (const listing of this.listings) {
      if (!listing.sold && currentDay >= listing.expiresDay) {
        listing.sold = true;
        const seller = allAgentsMap.get(listing.sellerId);
        if (seller) {
          const floorPayout = SimulatedMarketEngine.NPC_FLOOR_PRICES[listing.category] || 500;
          seller.wallet += floorPayout;
          seller.totalEarnedFromFaucets += floorPayout;
          liquidatedCount++;
          liquidatedValue += floorPayout;
        }
      }
    }

    // Limpiar listings viejos ya procesados
    this.listings = this.listings.filter(l => !l.sold);

    return { liquidatedCount, liquidatedValue };
  }
}
