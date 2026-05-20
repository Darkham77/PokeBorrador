import postgres from 'postgres';

async function main() {
  const dbUrl = 'postgres://postgres.your-tenant-id:be8973e230dcef2311d675ca125acb55c4dc90e5@francogp.myqnapcloud.com:5432/postgres';
  console.log(`Connecting to: ${dbUrl.replace(/:[^:@]+@/, ':***@')}`);
  try {
    const sql = postgres(dbUrl, { connect_timeout: 5 });
    const res = await sql`SELECT 1 as ok`;
    console.log(`Connection successful!`, res);
    await sql.end();
  } catch (e: any) {
    console.error(`Connection failed: ${e.message}`);
  }
}

main().catch(console.error);
