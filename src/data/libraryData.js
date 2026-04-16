/**
 * Library Data Module
 * Ported from legacy 22_library.js
 */

export const libraryContent = {
  gimnasios: `
    <h1>Gimnasios de Kanto</h1>
    <p>Los 8 Gimnasios son la columna vertebral de tu progresión. Cada victoria te otorga una medalla, una MT exclusiva y desbloquea el acceso a nuevas rutas. Hay 3 niveles de dificultad: Fácil, Normal y Difícil. Podes realizar rematches ilimitados.</p>

    <h3>Recompensas por Rematch</h3>
    <ul>
      <li>Dificultad Fácil: 105 Battle Coins.</li>
      <li>Dificultad Normal: 210 Battle Coins + 3% de probabilidad de recibir la MT otra vez.</li>
      <li>Dificultad Difícil: 315 Battle Coins + 5% de probabilidad de recibir la MT otra vez.</li>
      <li>Los Entrenadores (clase) reciben un +30% de Battle Coins adicionales en todas las victorias de Gimnasio.</li>
    </ul>

    <h3>Notas de Combate</h3>
    <ul>
      <li>Cada nivel de dificultad aumenta el nivel de los Pokémon del Líder y mejora su IA.</li>
      <li>El nivel Difícil cuenta con Pokémon entre nivel 62 y 90. ¡Prepárate bien!</li>
    </ul>
  `,

  captura: `
    <h1>Sistema de Captura</h1>
    <p>Poké Vicio utiliza una fórmula basada en la Gen 1 para calcular el éxito de captura. Factores como los PS restantes del Pokémon salvaje y el tipo de Pokeball son fundamentales.</p>

    <h3>Probabilidades</h3>
    <ul>
      <li>PS del Objetivo: Cuanto menos vida tenga el Pokémon rival, más fácil será capturarlo.</li>
      <li>Estados Alterados: Dormir o Congelar al oponente aumenta significativamente el ratio de captura.</li>
      <li>Rachas (Cazabichos): Capturar especies iguales de forma consecutiva mejora tus chances generales.</li>
    </ul>

    <h3>Tipos de Pokéball</h3>
    <table class="library-table">
      <thead><tr><th>Ball</th><th>Eficacia</th><th>Efecto Especial</th></tr></thead>
      <tbody>
        <tr><td>Poké Ball</td><td>1x</td><td>Uso estándar.</td></tr>
        <tr><td>Súper Ball</td><td>1.5x</td><td>Mejor rendimiento que la estándar.</td></tr>
        <tr><td>Ultra Ball</td><td>2x</td><td>Gran probabilidad de captura.</td></tr>
        <tr><td>Safari Ball</td><td>1.5x</td><td>Exclusiva de la Zona Safari.</td></tr>
        <tr><td>Master Ball</td><td>infinito</td><td>Captura garantizada (100%).</td></tr>
      </tbody>
    </table>
  `,

  clases: `
    <h1>Clases de Jugador</h1>
    <p>Al alcanzar el Nivel 5, podés elegir una especialización que cambiará drásticamente tu forma de jugar. Podés cambiar de clase por 10,000 BC.</p>

    <div class="class-info-box">
      <h3>Equipo Rocket</h3>
      <ul>
        <li>Mercado Negro: Vendé cualquier Pokémon de tu caja directamente por pesos.</li>
        <li>Robo Rápido: Chance de robar un objeto al azar al inicio de batallas NPC.</li>
        <li>Robo al Oficial: 5% de chance de robarle un Pokémon al Oficial de Policía tras vencerlo.</li>
        <li>Penalización: Los Centros Pokémon cuestan 2x.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>Entrenador</h3>
      <ul>
        <li>Gana un +10% de EXP en todos los combates.</li>
        <li>Gana un +30% de BC en gimnasios.</li>
        <li>Desbloquea la tienda de reputación venciendo gimnasios.</li>
        <li>Ruta Oficial: Marcá una ruta diaria para ganar reputación extra.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>Cazabichos</h3>
      <ul>
        <li>Cada captura consecutiva aumenta el Shiny Rate (hasta x4).</li>
        <li>Red Maestra: 20% de chance de capturar un segundo ejemplar de tipo Bicho.</li>
        <li>Aroma Atractivo: Chance de forzar la aparición de Scyther o Pinsir.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>Criador</h3>
      <ul>
        <li>Los hijos heredan 4 IVs de los padres.</li>
        <li>Los pasos para eclosionar se reducen un 25%.</li>
        <li>Escáner: Permite gestionar genética detallada.</li>
      </ul>
    </div>
  `,

  crianza: `
    <h1>Sistema de Crianza</h1>
    <p>La crianza te permite crear Pokémon con estadísticas perfectas. Se realiza en la Guardería.</p>

    <h3>Herencia Genética</h3>
    <ul>
      <li>IVs: Se heredan 3 IVs de los padres (4 para Criadores).</li>
      <li>Naturaleza: La Piedra Eterna garantiza la herencia de la naturaleza.</li>
    </ul>

    <h3>Eclosión</h3>
    <p>Para que un Huevo nazca, debes llevarlo en tu equipo y explorar el mapa.</p>
  `,

  misiones: `
    <h1>Misiones Diarias</h1>
    <p>Los NPCs de la Guardería te asignarán misiones diariamente.</p>
    <ul>
      <li>Se reinician cada 24 horas.</li>
      <li>Misiones de captura, derrota o entrega de objetos.</li>
    </ul>
  `,

  encuentros: `
    <h1>Encuentros y Ciclos</h1>
    <p>El mundo de Poké Vicio es dinámico. Las especies cambian según el Ciclo Horario.</p>

    <h3>Ciclo de 4 Horas</h3>
    <ul>
      <li>Amanecer (04:00 - 08:00)</li>
      <li>Día (08:00 - 16:00)</li>
      <li>Atardecer (16:00 - 20:00)</li>
      <li>Noche (20:00 - 04:00)</li>
    </ul>
    
    <h3>Pesca</h3>
    <p>Si tenés una caña, podés pescar en el agua mediante un minijuego de ritmo.</p>
  `,

  shinys: `
    <h1>Pokémon Shiny</h1>
    <p>Son versiones raras con colores alternativos.</p>

    <h3>Probabilidades</h3>
    <ul>
      <li>Tasa Base: 1 en 3,000 encuentros.</li>
      <li>Bono de Fin de Semana/Dominancia: +30% probabilidad.</li>
      <li>Racha (Cazabichos): Puede aumentar hasta un x4.0.</li>
    </ul>
  `,

  combate: `
    <h1>Sistema de Combate</h1>
    <p>Las batallas usan la lógica de la 3ra Generación con balanceos modernos.</p>
    <ul>
      <li>STAB: Movimientos del mismo tipo pegan 50% más fuerte.</li>
      <li>Críticos: Basados en Velocidad base y ratio del movimiento.</li>
    </ul>
  `,

  guerra: `
    <h1>Guerra de Facciones</h1>
    <p>El juego se divide en bando Unión y Poder.</p>

    <h3>Territorio Dominado</h3>
    <ul>
      <li>Capturas y victorias suman puntos para tu bando.</li>
      <li>Beneficios: +30% Experiencia, +30% Shiny, +30% Mejores IVs.</li>
    </ul>

    <h3>Guardianes de Ruta</h3>
    <p>Pokémon Alfa que otorgan grandes recompensas al ser derrotados.</p>
  `,

  pokedex: `
    <h1>Pokédex Nacional</h1>
    <p>Consulta estadísticas base, compatibilidad de MTs y cadenas evolutivas.</p>
  `,

  eventos: `
    <h1>Sistema de Eventos</h1>
    <p>Concursos de captura automáticos y eventos que ignoran el ciclo horario.</p>
  `,

  interfaz: `
    <h1>Interfaz y Tooltips</h1>
    <p>Mantener presionado un movimiento para ver detalles técnicos en móvil.</p>
  `
}

export const libraryCategories = [
  { id: 'gimnasios', label: '🏆 Gimnasios' },
  { id: 'captura', label: '🔴 Captura' },
  { id: 'clases', label: '🎭 Clases' },
  { id: 'crianza', label: '🥚 Crianza' },
  { id: 'misiones', label: '📋 Misiones' },
  { id: 'encuentros', label: '🗺️ Encuentros' },
  { id: 'shinys', label: '✨ Shinys' },
  { id: 'combate', label: '⚔️ Combate' },
  { id: 'guerra', label: '🛡️ Guerra' },
  { id: 'pokedex', label: '📂 Pokédex' },
  { id: 'eventos', label: '📅 Eventos' }
]
