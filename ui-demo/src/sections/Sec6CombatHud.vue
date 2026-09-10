<script setup lang="ts">
// Sec6CombatHud.vue
</script>

<template>
  <section class="pv-section">
    <h2 class="section-title">
      <span class="emoji">⚔️</span>
      <span>6. HUD de Combate (Wingull Lv12, Pikachu Lv25 & Quick Team Bar)</span>
    </h2>

    <div class="grid-2">
      <!-- ENEMY (WINGULL) -->
      <div
        class="pv-panel-wrap has-cast-shadow"
        style="max-width: 380px;"
      >
        <div class="pv-frame-panel pv-panel-surface">
          <div class="combatant-header">
            <div class="combatant-title">
              <span>WINGULL</span> <span class="emoji gender-male">♂</span>
            </div>
            <div class="combatant-lvl">
              Lv 12
            </div>
          </div>

          <div class="pv-frame-control hp-box-wrap">
            <span class="hp-label">HP</span>
            <div class="hp-track">
              <div class="hp-fill hp-green" />
            </div>
          </div>
        </div>
      </div>

      <!-- PLAYER (PIKACHU) -->
      <div
        class="pv-panel-wrap has-cast-shadow"
        style="max-width: 380px;"
      >
        <div class="pv-frame-panel pv-panel-surface">
          <div class="combatant-header">
            <div class="combatant-title">
              <span>PIKACHU</span> <span class="emoji gender-male">♂</span>
            </div>
            <div class="combatant-lvl">
              Lv 25
            </div>
          </div>

          <div class="pv-frame-control hp-box-wrap">
            <span class="hp-label">HP</span>
            <div class="hp-track">
              <div class="hp-fill hp-yellow" />
            </div>
          </div>
          <div class="hp-numbers">
            48 / 85
          </div>

          <div class="exp-box-wrap">
            <span class="exp-label">EXP</span>
            <div class="exp-track">
              <div class="exp-fill" />
            </div>
          </div>

          <!-- 6-BALL QUICK TEAM STATUS -->
          <div class="team-ball-label">
            ESTADO DEL EQUIPO (6 POKÉ BALLS):
          </div>
          <div class="ball-bar">
            <div
              class="ball-dot"
              title="Pikachu (Sano)"
            />
            <div
              class="ball-dot"
              title="Charizard (Sano)"
            />
            <div
              class="ball-dot"
              title="Blastoise (Sano)"
            />
            <div
              class="ball-dot fainted"
              title="Venusaur (Debilitado)"
            />
            <div
              class="ball-dot"
              title="Gengar (Sano)"
            />
            <div
              class="ball-dot"
              title="Snorlax (Sano)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.pv-section {
  width: 100%;
}

.team-ball-label {
  font-size: 7px;
  color: var(--color-text-muted);
  margin-top: 10px;
  font-family: var(--font-pixel);
  line-height: 1.35;
}
</style>
