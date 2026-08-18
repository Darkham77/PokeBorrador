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


  eventos: `
    <h1>Sistema de Eventos</h1>
    <p>Concursos de captura automáticos y eventos que ignoran el ciclo horario.</p>
  `,

  interfaz: `
    <h1>Interfaz y Tooltips</h1>
    <p>Mantener presionado un movimiento para ver detalles técnicos en móvil.</p>
  `,
  clima: `
    <h1>Clima y Ecosistemas Dinámicos</h1>
    <p>El mundo de Poké Vicio es dinámico. Las mecánicas de combate, tipos elementales, evoluciones y apariciones de especies salvajes se ven profundamente afectadas por el <strong>Ciclo Horario</strong>, la <strong>Presión de Biomas</strong> y las <strong>Condiciones Climáticas</strong> en tiempo real.</p>

    <h3>El Ciclo Horario</h3>
    <p>Un día real (24h) equivale a 3 días de juego completo en Poké Vicio. Cada ciclo horario dura 2 horas reales:</p>
    <ul>
      <li>🌅 <strong>Amanecer</strong> (04:00 - 08:00): Afecta la aparición de ciertas especies matutinas.</li>
      <li>☀️ <strong>Día</strong> (08:00 - 16:00): Fase principal de actividad.</li>
      <li>🌇 <strong>Atardecer</strong> (16:00 - 20:00): Transición crepuscular.</li>
      <li>🌙 <strong>Noche</strong> (20:00 - 04:00): Favorece la aparición de tipos Fantasma y Siniestro.</li>
    </ul>

    <h3>Jerarquía de Intensidad Climática</h3>
    <table class="library-table">
      <thead><tr><th>Familia</th><th>Nivel 1</th><th>Nivel 2</th><th>Nivel 3</th><th>Nivel 4</th></tr></thead>
      <tbody>
        <tr><td>Calor</td><td>☀️ Sol</td><td>🔆 S. Intenso</td><td>🔥 O. Calor</td><td>--</td></tr>
        <tr><td>Frío</td><td>🧊 Frío</td><td>🥶 O. Frío</td><td>--</td><td>--</td></tr>
        <tr><td>Agua</td><td>🌧️ Lluvia</td><td>☔ L. Fuerte</td><td>⛈️ Tormenta</td><td>🌩️ T. Elec.</td></tr>
        <tr><td>Hielo</td><td>❄️ Nieve</td><td>🌨️ Granizo</td><td>🌬️ Ventisca</td><td>--</td></tr>
        <tr><td>Viento</td><td>🍃 Viento</td><td>🌀 V. Fuertes</td><td>--</td><td>--</td></tr>
        <tr><td>Tierra</td><td>🏜️ T. Arena</td><td>🌪️ T. Polvo</td><td>--</td><td>--</td></tr>
      </tbody>
    </table>

    <h3>Efectos Mecánicos del Clima en Combate</h3>
    <p>Las perturbaciones climatológicas alteran el flujo y la potencia de los movimientos en batalla:</p>
    <ul>
      <li>☀️ <strong>Sol y Radiación Intensa</strong>:
        <ul>
          <li>Aumenta la potencia de los ataques de tipo <strong>Fuego</strong> en un 50% (x1.5).</li>
          <li>Disminuye el daño de los ataques de tipo <strong>Agua</strong> a la mitad (x0.5).</li>
          <li>Movimientos como <em>Rayo Solar</em> y <em>Cuchilla Solar</em> se ejecutan instantáneamente sin cargar.</li>
          <li>La curación de <em>Síntesis</em>, <em>Sol Matinal</em> y <em>Luz Lunar</em> aumenta a un 66.6% de la vida máxima.</li>
          <li>La precisión de <em>Trueno</em> y <em>Vendaval</em> cae al 50%.</li>
        </ul>
      </li>
      <li>🌧️ <strong>Lluvia y Precipitaciones</strong>:
        <ul>
          <li>Aumenta la potencia de los ataques de tipo <strong>Agua</strong> en un 50% (x1.5).</li>
          <li>Disminuye el daño de los ataques de tipo <strong>Fuego</strong> a la mitad (x0.5).</li>
          <li>La precisión de <em>Trueno</em>, <em>Vendaval</em> y tormentas especiales (como <em>Vendaval Gélido</em>) sube al 100%.</li>
          <li>La curación de <em>Síntesis</em>, <em>Sol Matinal</em> y <em>Luz Lunar</em> baja a un 25%.</li>
        </ul>
      </li>
      <li>❄️ <strong>Nieve (Reemplazo de Granizo)</strong>:
        <ul>
          <li>Aumenta la <strong>Defensa Física</strong> de todos los Pokémon de tipo <strong>Hielo</strong> en un 50% (x1.5).</li>
          <li>Permite activar <em>Velo Aurora</em> para reducir a la mitad todo el daño recibido (Físico y Especial).</li>
          <li>La precisión de <em>Ventisca</em> sube al 100%.</li>
          <li>A diferencia del antiguo Granizo, <strong>no inflige daño residual</strong> a otros Pokémon. ¡Es un clima puramente defensivo!</li>
        </ul>
      </li>
      <li>🏜️ <strong>Tormenta de Arena</strong>:
        <ul>
          <li>Aumenta la <strong>Defensa Especial</strong> de todos los Pokémon de tipo <strong>Roca</strong> en un 50% (x1.5).</li>
          <li>Inflige un daño residual del 6.25% de la salud al final de cada turno a todos los Pokémon que no sean de tipo Roca, Tierra o Acero.</li>
          <li>Potencia la curación de <em>Recogearena</em> al 66.6%.</li>
        </ul>
      </li>
    </ul>

    <h3>Climas Supresores y Anomalías</h3>
    <ul>
      <li>🌫️ <strong>Niebla</strong>: Un clima que reduce la precisión de casi todos los movimientos en un factor de 3/5 (quedando en un 60% de su precisión base). También reduce la curación solar al 25% y la potencia de Rayo Solar al 50%. En Paldea suele invocar automáticamente un <em>Campo de Niebla</em>.</li>
      <li>🌀 <strong>Turbulencias / Vientos Fuertes</strong>: Fenómeno vinculado a <em>Ráfaga Delta</em>. Elimina todas las debilidades efectivas del tipo Volador (haciendo que los daños súper efectivos de Hielo, Roca y Eléctrico pasen a ser daño neutro 1x).</li>
    </ul>

    <h3>Sinergias Cuánticas y Terrenos</h3>
    <p>La novena generación integra Terrenos y Climas con la fisiología de los Pokémon Paradoja:</p>
    <ul>
      <li>🦖 <strong>Protosíntesis (Pasado) / Latido Orial</strong>: Habilidad biológica que bajo <strong>Sol</strong> incrementa la estadística más fuerte del poseedor en un 30% (o 50% si es Velocidad). Koraidon (con <em>Latido Orial</em>) invoca automáticamente el Sol e incrementa directamente su Ataque Físico en un 33.3% mediante el multiplicador de redondeo del motor.</li>
      <li>🤖 <strong>Carga Cuark (Futuro) / Motor Hadrónico</strong>: Habilidad que bajo <strong>Campo Eléctrico</strong> incrementa la estadística más alta en un 30% (o 50% si es Velocidad). Miraidon (con <em>Motor Hadrónico</em>) establece el Campo Eléctrico e incrementa su Ataque Especial en un 33.3% de forma directa.</li>
    </ul>

    <h3>Objetos Reguladores del Entorno</h3>
    <ul>
      <li>🪨 <strong>Rocas Climáticas</strong>: Al ser equipadas por el Pokémon invocador, extienden la duración del clima de 5 a <strong>8 turnos</strong> (<em>Roca Calor</em> para Sol, <em>Roca Lluvia</em> para Lluvia, <em>Roca Helada</em> para Nieve, y <em>Roca Suave</em> para Arena).</li>
      <li>🌂 <strong>Parasol Multiusos (Utility Umbrella)</strong>: Aísla por completo al portador de las ventajas y penalizaciones del Sol y de la Lluvia.</li>
      <li>🥽 <strong>Gafas Protectoras (Safety Goggles)</strong>: Inmunizan al portador frente al daño de la Tormenta de Arena y frente a esporas o polvos nocivos.</li>
      <li>🔋 <strong>Dispositivos de Absorción</strong>: Objetos de consumo como <em>Bulbo</em>, <em>Musgo Luminoso</em>, <em>Bola de Nieve</em> y <em>Pila</em>, que al recibir un impacto de tipo Agua, Hielo o Eléctrico suben un nivel la estadística del portador.</li>
    </ul>

    <h3>Influencia en Encuentros (Spawn)</h3>
    <p>Las condiciones atmosféricas alteran drásticamente qué Pokémon aparecen y con qué frecuencia:</p>
    <table class="library-table">
      <thead><tr><th>Clima</th><th>Boost (x1.5)</th><th>Penaliza (x0.4)</th><th>Bloquea (x0)</th></tr></thead>
      <tbody>
        <tr><td>🌧️ Lluvia</td><td>Agua, Bicho</td><td>Fuego, Roca</td><td>-</td></tr>
        <tr><td>☔ L. Fuerte</td><td>Agua</td><td>Roca, Tierra</td><td>Fuego</td></tr>
        <tr><td>⛈️ Tormenta</td><td>Agua, Elec.</td><td>Roca, Tierra</td><td>Fuego, Volador</td></tr>
        <tr><td>☀️ Sol</td><td>Fuego, Planta</td><td>Agua, Hielo</td><td>-</td></tr>
        <tr><td>🔆 S. Intenso</td><td>Planta, Fuego</td><td>-</td><td>Agua, Hielo</td></tr>
        <tr><td>🔥 O. Calor</td><td>Fuego, Tierra</td><td>Agua</td><td>Hielo, Planta</td></tr>
        <tr><td>🥶 O. Frío</td><td>Hielo</td><td>Fuego, Volador</td><td>Bicho, Planta</td></tr>
        <tr><td>❄️ Nieve</td><td>Hielo, Acero</td><td>Fuego, Bicho</td><td>-</td></tr>
        <tr><td>🌨️ Granizo</td><td>Hielo</td><td>Fuego, Bicho, Volador, Planta</td><td>-</td></tr>
        <tr><td>🌬️ Ventisca</td><td>Hielo</td><td>Acero, Roca</td><td>Fuego, Planta</td></tr>
        <tr><td>🌪️ T. Polvo</td><td>Roca, Tierra</td><td>Bicho</td><td>Volador</td></tr>
        <tr><td>🌀 V. Fuertes</td><td>Volador, Dragón</td><td>-</td><td>Bicho, Tierra</td></tr>
        <tr><td>🌫️ Niebla</td><td>Fantasma, Sini.</td><td>Volador</td><td>-</td></tr>
      </tbody>
    </table>

    <h3>Ecosistemas y Evoluciones</h3>
    <ul>
      <li>🐚 <strong>Deerling y Sawsbuck</strong>: Sus pelajes cambian dinámicamente según el bioma geográfico actual donde cargues tu partida (Forma Primavera en valles, Verano en costas, Otoño en bosques, e Invierno en Sierra Napada).</li>
      <li>🐌 <strong>Evolución de Sliggoo a Goodra</strong>: Requiere alcanzar el nivel 50 en una zona exterior sujeta a Lluvia activa o Niebla densa.</li>
    </ul>
  `,

  arqueologia: `
    <h1>Arqueología y Fósiles</h1>
    <p>El subsuelo de Kanto oculta secretos del pasado Pokémon. En las zonas con montañas (5% de chance) o cuevas (10% de chance), verás aparecer el indicador de **Arqueología ⛏️**. Al interactuar, podrás jugar al minijuego de excavación para desenterrar fósiles, piedras evolutivas y valiosas gemas o minerales.</p>

    <h3>Probabilidad de Recompensas</h3>
    <p>Al limpiar con éxito las rocas en el minijuego de arqueología, se determina tu botín bajo la siguiente distribución:</p>
    <ul>
      <li>🐚 <strong>Fósiles (45%)</strong>: Recibes un fósil específico del pool de la ruta actual (Fósil Hélix, Fósil Domo o Ámbar Viejo).</li>
      <li>⚡ <strong>Piedras Evolutivas (25%)</strong>: Una de las seis piedras elementales (Fuego, Agua, Trueno, Hoja, Lunar o Solar) elegida al azar de forma equiprobable.</li>
      <li>🪨 <strong>Minerales y Gemas Comunes (20%)</strong>: Objetos de menor rareza como Carbón, Hierro, Cobre, Perla o Polvo Estelar.</li>
      <li>🟡 <strong>Metales y Gemas Premium (10%)</strong>: Objetos de gran valor y utilidad como Pepita, Perla Grande, Trozo Estrella o minerales puros de Oro, Plata, Wolframio, Uranio, Rubí, Zafiro, Esmeralda, Topacio o Diamante.</li>
    </ul>

    <h3>Clonación Genética Ancestral (Guardería)</h3>
    <p>En la sección **Crianza**, se ha habilitado el **Almacén de Fósiles** donde podrás revivir estas reliquias del pasado en la máquina de clonación. El proceso genera un Huevo Pokémon ancestral (color marrón) que eclosiona en el Pokémon correspondiente.</p>
    
    <h3>Fósiles de Sacrificio y Mejoras</h3>
    <p>La clonación base cuesta **$3,000**. Sin embargo, puedes optar por sacrificar hasta **6 fósiles adicionales del mismo tipo** para mejorar genéticamente la clonación:</p>
    <ul>
      <li>💰 <strong>Costo Progresivo</strong>: Cada fósil extra suma **+$1,000** al costo total (desde $3,000 hasta un máximo de $9,000).</li>
      <li>🧬 <strong>Rerolls de IVs</strong>: Obtienes <strong>1 + N/2</strong> tiradas de IVs por estadística (donde N es el número de fósiles de sacrificio). Si N es impar (1, 3, 5), se garantiza la parte entera y tienes un **50% de probabilidad** de obtener una tirada adicional. Se seleccionará el IV más alto de todas las tiradas.</li>
      <li>✨ <strong>Shiny Boost (Variocolor)</strong>: Cada fósil de sacrificio suma un **+25% de probabilidad Shiny** a la tasa base (de 1/4096), alcanzando hasta un multiplicador de **2.5x** (con 6 fósiles).</li>
    </ul>
  `,

  evs: `
    <h1>Entrenamiento de Puntos de Esfuerzo (EVs)</h1>
    <p>Los <strong>Puntos de Esfuerzo (Effort Values - EVs)</strong> son atributos dinámicos que aumentan las estadísticas finales de tus Pokémon a medida que combaten o consumen objetos nutritivos especiales. A nivel 100, cada <strong>4 EVs</strong> en una estadística otorgan <strong>+1 punto neto</strong> en ese atributo (a nivel 50, se necesitan 8 EVs por punto tras los primeros 4).</p>

    <h3>Límites Oficiales</h3>
    <ul>
      <li><strong>Tope por Estadística:</strong> Máximo <strong>252 EVs</strong> en un único atributo (PS, Ataque, Defensa, At. Especial, Def. Especial o Velocidad).</li>
      <li><strong>Tope Global:</strong> Máximo <strong>510 EVs</strong> acumulados en total por Pokémon.</li>
      <li><strong>Reparto Óptimo:</strong> Permite maximizar dos estadísticas principales (252 + 252 = 504) y colocar los 6 EVs restantes en una tercera estadística (504 + 6 = 510).</li>
    </ul>

    <h3>1. Ganancia de EVs por Combate</h3>
    <p>Cada vez que derrotas a un Pokémon enemigo en batalla (salvaje, gimnasio o entrenador), tus Pokémon participantes reciben los EVs base asignados a esa especie:</p>
    <table class="library-table">
      <thead><tr><th>Estadística</th><th>Ejemplos de Rendimiento Base</th></tr></thead>
      <tbody>
        <tr><td>❤️ PS</td><td>Chansey (+2), Blissey (+3), Snorlax (+2), Caterpie (+1)</td></tr>
        <tr><td>⚔️ Ataque</td><td>Machop (+1), Gyarados (+2), Dragonite (+3)</td></tr>
        <tr><td>🛡️ Defensa</td><td>Geodude (+1), Cloyster (+2), Golem (+3)</td></tr>
        <tr><td>🔮 At. Especial</td><td>Gastly (+1), Haunter (+2), Alakazam (+3)</td></tr>
        <tr><td>🔰 Def. Especial</td><td>Tentacool (+1), Tentacruel (+2), Blastoise (+3)</td></tr>
        <tr><td>⚡ Velocidad</td><td>Pidgey (+1), Pikachu (+2), Jolteon (+3)</td></tr>
      </tbody>
    </table>
    <p><em>Nota:</em> Si un Pokémon lleva equipado <strong>Compartir Experiencia</strong>, también recibirá el rendimiento de EVs de la batalla aunque no haya entrado al campo.</p>

    <h3>2. Objetos de Entrenamiento (Potenciadores)</h3>
    <ul>
      <li>🥊 <strong>Brazal Firme (Macho Brace):</strong> Duplica (<strong>x2</strong>) todos los puntos de esfuerzo obtenidos en combate, a cambio de reducir la velocidad del portador a la mitad durante la batalla.</li>
      <li>🏋️ <strong>Objetos Recios (+8 EVs por combate):</strong> Suman <strong>+8 EVs fijos</strong> en la estadística correspondiente tras cada victoria, además de los EVs otorgados por el enemigo:
        <ul>
          <li><em>Pesa Recia:</em> +8 PS</li>
          <li><em>Brazalete Recio:</em> +8 Ataque</li>
          <li><em>Cinto Recio:</em> +8 Defensa</li>
          <li><em>Lente Recia:</em> +8 At. Especial</li>
          <li><em>Banda Recia:</em> +8 Def. Especial</li>
          <li><em>Franja Recia:</em> +8 Velocidad</li>
        </ul>
      </li>
    </ul>

    <h3>3. Virus Benigno: Pokérus 🦠</h3>
    <p>El Pokérus es una rara condición médica beneficiosa que duplica permanentemente la ganancia de EVs en combate:</p>
    <ul>
      <li><strong>Multiplicador x2:</strong> Duplica todas las ganancias de combate (incluyendo la bonificación de los objetos recios y el brazal firme).</li>
      <li><strong>Efecto Acumulativo:</strong> Con <em>Brazal Firme + Pokérus</em> se obtiene un multiplicador de <strong>x4</strong>. Con <em>Objeto Recio + Pokérus</em> la fórmula es: <code>(EVs_Base + 8) x 2</code>.</li>
      <li><strong>Contagio en el Equipo:</strong> Al finalizar un combate victorioso, un Pokémon infectado tiene un <strong>33% de probabilidad</strong> de contagiar el virus a los compañeros adyacentes (izquierda y derecha en el equipo).</li>
      <li><strong>Distintivos en Ficha:</strong> Los Pokémon infectados muestran la insignia rosada <strong>[PKRS]</strong> y los curados la etiqueta <strong>[PKRS CURADO]</strong>.</li>
    </ul>

    <h3>4. Nutrición Instantánea: Vitaminas, Plumas y Mochis 🍡</h3>
    <ul>
      <li>💊 <strong>Vitaminas (+10 EVs):</strong> Más PS, Proteína, Hierro, Calcio, Éter y Carburante otorgan +10 EVs en su estadística respectiva de forma inmediata.</li>
      <li>🪶 <strong>Plumas (+1 EV):</strong> Pluma Ímpetu, Músculo, Aguante, Intelecto, Mente y Vitalidad otorgan +1 EV para ajustes de máxima precisión.</li>
      <li>🍡 <strong>Mochis de Gen 9 (+10 EVs):</strong> Deliciosos dulces de la comarca de Norfeo (<em>Mochi Vitalidad, Mochi Músculo, Mochi Aguante, Mochi Intelecto, Mochi Mente, Mochi Ímpetu</em>).</li>
      <li>✨ <strong>Mochi Reinicio (Fresh-Start Mochi):</strong> Objeto legendario exclusivo que <strong>restablece todos los EVs a 0</strong> de una sola vez, permitiéndote reentrenar a tu Pokémon desde cero sin alterar sus IVs ni su nivel.</li>
    </ul>

    <h3>5. Corrección de EVs: Bayas Reductoras 🍓</h3>
    <p>Si deseas reducir los EVs de una estadística puntual para redistribuirlos, puedes darle estas bayas (-10 EVs por unidad y +Felicidad):</p>
    <ul>
      <li><em>Baya Grana:</em> -10 EVs en PS</li>
      <li><em>Baya Algama:</em> -10 EVs en Ataque</li>
      <li><em>Baya Ispero:</em> -10 EVs en Defensa</li>
      <li><em>Baya Meluce:</em> -10 EVs en At. Especial</li>
      <li><em>Baya Jalre:</em> -10 EVs en Def. Especial</li>
      <li><em>Baya Tamate:</em> -10 EVs en Velocidad</li>
    </ul>

    <h3>6. Visualización en la Ficha del Pokémon</h3>
    <p>En el detalle de tu Pokémon (pestaña <strong>Stats</strong>), puedes consultar el contador en tiempo real de <strong>TOTAL: X / 510</strong>. Cuando el Pokémon alcance el límite máximo permitido, se activará el distintivo dorado <strong>✨ MAX</strong>.</p>
  `
}

export const libraryCategories = [
  { id: 'gimnasios', label: '🏆 Gimnasios' },
  { id: 'evs', label: '💪 Puntos de Esfuerzo (EVs)' },
  { id: 'captura', label: '🔴 Captura' },
  { id: 'clases', label: '🎭 Clases' },
  { id: 'crianza', label: '🥚 Crianza' },
  { id: 'misiones', label: '📋 Misiones' },
  { id: 'encuentros', label: '🗺️ Encuentros' },
  { id: 'shinys', label: '✨ Shinys' },
  { id: 'combate', label: '⚔️ Combate' },
  { id: 'guerra', label: '🛡️ Guerra' },
  { id: 'eventos', label: '📅 Eventos' },
  { id: 'clima', label: '🌦️ Clima' },
  { id: 'arqueologia', label: '⛏️ Arqueología' }
]
