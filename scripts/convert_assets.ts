/**
 * scripts/convert_assets.ts
 * 
 * ZERO-CONFIG ASSET PIPELINE (Node.js 26+)
 * 
 * Escanea _raw-assets, convierte a WebP y espeja la estructura en el proyecto.
 * Soporta modo Lossless para Pixel Art y Lossy para el resto.
 * Limpia la carpeta de destino antes de iniciar para evitar basura de archivos movidos.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

// Speed up execution
enableCompileCache();

const SOURCE_DIR = path.resolve(process.cwd(), '_raw-assets');
const PUBLIC_ASSETS_DIR = path.resolve(process.cwd(), 'public', 'assets');

interface BushCatalog {
  grass: string[];
  box: string[];
  rock: string[];
}
const bushCatalog: BushCatalog = { grass: [], box: [], rock: [] };

async function getFilesToConvert(dir: string): Promise<string[]> {
  const files: string[] = [];
  const pattern = '**/*.{png,jpg,jpeg,webp}';
  
  for await (const entry of fs.glob(pattern, { cwd: dir })) {
    files.push(path.resolve(dir, entry));
  }
  return files;
}

async function processFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return;

  try {
    const relPath = path.relative(SOURCE_DIR, filePath);
    const destPath = path.join(process.cwd(), relPath);
    const destDir = path.dirname(destPath);
    const destFile = path.join(destDir, `${path.parse(destPath).name}.webp`);

    await fs.mkdir(destDir, { recursive: true });

    // Determinamos si es Pixel Art para usar Lossless
    const isLossless = ['sprites', 'icons', 'badges', 'items', 'pixel'].some(p => 
      filePath.toLowerCase().includes(p)
    );

    const image = sharp(filePath);
    const metadata = await image.metadata();

    // Configuración de WebP
    const webpOptions: sharp.WebpOptions = { effort: 6 };
    if (isLossless) {
      webpOptions.lossless = true;
    } else {
      // Calidad adaptativa
      webpOptions.quality = (metadata.width! < 250 || metadata.height! < 250) ? 98 : 80;
    }

    await image.webp(webpOptions).toFile(destFile);
    console.log(styleText('green', `   [OK] ${path.relative(process.cwd(), destFile)} (${isLossless ? 'Lossless' : 'Lossy'})`));

    // Generar versión móvil optimizada para mapas
    if (filePath.toLowerCase().includes('maps/')) {
      const destMobileFile = path.join(destDir, `${path.parse(destPath).name}_mobile.webp`);
      await sharp(filePath)
        .resize({ width: 400, kernel: 'nearest' })
        .webp(webpOptions)
        .toFile(destMobileFile);
      console.log(styleText('green', `   [OK] ${path.relative(process.cwd(), destMobileFile)} (Mobile 400px Nearest)`));
    }

    // Detección y catalogación automatizada para la biblioteca de ex-arbustos
    if (destDir.includes('environment')) {
      const name = path.parse(destPath).name;
      const match = name.match(/^(grass|box|rock)-(\d+)$/);
      if (match) {
        const family = match[1] as keyof BushCatalog;
        if (!bushCatalog[family].includes(name)) {
          bushCatalog[family].push(name);
        }
      }
    }

  } catch (err: unknown) {
    console.error(styleText('red', `   [ERROR] No se pudo procesar ${filePath}: ${(err as Error).message}`));
  }
}

async function main() {
  console.log(styleText('bold', '\n--- 🖼️  ASSET PIPELINE ---'));
  
  try {
    await fs.access(SOURCE_DIR);
  } catch {
    console.error(styleText('red', `Error: Directorio fuente '${SOURCE_DIR}' no encontrado.`));
    process.exit(1);
  }

  // Limpieza determinista: borrar public/assets antes de reconstruir
  console.log(styleText('yellow', `   🧹 Limpiando ${path.relative(process.cwd(), PUBLIC_ASSETS_DIR)}...`));
  await fs.rm(PUBLIC_ASSETS_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_ASSETS_DIR, { recursive: true });

  const files = await getFilesToConvert(SOURCE_DIR);
  console.log(styleText('yellow', `   Encontrados ${files.length} archivos en _raw-assets.\n`));

  for (const file of files) {
    await processFile(file);
  }

  // Ordenar y autogenerar el catálogo de ex-arbustos en TypeScript
  console.log(styleText('yellow', `\n   📦 Generando catálogo de coberturas ambientales en src/logic/environment/bushCatalog.ts...`));
  for (const family of ['grass', 'box', 'rock'] as const) {
    bushCatalog[family].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  const catalogDir = path.resolve(process.cwd(), 'src', 'logic', 'environment');
  await fs.mkdir(catalogDir, { recursive: true });
  const catalogPath = path.join(catalogDir, 'bushCatalog.ts');

  const catalogContent = `/**
 * src/logic/environment/bushCatalog.ts
 * 
 * ARCHIVO AUTOGENERADO POR scripts/convert_assets.ts - NO EDITAR MANUALMENTE
 * 
 * Contiene el inventario descubierto de assets ambientales para coberturas de combate.
 */

export const BUSH_FAMILIES = ${JSON.stringify(bushCatalog, null, 2)} as const;

export type BushFamily = keyof typeof BUSH_FAMILIES;
`;

  await fs.writeFile(catalogPath, catalogContent, 'utf-8');
  console.log(styleText('green', `   [OK] Catálogo generado con éxito: ${bushCatalog.grass.length} pastos, ${bushCatalog.box.length} interiores, ${bushCatalog.rock.length} rocas.`));

  console.log(styleText('bold', '\n✨ Proceso de assets finalizado.\n'));
}

main();

