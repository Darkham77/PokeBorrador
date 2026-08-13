// fallow-ignore-file security-sink
// scripts/import_backup_to_sqlite.ts
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { TABLES_SCHEMA } from '../../src/logic/db/schema.ts';
import { SHOP_ITEMS } from '../../src/data/inventory/items.ts';

console.log('\n--- 📥 IMPORTADOR DE RESPALDOS A SQLITE LOCAL ---');

// 1. Obtener argumentos de línea de comandos y normalizar según el .env
const args = process.argv.slice(2);
let serverNameInput = 'official_prod';

for (const arg of args) {
  if (arg.startsWith('--server=')) {
    serverNameInput = arg.split('=')[1] || 'official_prod';
  }
}

// Normalizar usando el .env si existe
let serverName = serverNameInput;
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const { readAndParseEnv } = await import('../lib/supabaseClient.ts');
  const serverConfigs = await readAndParseEnv();

  // Buscar coincidencia por nombre de perfil o por ID
  let conf = serverConfigs[serverNameInput];
  if (!conf) {
    const found = Object.keys(serverConfigs).find(p => serverConfigs[p]?.ID === serverNameInput);
    if (found) conf = serverConfigs[found];
  }

  if (conf) {
    serverName = conf.ID || serverNameInput;
  }
}

const backupDir = path.resolve('database/backups', serverName);
if (!fs.existsSync(backupDir)) {
  console.error(`❌ Error: El directorio de backups para "${serverName}" no existe en ${backupDir}`);
  process.exit(1);
}

// 2. Buscar el archivo de backup más reciente
const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error(`❌ Error: No se encontraron archivos de backup (.json) en ${backupDir}`);
  process.exit(1);
}

// Ordenar archivos (por convención de nombre con timestamp, el último elemento es el más reciente)
files.sort();
const latestBackupFile = files[files.length - 1]!;
const backupPath = path.join(backupDir, latestBackupFile);

console.log(`📂 Respaldo detectado: ${latestBackupFile}`);

let backupContent: string;
try {
  backupContent = fs.readFileSync(backupPath, 'utf8');
} catch (err) {
  console.error(`❌ Error al leer el archivo de backup: ${(err as Error).message}`);
  process.exit(1);
}

interface BackupProfile {
  id: string;
  username: string;
}

interface BackupData {
  data: {
    profiles?: BackupProfile[];
    [key: string]: unknown[] | undefined;
  };
}

let backupData: BackupData;
try {
  backupData = JSON.parse(backupContent) as BackupData;
} catch (err) {
  console.error(`❌ Error al parsear el archivo JSON: ${(err as Error).message}`);
  process.exit(1);
}

if (!backupData.data) {
  console.error('❌ Error: El backup no contiene una propiedad "data" válida.');
  process.exit(1);
}

// 3. Crear mapeo de IDs: UUID -> local_<username>
console.log('🔗 Generando diccionario de mapeo de IDs...');
const idMap = new Map<string, string>();
const profiles = (backupData.data.profiles || []) as BackupProfile[];

for (const profile of profiles as Array<{ id: string; username?: string; email?: string }>) {
  if (profile.id) {
    let cleanName = '';
    if (profile.username) {
      cleanName = profile.username.toLowerCase().replace(/\s+/g, '_');
    } else if (profile.email) {
      cleanName = profile.email.split('@')[0]!.toLowerCase().replace(/\s+/g, '_');
    } else {
      cleanName = profile.id.toLowerCase();
    }
    idMap.set(profile.id, `local_${cleanName}`);
  }
}
console.log(`✅ Diccionario listo. ${idMap.size} usuarios registrados.`);

// Función de reemplazo recursivo de IDs
function replaceUserIds(value: unknown, mapping: Map<string, string>): unknown {
  if (typeof value === 'string') {
    return mapping.get(value) || value;
  }
  if (Array.isArray(value)) {
    return value.map(item => replaceUserIds(item, mapping));
  }
  if (value !== null && typeof value === 'object') {
    const newObj: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
      newObj[key] = replaceUserIds((value as Record<string, unknown>)[key], mapping);
    }
    return newObj;
  }
  return value;
}

