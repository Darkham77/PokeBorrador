import type { SQLiteDatabase } from '@/types/database/sqlite.ts';
import { TABLES_SCHEMA } from './schema.ts';
import { logger } from '../utils/logger.ts';

function upgradeTradeOffersPrimaryKey(db: SQLiteDatabase): void {
  try {
    const info = db.exec("PRAGMA table_info(trade_offers)");
    if (info.length === 0) return;

    const idCol = info[0]!.values.find((row: unknown[]) => (row[1] as string) === 'id');
    if (!idCol || (idCol[2] as string).toUpperCase() !== 'INTEGER') return;

    logger.info('SQLite', 'Upgrading trade_offers.id from INTEGER to TEXT...');
    db.run("PRAGMA foreign_keys = OFF");
    db.run(`
      CREATE TABLE trade_offers_new (
        id TEXT PRIMARY KEY,
        sender_id TEXT,
        receiver_id TEXT,
        offer_pokemon TEXT,
        offer_items TEXT,
        offer_money INTEGER DEFAULT 0,
        request_pokemon TEXT,
        request_items TEXT,
        request_money INTEGER DEFAULT 0,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
        updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
      )
    `);
    db.run(`
      INSERT INTO trade_offers_new (
        id, sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
        request_pokemon, request_items, request_money, message, status, created_at, updated_at
      )
      SELECT 
        CAST(id AS TEXT), sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
        request_pokemon, request_items, request_money, message, status, created_at, updated_at
      FROM trade_offers
    `);
    db.run("DROP TABLE trade_offers");
    db.run("ALTER TABLE trade_offers_new RENAME TO trade_offers");
    db.run("PRAGMA foreign_keys = ON");
    logger.success('SQLite', 'trade_offers table primary key successfully converted to TEXT.');
  } catch (e: unknown) {
    logger.error('SQLite', `Failed to migrate trade_offers PK: ${(e as Error).message}`);
  }
}

interface ColParserState {
  current: string;
  depth: number;
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
}

function handleQuoteStep(char: string, nextChar: string | undefined, state: ColParserState): number {
  if (state.inSingleQuote) {
    state.current += char;
    if (char === "'") {
      if (nextChar === "'") {
        state.current += "'";
        return 1;
      }
      state.inSingleQuote = false;
    }
    return 0;
  }
  if (state.inDoubleQuote) {
    state.current += char;
    if (char === '"') {
      state.inDoubleQuote = false;
    }
    return 0;
  }
  return -1;
}

function handleDelimiter(char: string, state: ColParserState, colDefs: string[]): void {
  if (char === ',' && state.depth === 0) {
    colDefs.push(state.current.trim());
    state.current = '';
    return;
  }
  if (char === "'") {
    state.inSingleQuote = true;
  } else if (char === '"') {
    state.inDoubleQuote = true;
  } else if (char === '(') {
    state.depth++;
  } else if (char === ')') {
    state.depth--;
  }
  state.current += char;
}

function parseColumnDefinitions(colPart: string): string[] {
  const colDefs: string[] = []; // no-domain: Non-domain utility collection or data structure
  const state: ColParserState = {
    current: '',
    depth: 0,
    inSingleQuote: false,
    inDoubleQuote: false
  };

  for (let i = 0; i < colPart.length; i++) {
    const char = colPart[i]!;
    const nextChar = i + 1 < colPart.length ? colPart[i + 1] : undefined;

    const quoteConsumed = handleQuoteStep(char, nextChar, state);
    if (quoteConsumed >= 0) {
      i += quoteConsumed;
      continue;
    }

    handleDelimiter(char, state, colDefs);
  }

  if (state.current.trim()) {
    colDefs.push(state.current.trim());
  }

  return colDefs;
}

function isIgnoredConstraint(def: string): boolean {
  const upperDef = def.toUpperCase(); // text-ok: UI text display localization string
  return upperDef.startsWith('PRIMARY KEY') || upperDef.startsWith('FOREIGN KEY') || upperDef.startsWith('UNIQUE');
}

