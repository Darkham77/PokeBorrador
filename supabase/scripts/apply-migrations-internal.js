/**
 * AUTOMATIC MIGRATION APPLIER
 * Runs inside a Node container, imports the TS/JS migrations and applies them to the DB.
 */
import { Client } from 'pg';
import { DATABASE_MIGRATIONS } from '../../src/logic/db/migrations_data.ts';

const client = new Client({
  host: 'db',
  port: 5432,
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: 'postgres',
});

async function run() {
  try {
    console.log('🔄 Conectando a la base de datos para aplicar migraciones...');
    await client.connect();
    
    for (const migration of DATABASE_MIGRATIONS) {
      console.log(`🚀 Aplicando migración: ${migration.id}`);
      await client.query(migration.sql);
    }
    
    console.log('✅ Todas las migraciones se han aplicado correctamente.');
  } catch (err) {
    console.error('❌ Error aplicando migraciones:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
