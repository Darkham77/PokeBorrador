import { persistSQLite, type SQLiteDatabase } from './sqliteEngine.ts';
import { TABLES_SCHEMA } from './schema.ts';
import { logger } from '../utils/logger.ts';

export async function ensureSchemaIntegrity(db: SQLiteDatabase): Promise<void> {
  logger.info('SQLite', 'Verifying schema integrity...');
  
  // Migración segura para la clave primaria de trade_offers (INTEGER -> TEXT/UUID)
  try {
    const info = db.exec("PRAGMA table_info(trade_offers)")
    if (info.length > 0) {
      const idCol = info[0]!.values.find((row: unknown[]) => (row[1] as string) === 'id')
      if (idCol && (idCol[2] as string).toUpperCase() === 'INTEGER') {
        logger.info('SQLite', 'Upgrading trade_offers.id from INTEGER to TEXT...');
        db.run("PRAGMA foreign_keys = OFF")
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
        `)
        db.run(`
          INSERT INTO trade_offers_new (
            id, sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
            request_pokemon, request_items, request_money, message, status, created_at, updated_at
          )
          SELECT 
            CAST(id AS TEXT), sender_id, receiver_id, offer_pokemon, offer_items, offer_money,
            request_pokemon, request_items, request_money, message, status, created_at, updated_at
          FROM trade_offers
        `)
        db.run("DROP TABLE trade_offers")
        db.run("ALTER TABLE trade_offers_new RENAME TO trade_offers")
        db.run("PRAGMA foreign_keys = ON")
        logger.success('SQLite', 'trade_offers table primary key successfully converted to TEXT.')
      }
    }
  } catch (e: unknown) {
    logger.error('SQLite', `Failed to migrate trade_offers PK: ${(e as Error).message}`)
  }
  
  for (const schemaStr of TABLES_SCHEMA) {
    try {
      const parts = schemaStr.split('(')
      if (parts.length < 2) continue
      const tableName = parts[0]!.replace('CREATE TABLE IF NOT EXISTS', '').trim()
      const info = db.exec(`PRAGMA table_info(${tableName})`)
      
      if (!info.length) {
        logger.warn('SQLite', `Table "${tableName}" missing from DB, creating...`)
        db.run(`CREATE TABLE IF NOT EXISTS ${schemaStr}`)
        continue
      }

      const existingCols = info[0]!.values.map((v: unknown[]) => (v[1] as string).toLowerCase())
      const colPart = schemaStr.substring(schemaStr.indexOf('(') + 1, schemaStr.lastIndexOf(')'))
      
      const colDefs: string[] = [] // no-domain: Non-domain utility collection or data structure
      let current = ''
      let depth = 0
      for (let i = 0; i < colPart.length; i++) {
        if (colPart[i] === '(') depth++
        else if (colPart[i] === ')') depth--
        
        if (colPart[i] === ',' && depth === 0) {
          colDefs.push(current.trim())
          current = ''
        } else {
          current += colPart[i]
        }
      }
      if (current.trim()) colDefs.push(current.trim())

      for (const def of colDefs) {
        const upperDef = def.toUpperCase() // text-ok: UI text display localization string
        if (upperDef.startsWith('PRIMARY KEY') || upperDef.startsWith('FOREIGN KEY') || upperDef.startsWith('UNIQUE')) {
          continue
        }

        const colName = def.split(/\s+/)[0]!.toLowerCase()
        if (!existingCols.includes(colName)) {
          logger.info('SQLite', `Auto-repair: Adding missing column "${colName}" to "${tableName}"`)
          try {
            const cleanDef = def.replace(/\s+PRIMARY\s+KEY/gi, '').replace(/\s+AUTOINCREMENT/gi, '')
            db.run(`ALTER TABLE ${tableName} ADD COLUMN ${cleanDef}`)
          } catch (e: unknown) {
            logger.warn('SQLite', `Auto-repair failed for ${tableName}.${colName}: ${(e as Error).message}`)
          }
        }
      }
    } catch (e: unknown) {
      logger.error('SQLite', `Error during integrity check for: ${schemaStr} - ${(e as Error).message}`)
    }
  }

  // Post-repair: Migrate legacy chat columns if they exist in the database
  try {
    const chatInfo = db.exec("PRAGMA table_info(global_chat_messages)")
    if (chatInfo.length > 0) {
      const cols = chatInfo[0]!.values.map((v: unknown[]) => (v[1] as string).toLowerCase())
      if (cols.includes('sender_id')) {
        db.run("UPDATE global_chat_messages SET user_id = sender_id WHERE user_id IS NULL AND sender_id IS NOT NULL")
      }
      if (cols.includes('sender_name')) {
        db.run("UPDATE global_chat_messages SET username = sender_name WHERE username IS NULL AND sender_name IS NOT NULL")
      }
    }
    // Align sender IDs for mock accounts to ensure correct profile loading
    db.run("UPDATE global_chat_messages SET user_id = 'local_ash' WHERE username = 'ash'")
    db.run("UPDATE global_chat_messages SET user_id = 'local_entrenador' WHERE username = 'Entrenador' OR username = 'entrenador'")
    
    logger.info('SQLite', 'Legacy global chat columns migrated and aligned successfully.');
  } catch (err: unknown) {
    throw new Error(`[sqliteSchemaIntegrity] Legacy chat columns migration error: ${(err as Error).message}`)
  }

  // Auto-repair: Populate missing profiles from game_saves to restore cosmetics and profile visibility
  try {
    const savesRes = db.exec("SELECT user_id, save_data FROM game_saves")
    if (savesRes.length > 0) {
      const rows = savesRes[0]!.values
      for (const row of rows) {
        const userId = row[0] as string
        const rawSave = row[1] as string
        if (!userId || !rawSave) continue
        
        let saveData: Record<string, unknown> = {}
        try {
          if (typeof rawSave === 'string') {
            saveData = JSON.parse(rawSave) as Record<string, unknown> // open-record: Generic key-value data dictionary container
          }
        } catch (_) {
          continue
        }
        
        // Check if profile exists
        const profRes = db.exec("SELECT id FROM profiles WHERE id = ?", [userId])
        if (profRes.length === 0) {
          logger.info('SQLite', `Auto-repair: Creating missing profile for user ${userId} from save_data`)
          const fallbackName = userId.startsWith('local_') ? userId.replace('local_', '') : 'Entrenador'
          const capitalizedFallback = fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1)
          const username = (saveData.trainer as string) || capitalizedFallback
          const trainerLevel = (saveData.trainerLevel as number) || 1
          const playerClass = (saveData.playerClass as string) || 'entrenador'
          const faction = (saveData.faction as string) || null
          const avatarStyle = (saveData.avatar_style as string) || ''
          const nickStyle = (saveData.nick_style as string) || ''
          
          const badges = (saveData.badges as number) || 0
          db.run(
            `INSERT INTO profiles (id, username, trainer_level, player_class, faction, avatar_style, nick_style, badges, db_version) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3)`,
            [userId, username, trainerLevel, playerClass, faction, avatarStyle, nickStyle, badges]
          )
        } else {
          // Force set version 3 for profiles during repair check
          db.run("UPDATE profiles SET db_version = 3 WHERE id = ?", [userId])
        }
      }
    }
    logger.info('SQLite', 'Auto-repair for missing profiles complete.')
  } catch (err: unknown) {
    logger.warn('SQLite', `Auto-repair for profiles failed: ${(err as Error).message}`)
  }

  logger.success('SQLite', 'Schema integrity check complete.')
  await persistSQLite()
}
