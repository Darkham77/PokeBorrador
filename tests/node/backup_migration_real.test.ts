import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { GameState } from '../../src/types/game';

describe('Real Backup DB Migration Verification', () => {
  const legendaries = new Set([
    'articuno', 'zapdos', 'moltres', 'mewtwo', 'mew',
    'raikou', 'entei', 'suicune', 'lugia', 'ho_oh', 'ho-oh', 'celebi'
  ]);

  const legacyItemMap: Record<string, string> = {
    pocion: 'potion',
    super_pocion: 'super_potion',
    hiper_pocion: 'hyper_potion',
    pocion_max: 'max_potion',
    piedra_fuego: 'fire_stone',
    piedra_agua: 'water_stone',
    piedra_trueno: 'thunder_stone',
    piedra_hoja: 'leaf_stone',
    piedra_luna: 'moon_stone',
    piedra_solar: 'sun_stone',
    caramelo_vigor: 'vigor_candy',
    repelente: 'repel'
  };

  const legacyAbilityMap: Record<string, string> = {
    escape: 'Fuga',
    metamorfosis: 'Mudar',
    escudopolvo: 'Polvo escudo',
    polvoescudo: 'Polvo escudo',
    correcaminos: 'Fuga',
    obstruir: 'Insonorizar',
    escurridizo: 'Flexibilidad',
    puntocura: 'Cura Natural',
    chlorophyll: 'Clorofila',
    overgrow: 'Espesura',
    blaze: 'Mar llamas',
    torrent: 'Torrente',
    static: 'Electricidad estática',
    puntotoxico: 'Punto tóxico',
    vistalince: 'Vista lince',
    focointerno: 'Foco interno',
    nadorapido: 'Nado rápido',
    velohumedo: 'Velo húmedo'
  };

  const legacyMoveMap: Record<string, string> = {
    cuerpo_pesado: 'heavy_slam',
    hiper_colmillo: 'hyper_fang',
    patada_salto_alta: 'high_jump_kick',
    pajaro_osado: 'brave_bird',
    engullir: 'swallow',
    somnifera: 'sleep_powder',
    velocidad_extrema: 'extreme_speed',
    mismodestino: 'destiny_bond',
    pantalla_humo: 'smokescreen',
    super_colmillo: 'super_fang',
    huevo_bomba: 'egg_bomb',
    hueso_rus: 'bone_rush',
    mega_patada: 'mega_kick',
    mega_puno: 'mega_punch',
    pozo_venenoso: 'toxic_spikes',
    vampiro: 'horn_leech',
    psicocorte: 'psycho_cut',
    arena: 'sand_attack',
    minimizar: 'minimize',
    golpe_karatazo: 'karate_chop',
    mov_sismico: 'seismic_toss',
    tajo_aereo: 'air_slash',
    acidificacion: 'acid_armor',
    recurrente: 'bullet_seed',
    tormenta_de_arena: 'sandstorm'
  };

  function migratePoke(p: any) {
    if (!p) return;
    
    // 1. Legendaries to 0 vigor
    if (p.id && legendaries.has(p.id.toLowerCase())) {
      p.vigor = 0;
    }
    
    // 2. Mapped held items
    if (p.heldItem) {
      const itemKey = p.heldItem.toLowerCase().trim();
      if (legacyItemMap[itemKey]) {
        p.heldItem = legacyItemMap[itemKey];
      }
    }
    
    // 3. Mapped abilities
    if (p.ability) {
      // Regexp-based normalize matches the SQL version
      const abKey = p.ability.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
      if (legacyAbilityMap[abKey]) {
        p.ability = legacyAbilityMap[abKey];
      }
    }
    
    // 4. Mapped moves
    if (p.moves && Array.isArray(p.moves)) {
      p.moves.forEach((m: any) => {
        if (m && m.id) {
          const moveKey = m.id.toLowerCase().replace(/[\s_-]+/g, '_').trim();
          if (legacyMoveMap[moveKey]) {
            m.id = legacyMoveMap[moveKey];
          }
        }
      });
    }
  }

  const backups = [
    'database/backups/nas_franco/nas_franco_backup_2026-05-31T01-57-05-676918945Z.json',
    'database/backups/official-prod/official-prod_backup_2026-05-20T10-31-22-170657959Z.json'
  ];

  backups.forEach(backupRelPath => {
    const filename = path.basename(backupRelPath);
    
    it(`should successfully parse and migrate all game saves in ${filename} without breaking data`, () => {
      const backupPath = path.resolve(backupRelPath);
      assert.ok(fs.existsSync(backupPath), `Backup file ${filename} must exist`);

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const backupData = JSON.parse(backupContent);
      assert.ok(backupData.data, 'Backup must contain a data object');

      const gameSaves = backupData.data.game_saves || [];
      assert.ok(gameSaves.length > 0, 'Backup must contain game_saves');

      let legendariesFoundAndFixedCount = 0;
      let legacyHeldItemsFixedCount = 0;
      let legacyAbilitiesFixedCount = 0;
      let legacyMovesFixedCount = 0;

      gameSaves.forEach((saveWrapper: any) => {
        let saveData: GameState;
        if (typeof saveWrapper.save_data === 'string') {
          saveData = JSON.parse(saveWrapper.save_data);
        } else {
          saveData = saveWrapper.save_data;
        }

        const team = saveData.team || [];
        const box = saveData.box || [];

        // Track properties before migration to ensure they change
        const preCheck = (p: any) => {
          if (!p) return;
          if (p.id && legendaries.has(p.id.toLowerCase()) && p.vigor > 0) {
            legendariesFoundAndFixedCount++;
          }
          if (p.heldItem && legacyItemMap[p.heldItem.toLowerCase().trim()]) {
            legacyHeldItemsFixedCount++;
          }
          if (p.ability) {
            const abKey = p.ability.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            if (legacyAbilityMap[abKey]) {
              legacyAbilitiesFixedCount++;
            }
          }
          if (p.moves && Array.isArray(p.moves)) {
            p.moves.forEach((m: any) => {
              if (m && m.id) {
                const moveKey = m.id.toLowerCase().replace(/[\s_-]+/g, '_').trim();
                if (legacyMoveMap[moveKey]) {
                  legacyMovesFixedCount++;
                }
              }
            });
          }
        };

        team.forEach(preCheck);
        box.forEach(preCheck);

        // Run migration
        team.forEach(migratePoke);
        box.forEach(migratePoke);

        // Assertions post-migration
        const postCheck = (p: any) => {
          if (!p) return;
          // Legendaries must have 0 vigor
          if (p.id && legendaries.has(p.id.toLowerCase())) {
            assert.strictEqual(p.vigor, 0, `Legendary ${p.name} (${p.id}) must have 0 vigor after migration`);
          }
          // Held items must not be legacy
          if (p.heldItem) {
            const itemKey = p.heldItem.toLowerCase().trim();
            if (legacyItemMap[itemKey]) {
              assert.strictEqual(p.heldItem, legacyItemMap[itemKey], `Held item ${p.heldItem} was not migrated to ${legacyItemMap[itemKey]}`);
            }
          }
          // Abilities must not be legacy
          if (p.ability) {
            const abKey = p.ability.toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');
            if (legacyAbilityMap[abKey]) {
              assert.strictEqual(p.ability, legacyAbilityMap[abKey], `Ability ${p.ability} was not migrated to ${legacyAbilityMap[abKey]}`);
            }
          }
          // Moves must not be legacy
          if (p.moves && Array.isArray(p.moves)) {
            p.moves.forEach((m: any) => {
              if (m && m.id) {
                const moveKey = m.id.toLowerCase().replace(/[\s_-]+/g, '_').trim();
                if (legacyMoveMap[moveKey]) {
                  assert.strictEqual(m.id, legacyMoveMap[moveKey], `Move ${m.id} was not migrated to ${legacyMoveMap[moveKey]}`);
                }
              }
            });
          }
        };

        team.forEach(postCheck);
        box.forEach(postCheck);
      });

      console.log(`\n[Test: ${filename}] Migrated successfully:`);
      console.log(` - Legendaries fixed to 0 vigor: ${legendariesFoundAndFixedCount}`);
      console.log(` - Legacy held items mapped: ${legacyHeldItemsFixedCount}`);
      console.log(` - Legacy abilities translated: ${legacyAbilitiesFixedCount}`);
      console.log(` - Legacy moves converted: ${legacyMovesFixedCount}\n`);
    });
  });
});
