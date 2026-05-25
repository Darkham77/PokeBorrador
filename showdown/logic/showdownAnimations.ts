import gsap from 'gsap';
import type { ParsedEvent } from '../sandbox_db/ShowdownParser.ts';

/**
 * Orquestador secuencial de animaciones para la cola de eventos de batalla
 */
export async function executeAnimationQueue(store: any, events: ParsedEvent[]): Promise<void> {
  for (const event of events) {
    store.battleLog.push(event);
    await animateEvent(store, event);
  }
}

/**
 * Ejecuta animaciones y desplazamientos físicos mediante GSAP.
 * Devuelve una Promesa para garantizar la secuencialidad perfecta.
 */
export function animateEvent(store: any, event: ParsedEvent): Promise<void> {
  return new Promise<void>((resolve) => {
    store.currentMessage = event.text;

    const tl = gsap.timeline({ onComplete: () => resolve() });
    const data = event.data;

    if (event.type === 'move' && data) {
      const spriteId = data.isPlayerAttacking ? '#player-sprite' : '#enemy-sprite';
      const direction = data.isPlayerAttacking ? 25 : -25;

      tl.to(spriteId, {
        x: `+=${direction}`,
        y: `-=${direction / 2}`,
        duration: 0.15,
        ease: 'power1.out',
      })
      .to(spriteId, {
        x: 0,
        y: 0,
        duration: 0.25,
        ease: 'power2.inOut',
      });
    } else if (event.type === 'damage' && data) {
      const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
      const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
      const currentHP = data.currentHP ?? 0;
      const maxHP = data.maxHP ?? 100;
      const hpPct = (currentHP / maxHP) * 100;

      tl.to(spriteId, {
        x: '+=6',
        filter: 'brightness(1.8) sepia(1) saturate(1000%) hue-rotate(-50deg)',
        duration: 0.05,
        yoyo: true,
        repeat: 5,
      })
      .to(spriteId, {
        x: 0,
        filter: 'none',
        duration: 0.05,
      })
      .to(hpBarId, {
        width: `${hpPct}%`,
        duration: 0.4,
        ease: 'power1.out',
        onStart: () => {
          if (data.isPlayer) {
            store.playerHP = currentHP;
            store.playerMaxHP = maxHP;
          } else {
            store.enemyHP = currentHP;
            store.enemyMaxHP = maxHP;
          }
        }
      }, '<');
    } else if (event.type === 'heal' && data) {
      const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';
      const hpBarId = data.isPlayer ? '#player-hp' : '#enemy-hp';
      const currentHP = data.currentHP ?? 0;
      const maxHP = data.maxHP ?? 100;
      const hpPct = (currentHP / maxHP) * 100;

      tl.to(spriteId, {
        filter: 'brightness(1.5) saturate(1000%) hue-rotate(90deg)',
        duration: 0.3,
        yoyo: true,
        repeat: 1,
      })
      .to(spriteId, {
        filter: 'none',
        duration: 0.1,
      })
      .to(hpBarId, {
        width: `${hpPct}%`,
        duration: 0.4,
        onStart: () => {
          if (data.isPlayer) {
            store.playerHP = currentHP;
            store.playerMaxHP = maxHP;
          } else {
            store.enemyHP = currentHP;
            store.enemyMaxHP = maxHP;
          }
        }
      }, '<');
    } else if (event.type === 'faint' && data) {
      const spriteId = data.isPlayer ? '#player-sprite' : '#enemy-sprite';

      tl.to(spriteId, {
        y: '+=80',
        opacity: 0,
        duration: 0.5,
        ease: 'power1.in',
        onStart: () => {
          const pokemonId = data.isPlayer ? store.playerPokemon?.id : store.enemyPokemon?.id;
          if (pokemonId) {
            store.playCry(pokemonId);
          }
        }
      });
    } else if (event.type === 'switch' && data) {
      const isPlayer = data.isPlayer;
      const spriteId = isPlayer ? '#player-sprite' : '#enemy-sprite';

      tl.to(spriteId, {
        x: isPlayer ? -150 : 150,
        y: 50,
        scale: 0.2,
        opacity: 0,
        duration: 0.4,
        ease: 'back.in(1.7)',
        onComplete: () => {
          const incomingSpeciesId = data.moveId || '';
          const team = isPlayer ? store.playerTeam : store.enemyTeam;
          const idx = team.findIndex((p: any) => p.id === incomingSpeciesId);

          if (idx !== -1) {
            const incomingPoke = team[idx];
            if (incomingPoke !== undefined) {
              if (isPlayer) {
                store.activePlayerIndex = idx;
                store.playerPokemon = incomingPoke;
                store.playerHP = data.currentHP ?? store.playerHP;
                store.playerMaxHP = data.maxHP ?? store.playerMaxHP;
              } else {
                store.activeEnemyIndex = idx;
                store.enemyPokemon = incomingPoke;
                store.enemyHP = data.currentHP ?? store.enemyHP;
                store.enemyMaxHP = data.maxHP ?? store.enemyMaxHP;
              }
            }
          }

          if (incomingSpeciesId) {
            store.playCry(incomingSpeciesId);
          }
        }
      })
      .set(spriteId, {
        x: isPlayer ? 150 : -150,
        y: -50,
        scale: 0.1,
        opacity: 0
      })
      .to(spriteId, {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.2)',
        clearProps: 'transform,opacity'
      });
    } else if (event.type === 'ability') {
      tl.to({}, { duration: 0.1 })
        .to({}, { duration: 1.0 });
    } else if (event.type === 'miss' || event.type === 'status' || event.type === 'weather' || event.type === 'info') {
      tl.to({}, { duration: 0.9 });
    } else {
      tl.to({}, { duration: 1.0 });
    }
  });
}
