# Manual de Mecánicas de Batalla (Poké Vicio)

Este manual documenta el funcionamiento interno del motor de combate, desde el cálculo de daño hasta las habilidades especiales.

## ⚔️ Cálculo de Daño (Gen 4+)

### 1. Fórmula de Daño Base
```text
Daño = floor(((2 * Nivel / 5 + 2) * Poder * A / D) / 50) + 2
```
- **A**: Ataque o At. Especial (reducido al 50% si el atacante está quemado y el movimiento es físico).
- **D**: Defensa o Def. Especial.

### 2. Multiplicadores Finales
`Daño Final = floor(Daño * STAB * Habilidad * Efectividad * Aleatorio * Crítico * Clima * Objeto)`
- **STAB**: 1.5x (o 2.0x con habilidad **Adaptable**).
- **Efectividad**: 0x, 0.25x, 0.5x, 1x, 2x, 4x.
- **Aleatorio**: Variación entre **0.85 y 1.0**.
- **Crítico**: 2.0x. Probabilidad base 6% (12% con **Lente Zoom**, 25% tras **Foco Energía**). Inmune contra **Caparazón** o **Armadura Batalla**.

---

## 🌪️ Influencia del Clima

- **Sol (Sun)**: 1.5x Daño Fuego, 0.5x Daño Agua.
- **Lluvia (Rain)**: 1.5x Daño Agua, 0.5x Daño Fuego.

---

## 🧪 Habilidades Críticas en Combate

### 1. Al Entrar en Batalla (Entry)
- **Intimidación**: Baja un nivel el Ataque del oponente.
- **Rastro (Trace)**: Copia la habilidad del oponente al entrar.

### 2. Defensivas y de Estado
- **Robustez (Sturdy)**: Permite sobrevivir con 1 HP ante un golpe letal si el usuario tenía el 100% de HP.
- **Cura Natural**: Sana problemas de estado al ser retirado del combate.
- **Sincronía**: Si el usuario recibe un estado, lo devuelve al atacante automáticamente.

### 3. De Contacto (30% de Probabilidad)
Se activan al recibir movimientos de categoría **Física**:
- **Electricidad Estática**: Paraliza.
- **Punto Tóxico**: Envenena.
- **Cuerpo Llama**: Quema.
- **Efecto Espora**: Duerme, paraliza o envenena aleatoriamente.

### 4. Ofensivas Especiales
- **Experto (Technician)**: 1.5x de potencia para movimientos con poder base <= 60.
- **Agallas (Guts)**: 1.5x Ataque Físico si el usuario tiene un problema de estado.
- **Sebo (Thick Fat)**: Reduce al 50% el daño recibido de tipo Fuego o Hielo.
- **Boosters de 1/3 HP (1.5x)**: Mar llamas, Torrente, Espesura, Enjambre.

---

## 🏃 Velocidad y Prioridad

- **Parálisis**: Reduce la velocidad real al 50%.
- **Clima y Habilidad (2x Speed)**:
    - **Clorofila**: Durante la Mañana/Día.
    - **Nado Rápido**: Durante la Tarde/Noche.
- **Fuga**: 2x Speed si el usuario tiene un problema de estado.
