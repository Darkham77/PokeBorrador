/**
 * Battle Abilities logic.
 */

export function handleEntryAbilities(p1, p2, p1Stages, p2Stages, addLogFn) {
  if (!p1 || !p2) return;

  // Intimidación (Intimidate)
  if (p1.ability === 'Intimidación') {
    p2Stages.atk = Math.max(-6, (p2Stages.atk || 0) - 1);
    addLogFn(`¡La Intimidación de ${p1.name} bajó el ataque de ${p2.name}!`, 'log-info');
  }
  if (p2.ability === 'Intimidación') {
    p1Stages.atk = Math.max(-6, (p1Stages.atk || 0) - 1);
    addLogFn(`¡La Intimidación de ${p2.name} bajó el ataque de ${p1.name}!`, 'log-info');
  }

  // Trace (Rastro)
  if (p1.ability === 'Rastro' && p2.ability) {
    p1.ability = p2.ability;
    addLogFn(`¡${p1.name} copió la habilidad ${p2.ability} de ${p2.name} con Rastro!`, 'log-info');
  }
  if (p2.ability === 'Rastro' && p1.ability) {
    p2.ability = p1.ability;
    addLogFn(`¡${p2.name} copió la habilidad ${p1.ability} de ${p1.name} con Rastro!`, 'log-info');
  }
}

export function applyAbilityEffects(attacker, defender, move, damageResult, MOVE_DATA, addLogFn) {
  const ab = defender.ability;
  const md = MOVE_DATA[move.name] || {};

  // Robustez (Sturdy)
  if (ab === 'Robustez' && defender.hp <= 0 && damageResult.prevHp === defender.maxHp) {
    defender.hp = 1;
    addLogFn(`¡${defender.name} resistió el golpe gracias a su Robustez!`, 'log-info');
  }

  // Contact abilities (Physical moves)
  if (md.cat === 'physical' && Math.random() < 0.3) {
    if (ab === 'Electricidad estática' && !attacker.status && attacker.type !== 'electric') {
      attacker.status = 'paralyze';
      addLogFn(`¡La Electricidad estática de ${defender.name} paralizó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Punto tóxico' && !attacker.status && attacker.type !== 'poison' && attacker.type !== 'steel') {
      attacker.status = 'poison';
      addLogFn(`¡El Punto tóxico de ${defender.name} envenenó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Cuerpo Llama' && !attacker.status && attacker.type !== 'fire') {
      attacker.status = 'burn';
      addLogFn(`¡El Cuerpo Llama de ${defender.name} quemó a ${attacker.name}!`, 'log-info');
    }
    if (ab === 'Efecto Espora' && !attacker.status) {
      const roll = Math.random();
      if (roll < 0.33) {
        attacker.status = 'sleep'; attacker.sleepTurns = 1 + Math.floor(Math.random() * 3);
        addLogFn(`¡El Efecto Espora de ${defender.name} durmió a ${attacker.name}!`, 'log-info');
      } else if (roll < 0.66) {
        attacker.status = 'paralyze';
        addLogFn(`¡El Efecto Espora de ${defender.name} paralizó a ${attacker.name}!`, 'log-info');
      } else {
        attacker.status = 'poison';
        addLogFn(`¡El Efecto Espora de ${defender.name} envenenó a ${attacker.name}!`, 'log-info');
      }
    }
  }

  // Stench (Hedor)
  if (attacker.ability === 'Hedor' && Math.random() < 0.1) {
    if (!defender.flinched) {
      defender.flinched = true;
      addLogFn(`¡El Hedor de ${attacker.name} hizo retroceder a ${defender.name}!`, 'log-info');
    }
  }
}
