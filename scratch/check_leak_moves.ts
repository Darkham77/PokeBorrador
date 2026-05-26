import fs from 'node:fs';

const DB_PATH = './showdown/sandbox_db/data/showdown_db_es.json';

interface DBMove {
  id: string;
  name: string;
  desc?: string;
  shortDesc?: string;
}

interface ShowdownDB {
  moves: Record<string, DBMove>;
}

function checkLeaks() {
  const db: ShowdownDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const moves = Object.values(db.moves);
  
  const leakedMoves = moves.filter(m => 
    (m.desc && m.desc.includes('Este movimiento no se puede usar')) ||
    (m.shortDesc && m.shortDesc.includes('Este movimiento no se puede usar'))
  );
  
  console.log(`Encontrados ${leakedMoves.length} movimientos con la descripción corrupta:`);
  for (const m of leakedMoves) {
    console.log(`  - [${m.id}] ${m.name}`);
  }
}

checkLeaks();
