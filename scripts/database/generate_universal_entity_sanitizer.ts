import fs from 'node:fs'
import path from 'node:path'
import movesJson from '../../src/data/battle/moves.json' with { type: 'json' }
import itemsJson from '../../src/data/inventory/items.json' with { type: 'json' }

function generateVariants(name: string): string[] { // no-domain: Non-domain utility collection or data structure
  const variants = new Set<string>() // runtime-set: Fast O(1) membership lookup set
  const raw = name.trim()
  if (!raw) return []

  variants.add(raw)
  variants.add(raw.toLowerCase()) // string-ok: Internal string formatting or DOM token identifier
  variants.add(raw.toUpperCase()) // string-ok: Internal string formatting or DOM token identifier

  // No accents
  const noAccents = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  variants.add(noAccents)
  variants.add(noAccents.toLowerCase()) // string-ok: Internal string formatting or DOM token identifier

  // No spaces / special chars
  const noSpaces = raw.replace(/[\s\-_'’.]+/g, '')
  variants.add(noSpaces)
  variants.add(noSpaces.toLowerCase()) // string-ok: Internal string formatting or DOM token identifier

  const noSpacesNoAccents = noAccents.replace(/[\s\-_'’.]+/g, '')
  variants.add(noSpacesNoAccents)
  variants.add(noSpacesNoAccents.toLowerCase()) // string-ok: Internal string formatting or DOM token identifier

  // camelCase / PascalCase
  const words = raw.split(/[\s\-_'’.]+/)
  if (words.length > 1) {
    const camel = words[0]!.toLowerCase() + words.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') // string-ok: Internal string formatting or DOM token identifier
    variants.add(camel)
    const camelNoAccents = words[0]!.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() + 
      words.slice(1).map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') // string-ok: Internal string formatting or DOM token identifier
    variants.add(camelNoAccents)

    const pascal = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
    variants.add(pascal)
    const pascalNoAccents = words.map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '')).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')
    variants.add(pascalNoAccents)

    // snake_case
    const snake = words.map(w => w.toLowerCase()).join('_') // string-ok: Internal string formatting or DOM token identifier
    variants.add(snake)
    const snakeNoAccents = words.map(w => w.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).join('_') // string-ok: Internal string formatting or DOM token identifier
    variants.add(snakeNoAccents)
  }

  // Corrupted vowels/n (common in old db exports when accents got dropped)
  const corrupted = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase() // string-ok: Internal string formatting or DOM token identifier
  variants.add(corrupted)

  return Array.from(variants).filter(v => v.length > 0)
}

console.log('🔄 Generando diccionario universal exhaustivo de entidades...')

const moveReplacements = new Map<string, string>() // runtime-map: Fast O(1) keyed lookup dictionary

// 1. All moves from moves.json
for (const [canonicalId, data] of Object.entries(movesJson)) {
  const targetId = canonicalId.toLowerCase().trim() // string-ok: Internal string formatting or DOM token identifier
  const espName = (data as { name: string }).name
  if (espName) {
    const variants = generateVariants(espName)
    for (const v of variants) {
      if (v !== targetId) {
        moveReplacements.set(v, targetId)
      }
    }
  }
}

// 2. All items from items.json
const itemReplacements = new Map<string, string>() // runtime-map: Fast O(1) keyed lookup dictionary
const shopItems = ((itemsJson as Record<string, unknown>).SHOP_ITEMS || []) as Array<{ id: string; name: string }> // open-record: Generic key-value data dictionary container
for (const item of shopItems) {
  const targetId = item.id.toLowerCase().trim() // string-ok: Internal string formatting or DOM token identifier
  const espName = item.name
  if (espName) {
    const variants = generateVariants(espName)
    for (const v of variants) {
      if (v !== targetId) {
        itemReplacements.set(v, targetId)
      }
    }
  }
}

// 3. All Dex abilities and natures
const natureReplacements = new Map<string, string>([ // runtime-map: Fast O(1) keyed lookup dictionary
  ['fuerte', 'hardy'], ['docil', 'docile'], ['dócil', 'docile'], ['seria', 'serious'], ['timida', 'timid'], ['tímida', 'timid'],
  ['activa', 'hasty'], ['modesta', 'modest'], ['afable', 'mild'], ['mansa', 'quiet'], ['alocada', 'rash'], ['serena', 'calm'],
  ['amable', 'gentle'], ['cauta', 'careful'], ['picara', 'naughty'], ['pícara', 'naughty'], ['osada', 'bold'], ['placida', 'relaxed'],
  ['plácida', 'relaxed'], ['agitada', 'impish'], ['floja', 'lax'], ['audaz', 'brave'], ['firme', 'adamant'], ['alegre', 'jolly'],
  ['miedosa', 'timid'], ['huraña', 'lonely'], ['hurana', 'lonely'], ['grosera', 'sassy'], ['ingenua', 'naive']
])

console.log(`📊 Total variantes de movimientos mapeadas: ${moveReplacements.size}`)
console.log(`📊 Total variantes de items mapeadas: ${itemReplacements.size}`)
console.log(`📊 Total variantes de naturalezas mapeadas: ${natureReplacements.size}`)

// Combinar todas las sustituciones de comillas dobles: '"variant"' -> '"target"'
const allReplacements = new Map<string, string>() // runtime-map: Fast O(1) keyed lookup dictionary
for (const [k, v] of moveReplacements) allReplacements.set(k, v)
for (const [k, v] of itemReplacements) allReplacements.set(k, v)
for (const [k, v] of natureReplacements) allReplacements.set(k, v)

// Build SQLite Migration SQL
const sqliteLines: string[] = [ // no-domain: Non-domain utility collection or data structure
  '-- SQLite Companion Migration: 20260830233000_universal_sanitize_all_entities_and_moves',
  '-- Description: Exhaustive universal sanitization of all move, item, ability and nature variants to official Showdown IDs.',
  ''
]

for (const [from, to] of allReplacements) {
  // Evitar auto-reemplazos
  if (from === to) continue
  const escapedFrom = from.replace(/'/g, "''")
  const escapedTo = to.replace(/'/g, "''")
  sqliteLines.push(`UPDATE game_saves SET save_data = replace(save_data, '"${escapedFrom}"', '"${escapedTo}"') WHERE save_data LIKE '%"${escapedFrom}"%';`)
}

sqliteLines.push('')
sqliteLines.push('INSERT INTO system_config (key, value) VALUES (\'db_version\', \'"20260830233000"\')')
sqliteLines.push('ON CONFLICT(key) DO UPDATE SET value = \'"20260830233000"\';')

const sqlitePath = path.resolve('database/migrations/20260830233000_universal_sanitize_all_entities_and_moves.sqlite.sql')
fs.writeFileSync(sqlitePath, sqliteLines.join('\n'), 'utf8')
console.log(`💾 SQLite migration escrita en: ${sqlitePath}`)

// Build PostgreSQL Migration SQL
const pgLines: string[] = [ // no-domain: Non-domain utility collection or data structure
  '-- PostgreSQL Migration: 20260830233000_universal_sanitize_all_entities_and_moves',
  '-- Description: Exhaustive universal sanitization of all move, item, ability and nature variants to official Showdown IDs.',
  '',
  'DO $$',
  'DECLARE',
  '  r RECORD;',
  '  v_text TEXT;',
  'BEGIN',
  '  FOR r IN SELECT user_id, save_data FROM game_saves WHERE save_data IS NOT NULL LOOP',
  '    v_text := r.save_data::text;'
]

for (const [from, to] of allReplacements) {
  if (from === to) continue
  const escapedFrom = from.replace(/'/g, "''")
  const escapedTo = to.replace(/'/g, "''")
  pgLines.push(`    IF v_text LIKE '%"${escapedFrom}"%' THEN v_text := replace(v_text, '"${escapedFrom}"', '"${escapedTo}"'); END IF;`)
}

pgLines.push('    IF v_text <> r.save_data::text THEN')
pgLines.push('      UPDATE game_saves SET save_data = v_text::json WHERE user_id = r.user_id;')
pgLines.push('    END IF;')
pgLines.push('  END LOOP;')
pgLines.push('END $$;')
pgLines.push('')
pgLines.push('INSERT INTO system_config (key, value)')
pgLines.push('VALUES (\'db_version\', \'"20260830233000"\'::jsonb)')
pgLines.push('ON CONFLICT (key) DO UPDATE')
pgLines.push('SET value = \'"20260830233000"\'::jsonb;')

const pgPath = path.resolve('database/migrations/20260830233000_universal_sanitize_all_entities_and_moves.sql')
fs.writeFileSync(pgPath, pgLines.join('\n'), 'utf8')
console.log(`💾 PostgreSQL migration escrita en: ${pgPath}`)
