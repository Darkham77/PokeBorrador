
import initSqlJs from './node_modules/sql.js/dist/sql-wasm.js';
import fs from 'fs';

async function testJson() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  
  db.run("CREATE TABLE test (data TEXT)");
  db.run("INSERT INTO test VALUES ('{\"name\": \"Ash\", \"money\": 1000}')");
  
  console.log("Testing -> operator...");
  try {
    const res = db.exec("SELECT data->'name' as name FROM test");
    console.log("Result -> :", res[0].values[0][0]);
  } catch (e) {
    console.error("Error with -> :", e.message);
  }

  console.log("Testing ->> operator...");
  try {
    const res = db.exec("SELECT data->>'name' as name FROM test");
    console.log("Result ->> :", res[0].values[0][0]);
  } catch (e) {
    console.error("Error with ->> :", e.message);
  }

  db.close();
}

testJson();