// Función de transformación de fila
function transformRow(
  row: Record<string, unknown>,
  tableName: string,
  mapping: Map<string, string>,
  validCols: Set<string>,
  hasIntPkId: boolean
): Record<string, unknown> {
  const newRow: Record<string, unknown> = {};
  
  // Clonar para evitar mutar el objeto del backup original
  const rowCopy = { ...row };

  // Pre-mapeos específicos de nombres de columna
  if (tableName === 'game_saves' && 'id' in rowCopy) {
    rowCopy['last_save_id'] = rowCopy['id'];
  }
  if (tableName === 'battle_invites' && 'challenger_id' in rowCopy) {
    rowCopy['sender_id'] = rowCopy['challenger_id'];
  }

  for (const col of Object.keys(rowCopy)) {
    // Filtrar columnas inexistentes en SQLite local
    if (!validCols.has(col)) {
      continue;
    }

    let val = rowCopy[col];

    // Omitir el campo 'id' si el SQLite local lo maneja como INTEGER PRIMARY KEY AUTOINCREMENT
    if (col === 'id' && hasIntPkId && typeof val === 'string') {
      continue;
    }

    // No alterar los correos electrónicos reales
    if (col === 'email' || col === 'winner_email' || col === 'player_email') {
      newRow[col] = val;
      continue;
    }

    // Transformar datos de guardado (JSON)
    if (tableName === 'game_saves' && col === 'save_data') {
      try {
        const parsed = (typeof val === 'string' ? JSON.parse(val) : val) as { inventory?: Record<string, number> } | null;
        
        // Migrate inventory keys to IDs if present
        if (parsed && parsed.inventory && typeof parsed.inventory === 'object') {
          // Resolve standard names using resolved normalized strings (matching test_migration_unit mapping)
          const resolveNormalizedName = (name: string): string => {
            const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
            const aliases: Record<string, string> = {
              'potion': 'Poción',
              'pocion': 'Poción',
              'pocian': 'Poción',
              'pociaon': 'Poción',
              'superpotion': 'Súper Poción',
              'superpocion': 'Súper Poción',
              'hyperpotion': 'Hiper Poción',
              'hiperpocion': 'Hiper Poción',
              'maxpotion': 'Poción Máxima',
              'pocionmaxima': 'Poción Máxima',
              'firestone': 'Piedra Fuego',
              'waterstone': 'Piedra Agua',
              'thunderstone': 'Piedra Trueno',
              'leafstone': 'Piedra Hoja',
              'moonstone': 'Piedra Lunar',
              'sunstone': 'Piedra Solar',
              'vigorcandy': 'Caramelo de vigor',
              'repel': 'Repelente',
              'iman': 'Imán',
              'elixir': 'Elixir',
              'subidapp': 'Subida de PP',
              'subidadepp': 'Subida de PP',
              'mttoxico': 'MT06 Tóxico',
              'ocasoball': 'Ocaso Ball',
              'turnoball': 'Turno Ball',
              'ultraball': 'Ultra Ball',
              'masterball': 'Master Ball',
              'superball': 'Súper Ball',
              'pokeball': 'Pokéball',
              'pokaball': 'Pokéball',
              'brazalrecio': 'Brazal Recio',
              'brazalrecia': 'Brazal Recio',
              'cintorecio': 'Cinto Recio',
              'cintorecia': 'Cinto Recio',
              'pesarecia': 'Pesa Recia',
              'bandarecia': 'Banda Recia',
              'lenterecia': 'Lente Recia',
              'franjarecia': 'Franja Recia',
              'bayadeoro': 'Baya de Oro',
              'bayaoro': 'Baya de Oro',
              'piedraeterna': 'Piedra Eterna',
              'lazodestino': 'Lazo Destino',
              'caramelovigor': 'Caramelo de vigor',
              'fishingrod': 'Caña de pescar',
              'fishingrodgood': 'Caña Buena',
              'fishingrodsuper': 'Supercaña',
              'pickaxe': 'Pico de excavación',
              'pickaxesilver': 'Pico Bueno',
              'pickaxegold': 'Superpico',
              'brush': 'Pincel de excavación',
              'brushgood': 'Pincel Buena',
              'brushsuper': 'Superpincel',
              'carbon': 'Carbón vegetal',
              'carbonvegetal': 'Carbón vegetal'
            };
            return aliases[norm] || name;
          };

          const itemMapping: Record<string, string> = {};
          for (const item of SHOP_ITEMS) {
            itemMapping[item.name] = item.id;
          }
          const validIds = new Set<string>(SHOP_ITEMS.map(i => i.id));
          validIds.add('bicycle');

          const newInv: Record<string, number> = {};
          const invObj = parsed.inventory as Record<string, number>;
          for (const [key, qty] of Object.entries(invObj)) {
            const resolvedName = resolveNormalizedName(key);
            let mappedId = itemMapping[resolvedName];
            if (!mappedId) {
              if (validIds.has(key)) {
                mappedId = key;
              } else {
                throw new Error(`Item no reconocido en save local: "${key}"`);
              }
            }
            newInv[mappedId] = qty as number;
          }
          parsed.inventory = newInv;
        }

        const transformed = replaceUserIds(parsed, mapping);
        val = JSON.stringify(transformed);
      } catch {
        val = replaceUserIds(val, mapping);
      }
    } else if (tableName === 'profiles' && col === 'db_version') {
      val = 3;
    } else if (tableName === 'market_listings' && col === 'data') {
      try {
        const parsed: unknown = typeof val === 'string' ? JSON.parse(val) : val;
        const transformed = replaceUserIds(parsed, mapping);
        val = JSON.stringify(transformed);
      } catch {
        val = replaceUserIds(val, mapping);
      }
    } else {
      val = replaceUserIds(val, mapping);
    }

    // Convertir booleanos a 0/1 para SQLite
    if (typeof val === 'boolean') {
      val = val ? 1 : 0;
    } else if (val !== null && typeof val === 'object') {
      val = JSON.stringify(val);
    }

    newRow[col] = val;
  }
  return newRow;
}