function addMissingColumn(db: SQLiteDatabase, tableName: string, def: string, existingCols: string[]): void {
  if (isIgnoredConstraint(def)) return;

  const colName = def.split(/\s+/)[0]!.toLowerCase();
  if (existingCols.includes(colName)) return;

  logger.info('SQLite', `Auto-repair: Adding missing column "${colName}" to "${tableName}"`);
  try {
    const cleanDef = def.replace(/\s+PRIMARY\s+KEY/gi, '').replace(/\s+AUTOINCREMENT/gi, '');
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${cleanDef}`);
  } catch (e: unknown) {
    logger.warn('SQLite', `Auto-repair failed for ${tableName}.${colName}: ${(e as Error).message}`);
  }
}

function verifyTableSchema(db: SQLiteDatabase, schemaStr: string): void {
  const parts = schemaStr.split('(');
  if (parts.length < 2) return;

  const tableName = parts[0]!.replace('CREATE TABLE IF NOT EXISTS', '').trim();
  const info = db.exec(`PRAGMA table_info(${tableName})`);

  if (!info.length) {
    logger.warn('SQLite', `Table "${tableName}" missing from DB, creating...`);
    db.run(`CREATE TABLE IF NOT EXISTS ${schemaStr}`);
    return;
  }

  const existingCols = info[0]!.values.map((v: unknown[]) => (v[1] as string).toLowerCase());
  const colPart = schemaStr.substring(schemaStr.indexOf('(') + 1, schemaStr.lastIndexOf(')'));
  const colDefs = parseColumnDefinitions(colPart);

  for (const def of colDefs) {
    addMissingColumn(db, tableName, def, existingCols);
  }
}

function verifyAllTables(db: SQLiteDatabase): void {
  for (const schemaStr of TABLES_SCHEMA) {
    try {
      verifyTableSchema(db, schemaStr);
    } catch (e: unknown) {
      logger.error('SQLite', `Error during integrity check for: ${schemaStr} - ${(e as Error).message}`);
    }
  }
}

function migrateLegacyGlobalChat(db: SQLiteDatabase): void {
  try {
    const chatInfo = db.exec("PRAGMA table_info(global_chat_messages)");
    if (chatInfo.length > 0) {
      const cols = chatInfo[0]!.values.map((v: unknown[]) => (v[1] as string).toLowerCase());
      if (cols.includes('sender_id')) {
        db.run("UPDATE global_chat_messages SET user_id = sender_id WHERE user_id IS NULL AND sender_id IS NOT NULL");
      }
      if (cols.includes('sender_name')) {
        db.run("UPDATE global_chat_messages SET username = sender_name WHERE username IS NULL AND sender_name IS NOT NULL");
      }
    }
    // Align sender IDs for mock accounts to ensure correct profile loading
    db.run("UPDATE global_chat_messages SET user_id = 'local_ash' WHERE username = 'ash'");
    db.run("UPDATE global_chat_messages SET user_id = 'local_entrenador' WHERE username = 'Entrenador' OR username = 'entrenador'");

    logger.info('SQLite', 'Legacy global chat columns migrated and aligned successfully.');
  } catch (err: unknown) {
    throw new Error(`[sqliteSchemaIntegrity] Legacy chat columns migration error: ${(err as Error).message}`, { cause: err });
  }
}

function extractProfileFromSave(userId: string, saveData: Record<string, unknown>): {
  username: string;
  trainerLevel: number;
  playerClass: string;
  faction: string | null;
  avatarStyle: string;
  nickStyle: string;
  badges: number;
} {
  const fallbackName = userId.startsWith('local_') ? userId.replace('local_', '') : 'Entrenador';
  const capitalizedFallback = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
  return {
    username: (saveData.trainer as string) || capitalizedFallback,
    trainerLevel: (saveData.trainerLevel as number) || 1,
    playerClass: (saveData.playerClass as string) || 'entrenador',
    faction: (saveData.faction as string) || null,
    avatarStyle: (saveData.avatar_style as string) || '',
    nickStyle: (saveData.nick_style as string) || '',
    badges: (saveData.badges as number) || 0
  };
}

function parseSaveDataRecord(rawSave: string): Record<string, unknown> | null {
  try {
    return JSON.parse(rawSave) as Record<string, unknown>; // open-record: Generic key-value data dictionary container
  } catch (_e) { // catch-ok: Ignore unparseable saves during profile recovery scan
    return null;
  }
}

function repairProfileRow(db: SQLiteDatabase, userId: string, rawSave: string): void {
  if (!userId || !rawSave) return;

  const saveData = parseSaveDataRecord(rawSave);
  if (!saveData) return;

  const profRes = db.exec("SELECT id FROM profiles WHERE id = ?", [userId]);
  if (profRes.length === 0) {
    logger.info('SQLite', `Auto-repair: Creating missing profile for user ${userId} from save_data`);
    const p = extractProfileFromSave(userId, saveData);
    db.run(
      `INSERT INTO profiles (id, username, trainer_level, player_class, faction, avatar_style, nick_style, badges, db_version) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)`,
      [userId, p.username, p.trainerLevel, p.playerClass, p.faction, p.avatarStyle, p.nickStyle, p.badges]
    );
  } else {
    db.run("UPDATE profiles SET db_version = 3 WHERE id = ?", [userId]);
  }
}

function repairMissingProfiles(db: SQLiteDatabase): void {
  try {
    const savesRes = db.exec("SELECT user_id, save_data FROM game_saves");
    if (savesRes.length === 0) return;

    const rows = savesRes[0]!.values;
    for (const row of rows) {
      repairProfileRow(db, row[0] as string, row[1] as string);
    }
    logger.info('SQLite', 'Auto-repair for missing profiles complete.');
  } catch (err: unknown) {
    logger.warn('SQLite', `Auto-repair for profiles failed: ${(err as Error).message}`);
  }
}

export async function ensureSchemaIntegrity(db: SQLiteDatabase, persistFn?: () => Promise<void>): Promise<void> {
  logger.info('SQLite', 'Verifying schema integrity...');
  upgradeTradeOffersPrimaryKey(db);
  verifyAllTables(db);
  migrateLegacyGlobalChat(db);
  repairMissingProfiles(db);
  logger.success('SQLite', 'Schema integrity check complete.');

  if (persistFn) {
    await persistFn();
  }
}

