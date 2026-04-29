# Organic Animation Standards

To guarantee a premium and "alive" visual experience, all cyclical animations must avoid perfect synchronization between multiple instances.

## 1. Phase Shift (Seed-based De-synchronization)

When rendering multiple instances of the same animated component (e.g., MapCards, Sparkle FX, floating Emojis), a random seed must be used to offset the start of the animation.

- **Implementation**: Pass a random value (`Math.random()`) as a CSS variable (e.g., `--card-seed`).
- **SCSS Rule**: Use a negative delay based on the total duration so that the animation starts at a random point in the cycle immediately.

```scss
.anim-target {
  animation: float 3s ease-in-out infinite;
  // Negative delay (seed * -duration) jumps to a random point in the cycle
  animation-delay: calc(var(--card-seed, 0) * -3s);
}
```

## 2. Speed Variation (Frequency)

De-synchronization is not enough; instances must have slightly different rhythms to break any perceptible rhythmic pattern.

- **Semantic Calculation**: The speed factor (`--card-speed`) must act as a divisor for the base duration.
- **Recommended Range**: Between `0.6x` (slow) and `1.6x` (fast).

```scss
.weather-layer {
  // Higher speed = Lower duration
  animation-duration: calc(1s / var(--card-speed, 1));
}
```

## 3. Multi-layer Weather Layers

For effects like rain or snow, use at least two layers with different scales, speeds, and offsets.

- **Layer 1 (Background)**: Slower, smaller, higher blur.
- **Layer 2 (Foreground)**: Faster, larger, sharper.
- **Lightning (Storm)**: Must use a `setInterval` with a random initial `setTimeout` so they don't strike at the same time on different routes.

## 4. Rarity & Sparkle FX

Aura effects (`.rare-glow`) and Shiny sparkles (`.shiny-sparkles`) must apply the negative delay to ensure each flash is asynchronous relative to others on the screen.

## 5. Tier S/S+ (High-IV) Pulsing

Pokémon with high stats (Tier S/S+) must use a rhythmic pulsing animation instead of rotation to maintain a premium feel.

- **Implementation**: Animate both `opacity` and `box-shadow` using the `--tier-color` variable.
- **Timing**: Use a slow, ease-in-out cycle (approx. 2s) to avoid visual fatigue.

```scss
@keyframes pulse-tier {
  0%, 100% { transform: Scale(1); opacity: 0.5; box-shadow: 0 0 5px var(--tier-color); }
  50% { transform: Scale(1.05); opacity: 0.8; box-shadow: 0 0 20px var(--tier-color); }
}
```
