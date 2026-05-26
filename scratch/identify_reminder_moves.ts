import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = './showdown/sandbox_db/data/showdown_db_es.json';
const REPORT_PATH = './scratch/reminder_moves_report.txt';

interface DBMove {
  id: string;
  name: string;
  desc?: string;
  shortDesc?: string;
}

interface ShowdownDB {
  moves: Record<string, DBMove>;
}

// Lists of moves that require battle tags / reminders
const VOLATILE_MOVE_IDS = new Set([
  'leechseed', 'confusion', 'taunt', 'encore', 'disable', 'torment', 
  'substitute', 'perishsong', 'attract', 'yawn', 'nightmare', 
  'destinybond', 'snatch', 'grudge', 'imprison', 'ingrain', 
  'focuspunch', 'charge', 'defensecurl', 'magnetrise', 'embargo', 
  'healblock', 'miracleeye', 'foresight', 'odorsleuth', 'autotomize'
]);

const BINDING_MOVE_IDS = new Set([
  'bind', 'wrap', 'firespin', 'sandtomb', 'whirlpool', 'clamp', 'infestation'
]);

const SIDE_CONDITION_MOVE_IDS = new Set([
  'reflect', 'lightscreen', 'safeguard', 'mist', 'spikes', 'toxicspikes', 
  'stealthrock', 'tailwind', 'auroraveil', 'stickyweb'
]);

const FIELD_EFFECT_MOVE_IDS = new Set([
  'trickroom', 'gravity', 'wonderroom', 'magicroom', 'watersport', 'mudsport',
  'electricterrain', 'grassyterrain', 'mistyterrain', 'psychicterrain'
]);

const DELAYED_MOVE_IDS = new Set([
  'wish', 'futuresight', 'doomdesire'
]);

function identifyMoves() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('Showdown DB not found at: ' + DB_PATH);
    return;
  }

  const db: ShowdownDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  const moves = Object.values(db.moves);

  const countdownMoves: Array<{ id: string; name: string; type: string; details: string }> = [];

  for (const move of moves) {
    const id = move.id.toLowerCase();
    const name = move.name;
    const desc = (move.desc || move.shortDesc || '').toLowerCase();

    if (VOLATILE_MOVE_IDS.has(id)) {
      let details = 'Aplica un estado volátil al objetivo o al usuario';
      if (id === 'leechseed') details = 'Planta semillas que drenan PS cada turno';
      if (id === 'perishsong') details = 'Canto Mortal: debilita a los combatientes en 3 turnos';
      if (id === 'substitute') details = 'Crea un sustituto con parte de los PS del usuario';
      if (id === 'taunt') details = 'Mofa: impide usar movimientos de estado';
      if (id === 'encore') details = 'Otra Vez: obliga a repetir el último movimiento';
      if (id === 'confusion') details = 'Confusión: puede causar autodaño durante algunos turnos';

      countdownMoves.push({ id, name, type: 'Estado Volátil', details });
    } else if (BINDING_MOVE_IDS.has(id)) {
      countdownMoves.push({ id, name, type: 'Atrapamiento Recurrente (Bind)', details: 'Atrapa al objetivo y causa daño residual durante 2-5 turnos' });
    } else if (SIDE_CONDITION_MOVE_IDS.has(id)) {
      let details = 'Crea una barrera o trampa en el bando objetivo';
      if (id === 'reflect') details = 'Reflejo: reduce daño físico durante 5 turnos';
      if (id === 'lightscreen') details = 'Pantalla de Luz: reduce daño especial durante 5 turnos';
      if (id === 'safeguard') details = 'Velo Sagrado: protege contra estados durante 5 turnos';
      if (id === 'mist') details = 'Neblina: protege de bajadas de características durante 5 turnos';
      if (id === 'spikes') details = 'Púas: causa daño al entrar a combatir (acumulable hasta 3 capas)';
      if (id === 'toxicspikes') details = 'Púas Tóxicas: envenena al entrar a combatir (acumulable hasta 2 capas)';
      if (id === 'stealthrock') details = 'Trampa Rocas: causa daño basado en efectividad de tipo al entrar';

      countdownMoves.push({ id, name, type: 'Condición de Bando', details });
    } else if (FIELD_EFFECT_MOVE_IDS.has(id)) {
      countdownMoves.push({ id, name, type: 'Efecto de Campo / Pseudo-Clima', details: 'Modifica las condiciones globales del campo de batalla por 5 turnos' });
    } else if (DELAYED_MOVE_IDS.has(id)) {
      countdownMoves.push({ id, name, type: 'Efecto Retardado', details: 'Se activa o causa daño de forma diferida tras un número fijo de turnos' });
    }
  }

  // Generate output report under scratch/
  const lines: string[] = [];
  lines.push('=== REPORTE DE MOVIMIENTOS CON RECORDATORIOS DE COMBATE (COUNTDOWNS/TAGS) ===');
  lines.push(`Fecha de generación: ${new Date().toISOString()}`);
  lines.push(`Total de movimientos identificados: ${countdownMoves.length}\n`);

  // Group by type
  const grouped = countdownMoves.reduce((acc, curr) => {
    acc[curr.type] = acc[curr.type] || [];
    acc[curr.type].push(curr);
    return acc;
  }, {} as Record<string, typeof countdownMoves>);

  for (const [group, items] of Object.entries(grouped)) {
    lines.push(`## ${group} (${items.length}):`);
    for (const item of items) {
      lines.push(`  - [${item.id}] ${item.name}: ${item.details}`);
    }
    lines.push('');
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log('Report saved successfully at: ' + REPORT_PATH);
}

identifyMoves();
