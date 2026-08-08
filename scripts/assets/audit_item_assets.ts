// fallow-ignore-file security-sink
/**
 * scripts/audit_item_assets.ts
 *
 * ITEM ASSET IMAGE AUDITOR (Node.js 26+)
 * Compares src/data/items.ts entries against physical webp images in the public folder.
 * Categorizes and audits both Poké Market (Local Shop) and Battle Club (BC Shop) items.
 *
 * Usage: node --experimental-strip-types scripts/audit_item_assets.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText, parseArgs } from 'node:util';
import { SHOP_ITEMS } from '../../src/data/inventory/items.ts';

const AUDIT_ITEM_MAPPING: Record<string, string> = {
  'pocion': 'potion',
  'super_pocion': 'super-potion',
  'hiper_pocion': 'hyper-potion',
  'pocion_max': 'max-potion',
  'revivir_max': 'max-revive',
  'quemadura': 'burn-heal',
  'despertar': 'awakening',
  'cura_total': 'full-heal',
  'elixir': 'ether',
  'elixirmax': 'max-elixir',
  'piedra_fuego': 'fire-stone',
  'piedra_agua': 'water-stone',
  'piedra_trueno': 'thunder-stone',
  'piedra_hoja': 'leaf-stone',
  'piedra_luna': 'moon-stone',
  'pokeball': 'poke-ball',
  'pokéball': 'poke-ball',
  'superball': 'great-ball',
  'greatball': 'great-ball',
  'super-ball': 'great-ball',
  'super ball': 'great-ball',
  'súper ball': 'great-ball',
  'ultraball': 'ultra-ball',
  'ultra-ball': 'ultra-ball',
  'ultra ball': 'ultra-ball',
  'masterball': 'master-ball',
  'master-ball': 'master-ball',
  'master ball': 'master-ball',
  'netball': 'net-ball',
  'net-ball': 'net-ball',
  'duskball': 'dusk-ball',
  'dusk-ball': 'dusk-ball',
  'turnoball': 'timer-ball',
  'timerball': 'timer-ball',
  'timer-ball': 'timer-ball',
  'turno ball': 'timer-ball',
  'repelente': 'repel',
  'super_repel': 'super-repel',
  'max_repel': 'max-repel',
  'huevo_suerte': 'lucky-egg',
  'huevo_suerte_pequeño': 'lucky-egg',
  'compartir_exp': 'exp-share',
  'restos': 'leftovers',
  'cascabel_concha': 'shell-bell',
  'cinta_elegida': 'choice-band',
  'banda_focus': 'focus-sash',
  'lente_zoom': 'scope-lens',
  'caramelo_raro': 'rare-candy',
  'subida_de_pp': 'pp-up',
  'moneda_amuleto': 'amulet-coin',
  'bola_luminosa': 'light-ball',
  'hueso_grueso': 'thick-club',
  'palo': 'stick',
  'polvo_metálico': 'metal-powder',
  'cuchara_torcida': 'twisted-spoon',
  'hechizo': 'spell-tag',
  'pesa_recia': 'power-weight',
  'brazal_recia': 'power-bracer',
  'cinto_recia': 'power-belt',
  'lente_recia': 'power-lens',
  'banda_recia': 'power-band',
  'franja_recia': 'power-anklet',
  'lazo_destino': 'destiny-knot',
  'piedra_eterna': 'everstone',
  'restaurador_vigor': 'rare-candy',
  'lemonade': 'lemonade',
  'refresco': 'soda-pop',
  'limonada': 'lemonade'
};

interface AuditResult {
  id: string;
  name: string;
  sprite: string;
  expectedPaths: string[];
  found: boolean;
  shops: string[];
}

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' }
    }
  });

  console.log(styleText('bold', '\n--- 🔎 ITEM IMAGE ASSETS AUDIT ---'));
  
  const publicDir = path.resolve(process.cwd(), 'public');
  const results: AuditResult[] = [];

  for (const item of SHOP_ITEMS) {
    if (!item.sprite) continue;
    
    const spriteId = item.sprite.replace(/\.(png|webp|jpg|jpeg|gif|bmp)$/i, '').toLowerCase();
    const mappedId = AUDIT_ITEM_MAPPING[spriteId] || spriteId.replace(/_/g, '-');
    
    const isPokeAPI = (AUDIT_ITEM_MAPPING[spriteId] !== undefined) || 
                     !isNaN(Number(spriteId)) || 
                     spriteId.includes('-') || 
                     spriteId.includes('ball') || 
                     spriteId.includes('stone') ||
                     spriteId.includes('repel') ||
                     spriteId.includes('fossil') ||
                     ['potion', 'revive', 'heal', 'ether', 'elixir', 'antidote', 'share', 'leftovers', 'bell', 'band', 'sash', 'lens', 'candy', 'up', 'egg', 'nugget', 'pearl', 'dust', 'piece', 'spoon', 'tag', 'powder', 'club', 'light', 'stick', 'ticket', 'radar', 'awakening'].some(k => mappedId.includes(k));

    const pathsToCheck: string[] = [];
    if (item.sprite) {
      pathsToCheck.push(path.join(publicDir, 'assets/sprites', `${item.sprite}.webp`));
      pathsToCheck.push(path.join(publicDir, 'assets/sprites', `${item.sprite}.png`));
    }
    if (isPokeAPI) {
      pathsToCheck.push(path.join(publicDir, 'assets/sprites/items', `${mappedId}.webp`));
    } else {
      pathsToCheck.push(path.join(publicDir, 'assets/items', `${spriteId}.webp`));
    }

    let found = false;
    for (const p of pathsToCheck) {
      try {
        await fs.access(p);
        found = true;
        break;
      } catch {
        // Continue
      }
    }

    // Classify shops
    const shops: string[] = [];
    if (item.showInNormalShop !== false) {
      shops.push('Poké Market (Local)');
    }
    if (item.showInBCShop === true) {
      shops.push('BC Shop (Battle Club)');
    }

    results.push({
      id: item.id,
      name: item.name || item.id,
      sprite: item.sprite,
      expectedPaths: pathsToCheck,
      found,
      shops
    });
  }

  // Group and print stats
  const localShopItems = results.filter(r => r.shops.includes('Poké Market (Local)'));
  const bcShopItems = results.filter(r => r.shops.includes('BC Shop (Battle Club)'));

  const localFound = localShopItems.filter(r => r.found).length;
  const localMissing = localShopItems.filter(r => !r.found);

  const bcFound = bcShopItems.filter(r => r.found).length;
  const bcMissing = bcShopItems.filter(r => !r.found);

  console.log(`\n🏬 ${styleText('bold', 'POKÉ MARKET (TIENDA LOCAL):')}`);
  console.log(`   📦 Total ítems con sprite: ${localShopItems.length}`);
  console.log(`   ✅ Con imagen física:      ${localFound}`);
  console.log(`   ❌ Con imagen FALTANTE:    ${localMissing.length}`);

  console.log(`\n🎖️  ${styleText('bold', 'BATTLE CLUB SHOP (BC SHOP):')}`);
  console.log(`   📦 Total ítems con sprite: ${bcShopItems.length}`);
  console.log(`   ✅ Con imagen física:      ${bcFound}`);
  console.log(`   ❌ Con imagen FALTANTE:    ${bcMissing.length}`);

  console.log('\n════════════════════════════════════════════════');

  const allMissing = results.filter(r => !r.found);

  if (allMissing.length > 0) {
    if (values.summary) {
      console.log(styleText('cyan', `\n[INFO] Modo resumen activo: ${allMissing.length} imágenes de ítems faltantes.`));
    } else {
      console.log(styleText('red', '\n⚠️ DETALLE DE IMÁGENES FALTANTES:'));
      const limit = 30;
      const toPrint = allMissing.slice(0, limit);
      toPrint.forEach(i => {
        console.log(`   - 🚫 ${styleText('bold', i.name)} (ID: ${i.id})`);
        console.log(`        Tiendas:       ${i.shops.join(' y ') || 'Ninguna (Solo Base)'}`);
        i.expectedPaths.forEach(p => {
          const relPath = path.relative(process.cwd(), p);
          console.log(`        Ruta esperada: ${styleText('underline', relPath)}`);
        });
      });
      if (allMissing.length > limit) {
        console.log(styleText('cyan', `\n[INFO] Se muestran solo las primeras ${limit} de un total de ${allMissing.length} imágenes faltantes para evitar saturar la terminal.`));
        console.log(styleText('cyan', `👉 Para guardar el reporte completo a un archivo: npm run audit -- --output=scratch/item_assets_report.txt (o añade flags directamente al script)`));
      }
    }
  } else {
    console.log(styleText('green', '\n🎉 ¡Excelente! Todas las imágenes de ítems de ambas tiendas están presentes físicamente en el sistema.'));
  }

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    const lines = [
      `--- ITEM IMAGE ASSETS AUDIT REPORT ---`,
      `Total Local Shop: ${localShopItems.length} (Missing: ${localMissing.length})`,
      `Total BC Shop: ${bcShopItems.length} (Missing: ${bcMissing.length})`,
      `\nDetailed Missing Items:`
    ];
    allMissing.forEach(i => {
      lines.push(`- [MISSING] ${i.name} (ID: ${i.id}) [Shops: ${i.shops.join(', ') || 'None'}]`);
      i.expectedPaths.forEach(p => lines.push(`  Expected: ${path.relative(process.cwd(), p)}`));
    });
    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }
}

main().catch(console.error);
