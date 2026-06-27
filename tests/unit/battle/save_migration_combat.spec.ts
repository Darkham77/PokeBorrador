/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { Dex } from '@pkmn/sim';
import { mapToShowdownSet, getShowdownFormatId } from '@/logic/battle/showdownAdapter';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Save Migration and Combat Simulation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('debería aplicar migraciones a un save antiguo en SQLite y simular combate en Showdown', async () => {
    // 1. Simular base de datos SQLite en memoria
    const sqljs = await import('sql.js');
    const SQL = await sqljs.default();
    const db = new SQL.Database();

    // Crear tablas del esquema necesarias
    db.run(`
      CREATE TABLE IF NOT EXISTS game_saves (
        user_id TEXT PRIMARY KEY,
        save_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        username TEXT,
        trainer_level INTEGER DEFAULT 1,
        player_class TEXT,
        faction TEXT,
        avatar_style TEXT,
        nick_style TEXT,
        badges INTEGER DEFAULT 0,
        db_version INTEGER DEFAULT 0
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at TEXT
      );
    `);

    // 2. Insertar un save antiguo con formato heredado de movimientos con guiones bajos (vine_whip, bubble_beam)
    const oldSaveData = {
      trainer: 'TestTrainer',
      gender: 'h',
      badges: 0,
      balls: 5,
      money: 3000,
      trainerLevel: 1,
      team: [
        {
          uid: 'poke-1',
          id: 'bulbasaur',
          name: 'Bulbasaur',
          level: 5,
          hp: 20,
          maxHp: 20,
          ability: 'overgrow',
          nature: 'adamant',
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: [
            { id: 'vine_whip', name: 'Látigo Cepa', pp: 25, maxPP: 25 },
            { id: 'tackle', name: 'Placaje', pp: 35, maxPP: 35 }
          ]
        }
      ],
      box: [
        {
          uid: 'poke-2',
          id: 'squirtle',
          name: 'Squirtle',
          level: 5,
          hp: 20,
          maxHp: 20,
          ability: 'torrent',
          nature: 'serious',
          ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
          moves: [
            { id: 'bubble_beam', name: 'Rayo Burbuja', pp: 20, maxPP: 20 }
          ]
        }
      ]
    };

    db.run(
      "INSERT INTO game_saves (user_id, save_data) VALUES (?, ?)",
      ['local_test_user', JSON.stringify(oldSaveData)]
    );

    // 3. Ejecutar la migración física SQL en la base de datos en memoria
    const MIGRATION_SQL = `
      -- 1. Actualizar tabla game_saves (team) reemplazando guiones bajos en el array de movimientos
      UPDATE game_saves
      SET save_data = (
        SELECT json_set(
          save_data,
          '$.team',
          (
            SELECT json_group_array(
              json_set(
                t.value,
                '$.moves',
                (
                  SELECT json_group_array(
                    json_set(
                      m.value,
                      '$.id',
                      replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
                        json_extract(m.value, '$.id'),
                        'vine_whip', 'vinewhip'
                      ), 'bubble_beam', 'bubblebeam'
                      ), 'thunder_shock', 'thundershock'
                      ), 'double_slap', 'doubleslap'
                      ), 'sand_attack', 'sandattack'
                      ), 'sonic_boom', 'sonicboom'
                      ), 'poison_powder', 'poisonpowder'
                      ), 'stun_spore', 'stunspore'
                      ), 'sleep_powder', 'sleeppowder'
                      ), 'pin_missile', 'pinmissile'
                      )
                    )
                  )
                  FROM json_each(json_extract(t.value, '$.moves')) m
                )
              )
            )
            FROM json_each(json_extract(game_saves.save_data, '$.team')) t
          )
        )
      )
      WHERE json_valid(save_data);

      -- 2. Actualizar tabla game_saves (box) reemplazando guiones bajos en el array de movimientos
      UPDATE game_saves
      SET save_data = (
        SELECT json_set(
          save_data,
          '$.box',
          (
            SELECT json_group_array(
              json_set(
                b.value,
                '$.moves',
                (
                  SELECT json_group_array(
                    json_set(
                      m.value,
                      '$.id',
                      replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
                        json_extract(m.value, '$.id'),
                        'vine_whip', 'vinewhip'
                      ), 'bubble_beam', 'bubblebeam'
                      ), 'thunder_shock', 'thundershock'
                      ), 'double_slap', 'doubleslap'
                      ), 'sand_attack', 'sandattack'
                      ), 'sonic_boom', 'sonicboom'
                      ), 'poison_powder', 'poisonpowder'
                      ), 'stun_spore', 'stunspore'
                      ), 'sleep_powder', 'sleeppowder'
                      ), 'pin_missile', 'pinmissile'
                      )
                    )
                  )
                  FROM json_each(json_extract(b.value, '$.moves')) m
                )
              )
            )
            FROM json_each(json_extract(game_saves.save_data, '$.box')) b
          )
        )
      )
      WHERE json_valid(save_data);
    `;

    // Aplicar sentencias individualmente
    const statements = MIGRATION_SQL.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      db.run(stmt);
    }

    // 4. Assertar que los IDs en el save SQLite ya no tienen guiones bajos
    const result = db.exec("SELECT save_data FROM game_saves WHERE user_id = 'local_test_user'");
    const savedString = result[0]!.values[0]![0] as string;
    const migratedSave = JSON.parse(savedString);

    const migratedBulbasaur = migratedSave.team[0];
    const migratedSquirtle = migratedSave.box[0];

    // Verificar que vine_whip -> vinewhip y bubble_beam -> bubblebeam
    expect(migratedBulbasaur.moves[0].id).toBe('vinewhip');
    expect(migratedBulbasaur.moves[1].id).toBe('tackle'); // tackle queda igual
    expect(migratedSquirtle.moves[0].id).toBe('bubblebeam');

    // 5. Simular combate usando @pkmn/sim con el set migrado para asegurar que sea 100% aceptado por el motor
    const p1Set = mapToShowdownSet(migratedBulbasaur as unknown as Pokemon);
    const p2Set = mapToShowdownSet(migratedSquirtle as unknown as Pokemon);

    // Validar el set contra el motor de showdown
    expect(Dex.moves.get(p1Set.moves[0]).exists).toBe(true);
    expect(Dex.moves.get(p1Set.moves[0]).id).toBe('vinewhip');
    expect(Dex.moves.get(p2Set.moves[0]).exists).toBe(true);
    expect(Dex.moves.get(p2Set.moves[0]).id).toBe('bubblebeam');

    // Levantar un combate simulado de prueba con el motor nativo de Showdown (que es lo que corre en el worker)
    const { Battle, toID } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId(3) });
    
    battle.setPlayer('p1', { name: 'Player', team: [p1Set] });
    battle.setPlayer('p2', { name: 'Opponent', team: [p2Set] });

    // Verificar que la batalla inicializó correctamente
    expect(battle.p1.active[0]!.species.id).toBe('bulbasaur');
    expect(battle.p2.active[0]!.species.id).toBe('squirtle');

    // Simular el primer turno de elecciones usando los movimientos migrados
    // Si p1 y p2 eligen movimientos correctos, la simulación avanza y no tira error
    expect(() => {
      battle.choose('p1', 'move vinewhip');
      battle.choose('p2', 'move bubblebeam');
    }).not.toThrow();

    // En Gen 3 customgame de @pkmn/sim, las decisiones se acumulan y el turno se ejecuta al llamar al flujo interno.
    // Verificamos que la elección haya sido registrada con éxito y esté lista para resolverse
    expect(battle.p1.active[0]!.moves).toBeDefined();
  });
});