// 4. Inicializar Base de Datos SQLite temporal
const tempDir = path.resolve('database/temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const dbPath = path.join(tempDir, 'imported.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

console.log(`🔌 Creando base de datos SQLite temporal en: ${dbPath}`);
using db = new DatabaseSync(dbPath);

// 5. Crear esquemas de tablas
console.log('⚡ Inicializando esquemas de tablas...');
db.exec('PRAGMA foreign_keys = OFF;');
TABLES_SCHEMA.forEach(schema => {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS ${schema};`);
  } catch (e) {
    console.error(`⚠️ Error al crear tabla con esquema: ${schema.split(' ')[0]} - ${(e as Error).message}`);
  }
});

// Extraer metadatos de las columnas válidas de SQLite local
const tableColumns = new Map<string, Set<string>>();
const tableIntPk = new Map<string, boolean>();

TABLES_SCHEMA.forEach(schemaStr => {
  const parts = schemaStr.split('(');
  if (parts.length < 2) return;
  const tableName = parts[0]!.replace('CREATE TABLE IF NOT EXISTS', '').trim();
  
  const info = db.prepare(`PRAGMA table_info(${tableName});`).all() as Array<{ name: string; type: string; pk: number }>;
  if (info.length === 0) return;
  
  const colSet = new Set<string>();
  let hasIntPkId = false;
  
  for (const col of info) {
    const colName = col.name;
    const colType = col.type;
    const isPk = col.pk;
    
    colSet.add(colName);
    if (colName === 'id' && colType.toUpperCase() === 'INTEGER' && isPk === 1) {
      hasIntPkId = true;
    }
  }
  
  tableColumns.set(tableName, colSet);
  tableIntPk.set(tableName, hasIntPkId);
});

// 6. Inserción de Datos Transformados
console.log('⚙️ Insertando y transformando datos...');
for (const tableName of Object.keys(backupData.data)) {
  const rows = backupData.data[tableName];
  if (!rows || rows.length === 0) continue;

  const validCols = tableColumns.get(tableName);
  const hasIntPkId = tableIntPk.get(tableName) || false;

  if (!validCols) {
    console.log(`⚠️ Saltando tabla "${tableName}" (no definida en el esquema de la base de datos local)`);
    continue;
  }

  // Mapear y filtrar cada fila
  const transformedRows = rows
    .map((r: unknown) => transformRow(r as Record<string, unknown>, tableName, idMap, validCols, hasIntPkId))
    .filter((row: Record<string, unknown>) => Object.keys(row).length > 0);

  if (transformedRows.length === 0) continue;

  // Tomamos las columnas presentes en el primer registro transformado
  const columns = Object.keys(transformedRows[0]!);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders});`;
  
  try {
    const stmt = db.prepare(sql);
    db.exec('BEGIN TRANSACTION;');
    for (const row of transformedRows) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return null;
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'bigint') return val;
        if (val instanceof Uint8Array) return val;
        return String(val);
      }) as (string | number | bigint | Uint8Array | null)[];
      stmt.run(...values);
    }
    db.exec('COMMIT;');
    console.log(`✅ Tabla [${tableName}] importada con éxito: ${transformedRows.length} registros.`);
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // Ignorar si no había transacción activa
    }
    console.error(`❌ Error al importar la tabla [${tableName}]: ${(err as Error).message}`);
  }
}

db.exec('PRAGMA foreign_keys = ON;');
db.close();

console.log('\n==================================================');
console.log('🎉 PROCESO DE IMPORTACIÓN A SQLITE COMPLETADO CON ÉXITO');
console.log(`📂 Archivo listo para el navegador en: database/temp/imported.db`);
console.log('==================================================\n');
