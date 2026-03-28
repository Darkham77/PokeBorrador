/**
 * Lógica de la Biblioteca (Tutorial y Ayuda)
 * Sincronizada con SKILL_LIBRARY_SYNC.md
 * Última actualización: Sistema de Clases completo (Fases 1-10)
 */

// --- SECCIÓN DE CONTENIDO ---
const libraryContent = {

  // ─────────────────────────────────────────────────────────────
  gimnasios: `
    <h1>🏆 Gimnasios de Kanto</h1>
    <p>Los 8 Gimnasios son la columna vertebral de tu progresión. Cada victoria te da una medalla, una MT exclusiva y desbloquea el siguiente mapa. Hay <strong>3 niveles de dificultad</strong>: Fácil, Normal y Difícil. Podés hacer rematches ilimitados.</p>

    <h3>💡 Recompensas por Rematch</h3>
    <ul>
      <li>Dificultad <strong>Normal</strong>: <strong>3%</strong> de probabilidad de recibir la MT del líder otra vez.</li>
      <li>Dificultad <strong>Difícil</strong>: <strong>5%</strong> de probabilidad de recibir la MT.</li>
      <li>Los <strong>Entrenadores</strong> (clase) reciben +30% de Battle Coins en todas las victorias de Gimnasio.</li>
    </ul>

    <h3>📋 Lista Completa de Líderes</h3>
    <table class="library-table">
      <thead>
        <tr><th>Líder</th><th>Tipo</th><th>Ciudad</th><th>Medalla</th><th>MT</th><th>Niveles (Fácil / Normal / Difícil)</th><th>Medallas req.</th></tr>
      </thead>
      <tbody>
        <tr><td>Brock</td><td>🪨 Roca</td><td>Ciudad Plateada</td><td>💎 Medalla Roca</td><td>MT39 Tumba Rocas</td><td>12–14 / 28–32 / 62–68</td><td>0</td></tr>
        <tr><td>Misty</td><td>💧 Agua</td><td>Ciudad Celeste</td><td>💧 Medalla Cascada</td><td>MT03 Pulso Agua</td><td>18–21 / 35–40 / 65–70</td><td>1</td></tr>
        <tr><td>Lt. Surge</td><td>⚡ Eléctrico</td><td>Ciudad Carmín</td><td>⚡ Medalla Trueno</td><td>MT24 Rayo</td><td>21–28 / 42–50 / 68–75</td><td>2</td></tr>
        <tr><td>Erika</td><td>🌿 Planta</td><td>Ciudad Celacanto</td><td>🌿 Medalla Arcoíris</td><td>MT19 Gigadrenado</td><td>24–29 / 46–52 / 72–76</td><td>3</td></tr>
        <tr><td>Koga</td><td>☠️ Veneno</td><td>Ciudad Fucsia</td><td>☠️ Medalla Alma</td><td>MT06 Tóxico</td><td>37–43 / 54–62 / 74–80</td><td>4</td></tr>
        <tr><td>Sabrina</td><td>🔮 Psíquico</td><td>Ciudad Azafrán</td><td>🔮 Medalla Marsh</td><td>MT04 Paz Mental</td><td>37–43 / 56–62 / 78–82</td><td>5</td></tr>
        <tr><td>Blaine</td><td>🔥 Fuego</td><td>Isla Canela</td><td>🔥 Medalla Volcán</td><td>MT38 Llamarada</td><td>40–47 / 60–66 / 80–85</td><td>6</td></tr>
        <tr><td>Giovanni</td><td>🌍 Tierra</td><td>Ciudad Verde</td><td>🌍 Medalla Tierra</td><td>MT26 Terremoto</td><td>42–50 / 65–70 / 85–90</td><td>7</td></tr>
      </tbody>
    </table>

    <h3>⚠️ Consejos</h3>
    <ul>
      <li>La debilidad tipo siempre ayuda: llevá al menos un Pokémon con ventaja de tipo.</li>
      <li>El nivel Difícil tiene Pokémon entre nivel <strong>62 y 90</strong>. No lo intentes sin un equipo completo entrenado.</li>
      <li>Podés ganar todas las medallas y después hacer rematches en Difícil para farmear las MTs raras.</li>
    </ul>
  `,

  // ─────────────────────────────────────────────────────────────
  captura: `
    <h1>🔴 Sistema de Captura</h1>
    <p>Poké Vicio usa la <strong>fórmula oficial de Gen 1</strong> para calcular si un Pokémon es capturado. Cuanta menos vida tenga el salvaje y mejor sea tu Pokéball, mayor es la probabilidad.</p>

    <h3>🎯 Tipos de Pokéball y Multiplicadores</h3>
    <table class="library-table">
      <thead>
        <tr><th>Pokéball</th><th>Multiplicador</th><th>Condición especial</th></tr>
      </thead>
      <tbody>
        <tr><td>Poké Ball</td><td>x1.0</td><td>—</td></tr>
        <tr><td>Súper Ball / Ball Especial</td><td>x1.5</td><td>—</td></tr>
        <tr><td>Ultra Ball</td><td>x2.0</td><td>—</td></tr>
        <tr><td>Red Ball</td><td>x3.5 / x1.0</td><td>x3.5 en tipo Agua o Bicho, x1 en el resto</td></tr>
        <tr><td>Ocaso Ball</td><td>x3.0 / x1.0</td><td>x3 de noche o en cuevas; x1 de día</td></tr>
        <tr><td>Turno Ball</td><td>x1 a x4</td><td>+0.3 por turno de combate (máx x4)</td></tr>
        <tr><td>Master Ball</td><td>∞</td><td>Captura garantizada al 100%</td></tr>
      </tbody>
    </table>

    <h3>😴 Bonus por Estado Alterado</h3>
    <table class="library-table">
      <thead><tr><th>Estado</th><th>Multiplicador</th></tr></thead>
      <tbody>
        <tr><td>Dormido o Congelado</td><td><strong>x2.0</strong></td></tr>
        <tr><td>Quemado, Paralizado, Envenenado</td><td><strong>x1.5</strong></td></tr>
        <tr><td>Sin estado</td><td>x1.0</td></tr>
      </tbody>
    </table>

    <h3>📐 La Fórmula</h3>
    <p>La probabilidad base se calcula así:</p>
    <ul>
      <li><strong>a</strong> = ((3×MaxHP − 2×HP_actual) × CatchRate × BallMult) / (3×MaxHP) × BonusEstado</li>
      <li>Luego se hacen hasta 4 "sacudidas" aleatorias. Si pasan las 4, el Pokémon es capturado.</li>
      <li>Si <strong>a ≥ 255</strong>, la captura es automática (igual que Master Ball).</li>
    </ul>

    <h3>🎭 Modificadores de Clase sobre la Captura</h3>
    <ul>
      <li><strong>Cazabichos — Sinergia Bicho:</strong> +5% de catch rate por cada Pokémon tipo Bicho en tu equipo activo. Máximo <strong>+20%</strong> (con 4 o más bichos).</li>
      <li><strong>Entrenador — Ética Profesional:</strong> -10% de catch rate en Pokémon con IVs totales superiores a <strong>120</strong>.</li>
    </ul>

    <h3>💡 Consejos de Captura</h3>
    <ul>
      <li>Usá movimientos de estado (Paralizador, Canto, etc.) antes de lanzar la Pokéball.</li>
      <li>Reducí los PS al mínimo posible sin fainting al salvaje.</li>
      <li>La Turno Ball es ideal contra Pokémon que no podés debilitar fácil — esperá varios turnos.</li>
      <li>La Red Ball es la más eficiente para Pokémon tipo Agua o Bicho.</li>
    </ul>
  `,

  // ─────────────────────────────────────────────────────────────
  clases: `
    <h1>🎭 Sistema de Clases</h1>
    <p>Al llegar al <strong>Nivel 5 de Entrenador</strong> podés elegir una Clase. Define tu estilo de juego y te da bonificaciones únicas. Cambiar de clase cuesta <strong>10,000 Battle Coins</strong> y reinicia tu Nivel y XP de clase.</p>

    <h3>🚀 Equipo Rocket</h3>
    <p><em>Alto riesgo, alta recompensa. Vivís de vender, robar y el mercado negro.</em></p>
    <table class="library-table">
      <thead><tr><th>Mecánica</th><th>Detalle</th></tr></thead>
      <tbody>
        <tr><td>💰 Mercado Negro</td><td>Vendé Pokémon directamente desde la Caja por ₽. El precio escala con el nivel del Pokémon.</td></tr>
        <tr><td>🎯 Robo Rápido</td><td>15–30% de chance de robar un ítem al iniciar batalla contra un Entrenador NPC. Escala con el nivel de clase.</td></tr>
        <tr><td>🏪 Battle Coins</td><td>-10% BC en todas las batallas.</td></tr>
        <tr><td>🏥 Curación</td><td>El Centro Pokémon cuesta el <strong>doble (2×)</strong>.</td></tr>
        <tr><td>📋 Misiones</td><td>Contrabando (30m), Extorsión (45m), Robo de Lab (60m).</td></tr>
      </tbody>
    </table>

    <h3>🦗 Cazabichos</h3>
    <p><em>Maestro de la captura. Acumula rachas para obtener Shinys e IVs perfectos.</em></p>
    <table class="library-table">
      <thead><tr><th>Mecánica</th><th>Detalle</th></tr></thead>
      <tbody>
        <tr><td>⚡ Racha de Capturas</td><td>Cada captura suma +1 a la racha. Por cada punto de racha: Shiny rate ×1.15 (máx ×3.0) y IV mínimo +2 (máx 20).</td></tr>
        <tr><td>🦋 Sinergia Bicho</td><td>+5% catch rate por Pokémon tipo Bicho en el equipo. Máximo +20% con 4+ bichos.</td></tr>
        <tr><td>⚔️ EXP vs Entrenadores</td><td>-20% EXP en batallas contra entrenadores NPC.</td></tr>
        <tr><td>🪙 Battle Coins</td><td>-15% BC en todas las batallas.</td></tr>
        <tr><td>🏠 Guardería</td><td>Cuesta 1.5× más.</td></tr>
        <tr><td>📋 Misiones</td><td>Expedición de Captura (45m, +3 Poké Balls), Torneo de Insectos (90m), Investigación de Hábitat (60m).</td></tr>
      </tbody>
    </table>
    <p><strong>⚠️ La racha se pierde</strong> si el Pokémon escapa de la Pokéball o si vos escapás del combate.</p>

    <h3>🏅 Entrenador</h3>
    <p><em>El camino legítimo. Más EXP, más BC en gimnasios y acceso a una tienda de reputación.</em></p>
    <table class="library-table">
      <thead><tr><th>Mecánica</th><th>Detalle</th></tr></thead>
      <tbody>
        <tr><td>📈 EXP</td><td>+10% EXP en <strong>todos</strong> los combates.</td></tr>
        <tr><td>🏆 BC en Gimnasios</td><td>+30% Battle Coins en victorias contra Líderes de Gimnasio.</td></tr>
        <tr><td>⭐ Reputación</td><td>Ganás puntos de Reputación por victorias en gimnasio. Canjeables en la Tienda de Reputación por ítems exclusivos (Ultra Balls, MTs, Revivires, Huevo Suerte, etc.).</td></tr>
        <tr><td>🎯 Penalización de captura</td><td>-10% catch rate en Pokémon con IVs totales superiores a 120.</td></tr>
        <tr><td>🏠 Guardería</td><td>Cuesta 1.5× más.</td></tr>
        <tr><td>📋 Misiones</td><td>Sesión de Gimnasio (30m, +5 REP), Mentoría (60m, +10 REP), Torneo Local (90m, +15 REP).</td></tr>
      </tbody>
    </table>

    <h3>🧬 Criador Pokémon</h3>
    <p><em>Maestro genético. Produce los Pokémon con mejores IVs del servidor.</em></p>
    <table class="library-table">
      <thead><tr><th>Mecánica</th><th>Detalle</th></tr></thead>
      <tbody>
        <tr><td>🧬 Herencia de IVs</td><td>Hereda <strong>4 IVs</strong> de los padres en vez de 3 (base del juego).</td></tr>
        <tr><td>🥚 Tiempo de eclosión</td><td>Los huevos eclosionan en <strong>22.5 minutos</strong> (25% más rápido que los 30 min base).</td></tr>
        <tr><td>🌿 Everstone (Piedra Eterna)</td><td>Cuando ambos padres llevan Piedra Eterna, el Criador siempre hereda la naturaleza del Padre A (control total).</td></tr>
        <tr><td>🔬 Análisis Genético</td><td>Podés analizar los IVs exactos de cualquier Pokémon en tu Caja.</td></tr>
        <tr><td>👁️ Habilidad Oculta</td><td>Mayor probabilidad de que el hijo nazca con su Habilidad Oculta.</td></tr>
        <tr><td>📉 EXP</td><td>-10% EXP en todos los combates.</td></tr>
        <tr><td>🏥 Curación foránea</td><td>Curar Pokémon que no criaste vos cuesta 1.5×.</td></tr>
        <tr><td>📋 Misiones</td><td>Concurso de Belleza (45m), Incubación Asistida (60m), Análisis Genético Profundo (90m).</td></tr>
      </tbody>
    </table>
  `,

  // ─────────────────────────────────────────────────────────────
  crianza: `
    <h1>🥚 Crianza y Guardería</h1>
    <p>La crianza te permite combinar los genes de dos Pokémon compatibles para crear un hijo con los mejores IVs y movimientos de huevo.</p>

    <h3>⏱️ Tiempo y Costos</h3>
    <ul>
      <li><strong>Tiempo de eclosión base:</strong> 30 minutos tras depositar la pareja.</li>
      <li><strong>Criador Pokémon:</strong> 22 minutos 30 segundos (25% más rápido).</li>
      <li>Las batallas y capturas también <strong>reducen el tiempo</strong> de eclosión activo.</li>
    </ul>

    <h3>🧬 Herencia de IVs</h3>
    <ul>
      <li><strong>Base:</strong> El hijo hereda 3 IVs aleatorios de sus padres.</li>
      <li><strong>Criador Pokémon:</strong> El hijo hereda <strong>4 IVs</strong>.</li>
      <li>Los IVs no heredados se generan al azar (0–31).</li>
      <li><strong>Capacidad IV</strong> (ítem): Fuerza que un IV específico se herede del padre que la lleva.</li>
      <li><strong>Lazo Destino</strong>: Aumenta el número de IVs garantizados que se heredan.</li>
    </ul>

    <h3>🌿 Naturaleza (Piedra Eterna / Everstone)</h3>
    <ul>
      <li>Si el Padre A lleva Piedra Eterna → el hijo hereda la naturaleza del Padre A al 100%.</li>
      <li>Si el Padre B lleva Piedra Eterna → hereda la del Padre B al 100%.</li>
      <li>Si <strong>ambos</strong> llevan Piedra Eterna: 50/50 al azar (o Padre A si sos Criador).</li>
    </ul>

    <h3>💪 Vigor</h3>
    <ul>
      <li>Cada intento de cría consume <strong>1 punto de vigor</strong> de cada padre.</li>
      <li>Sin vigor no hay huevo. El vigor se recupera con el tiempo.</li>
    </ul>

    <h3>🐣 Compatibilidad</h3>
    <ul>
      <li><strong>Misma especie:</strong> La más alta probabilidad de producir huevo.</li>
      <li><strong>Mismo grupo de huevo:</strong> Compatible pero con menor probabilidad.</li>
      <li><strong>Ditto:</strong> Es compatible con casi cualquier Pokémon.</li>
      <li>Géneros opuestos requeridos (salvo Ditto).</li>
    </ul>

    <h3>🥚 Movimientos de Huevo</h3>
    <p>Si alguno de los padres conoce un movimiento de la lista de Movimientos de Huevo de esa especie, el hijo lo aprenderá al nacer (hasta 2 movimientos de huevo).</p>

    <h3>⚡ Tips de Crianza Avanzada</h3>
    <ul>
      <li>Para criar con IVs perfectos: usá padres con IVs altos en los stats que te interesan.</li>
      <li>Combiná Capacidades IV con el Lazo Destino para controlar qué IVs se heredan.</li>
      <li>Si sos Criador, tu ventaja de 4 IVs heredados reduce drásticamente las generaciones necesarias para llegar a IVs perfectos.</li>
    </ul>
  `,

  // ─────────────────────────────────────────────────────────────
  misiones: `
    <h1>📋 Misiones de Clase (Idle)</h1>
    <p>Una vez que tenés una Clase, podés lanzar misiones que se completan <strong>en tiempo real</strong>, incluso con el juego cerrado. Podés tener hasta <strong>2 misiones activas</strong> al mismo tiempo. Las recompensas se cobran automáticamente al entrar al juego si ya terminaron.</p>

    <p>Accedé a las misiones tocando el <strong>badge de tu clase</strong> (abajo a la derecha) → Cerrar → Misiones de Clase.</p>

    <h3>🚀 Misiones del Equipo Rocket</h3>
    <table class="library-table">
      <thead><tr><th>Misión</th><th>Duración</th><th>Recompensas</th></tr></thead>
      <tbody>
        <tr><td>💼 Contrabando Básico</td><td>30 minutos</td><td>₽1,200 + 40 XP de clase</td></tr>
        <tr><td>🃏 Extorsión</td><td>45 minutos</td><td>₽2,000 + 60 XP de clase</td></tr>
        <tr><td>🧪 Robo de Laboratorio</td><td>60 minutos</td><td>₽3,500 + 90 XP de clase</td></tr>
      </tbody>
    </table>

    <h3>🦗 Misiones del Cazabichos</h3>
    <table class="library-table">
      <thead><tr><th>Misión</th><th>Duración</th><th>Recompensas</th></tr></thead>
      <tbody>
        <tr><td>🌲 Expedición de Captura</td><td>45 minutos</td><td>₽600 + 55 XP + 3× Poké Ball</td></tr>
        <tr><td>🔍 Investigación de Hábitat</td><td>60 minutos</td><td>₽800 + 75 XP de clase</td></tr>
        <tr><td>🏆 Torneo de Insectos</td><td>90 minutos</td><td>₽1,500 + 120 XP de clase</td></tr>
      </tbody>
    </table>

    <h3>🏅 Misiones del Entrenador</h3>
    <table class="library-table">
      <thead><tr><th>Misión</th><th>Duración</th><th>Recompensas</th></tr></thead>
      <tbody>
        <tr><td>🥊 Sesión de Gimnasio</td><td>30 minutos</td><td>₽400 + 80 XP + 5 REP ⭐</td></tr>
        <tr><td>📚 Mentoría</td><td>60 minutos</td><td>₽700 + 90 XP + 10 REP ⭐</td></tr>
        <tr><td>🎖️ Torneo Local</td><td>90 minutos</td><td>₽2,200 + 150 XP + 15 REP ⭐</td></tr>
      </tbody>
    </table>

    <h3>🧬 Misiones del Criador</h3>
    <table class="library-table">
      <thead><tr><th>Misión</th><th>Duración</th><th>Recompensas</th></tr></thead>
      <tbody>
        <tr><td>✨ Concurso de Belleza</td><td>45 minutos</td><td>₽1,100 + 85 XP de clase</td></tr>
        <tr><td>🥚 Incubación Asistida</td><td>60 minutos</td><td>₽900 + 70 XP de clase</td></tr>
        <tr><td>🔬 Análisis Genético Profundo</td><td>90 minutos</td><td>₽2,800 + 130 XP de clase</td></tr>
      </tbody>
    </table>

    <h3>🏅 Tienda de Reputación (solo Entrenadores)</h3>
    <p>Con los puntos REP ganados en misiones y victorias de gimnasio, podés canjear ítems exclusivos:</p>
    <table class="library-table">
      <thead><tr><th>Ítem</th><th>Costo REP ⭐</th></tr></thead>
      <tbody>
        <tr><td>Ultra Ball ×3</td><td>20 ⭐</td></tr>
        <tr><td>Revivir ×5</td><td>30 ⭐</td></tr>
        <tr><td>Restauración Total ×2</td><td>45 ⭐</td></tr>
        <tr><td>Trozo Estrella ×3</td><td>60 ⭐</td></tr>
        <tr><td>MT Terremoto</td><td>50 ⭐</td></tr>
        <tr><td>Huevo Suerte</td><td>100 ⭐</td></tr>
      </tbody>
    </table>
  `,

  // ─────────────────────────────────────────────────────────────
  encuentros: `
    <h1>🗺️ Encuentros Salvajes</h1>
    <p>En Poké Vicio los encuentros se calculan al moverte por el mapa. Cada zona tiene su propia tabla de Pokémon con probabilidades distintas.</p>

    <h3>📊 Probabilidades de Encuentro</h3>
    <table class="library-table">
      <thead><tr><th>Tipo de encuentro</th><th>Probabilidad</th></tr></thead>
      <tbody>
        <tr><td>🎣 Pesca (en zonas con agua)</td><td>10%</td></tr>
        <tr><td>⚔️ Entrenador NPC (base)</td><td>5% — sube 5% cada 2 min, máx 20%</td></tr>
        <tr><td>⚔️ Entrenador con Repel activo</td><td>30% (garantizado cada cierto tiempo)</td></tr>
        <tr><td>👤 Rival</td><td>0.1% en cualquier mapa</td></tr>
      </tbody>
    </table>

    <h3>🐉 Pokémon Legendarios</h3>
    <table class="library-table">
      <thead><tr><th>Pokémon</th><th>Zona</th><th>Probabilidad</th><th>Requisito</th></tr></thead>
      <tbody>
        <tr><td>❄️ Articuno</td><td>Islas Espuma</td><td>1%</td><td>Ticket especial activo</td></tr>
        <tr><td>🧬 Mewtwo</td><td>Cueva Cerúlea</td><td>0.1%</td><td>Ticket especial activo</td></tr>
      </tbody>
    </table>

    <h3>🎒 Objetos Sostenidos Salvajes</h3>
    <p>Los Pokémon salvajes pueden aparecer con un objeto que podés quedarte al capturarlos:</p>
    <ul>
      <li><strong>Objeto común:</strong> 50% de probabilidad.</li>
      <li><strong>Objeto raro:</strong> 5% de probabilidad.</li>
    </ul>

    <h3>🎣 Pesca</h3>
    <p>Cada zona con agua tiene su propia tabla de Pokémon para pescar. Las probabilidades de pesca son distintas a los encuentros en hierba alta. Usá la Caña de Pescar en cualquier mapa con agua.</p>

    <h3>💡 Tips</h3>
    <ul>
      <li>Si querés farmear Pokémon raros, buscá los de menor porcentaje en la tabla de encuentros de cada zona.</li>
      <li>La pesca es una buena fuente de Pokémon acuáticos que no aparecen en hierba alta.</li>
      <li>El Rival es impredecible — puede aparecer en cualquier mapa, en cualquier momento.</li>
    </ul>
  `,

  // ─────────────────────────────────────────────────────────────
  shinys: `
    <h1>✨ Pokémon Shiny</h1>
    <p>Los Pokémon Shiny son versiones de color alternativo, extremadamente raras. En Poké Vicio son un símbolo de estatus y tienen la misma potencia que sus versiones normales.</p>

    <h3>📊 Probabilidad Base</h3>
    <ul>
      <li>Tasa base: <strong>1 en 3,000</strong> por cada encuentro salvaje.</li>
      <li>Con <strong>Boost de Shiny activo</strong>: 1 en 1,500 (el doble de probabilidad).</li>
    </ul>

    <h3>⚡ Racha de Capturas (solo Cazabichos)</h3>
    <p>La clase <strong>Cazabichos</strong> tiene un sistema de racha que multiplica el Shiny rate:</p>
    <table class="library-table">
      <thead><tr><th>Racha actual</th><th>Multiplicador Shiny</th><th>IV mínimo garantizado</th></tr></thead>
      <tbody>
        <tr><td>0 (sin racha)</td><td>×1.0</td><td>0</td></tr>
        <tr><td>5 capturas</td><td>×1.75</td><td>IV mín. 10</td></tr>
        <tr><td>10 capturas</td><td>×2.5</td><td>IV mín. 20</td></tr>
        <tr><td>13+ capturas</td><td>×3.0 (máximo)</td><td>IV mín. 20 (máximo)</td></tr>
      </tbody>
    </table>
    <p>La fórmula exacta: multiplicador = min(1 + 0.15 × racha, 3.0). IV mínimo = min(20, racha × 2).</p>
    <p><strong>⚠️ La racha se pierde</strong> si el Pokémon escapa de la Pokéball o si huís del combate.</p>

    <h3>💡 Estrategia para Shinys</h3>
    <ul>
      <li>Si sos Cazabichos: mantené la racha alta y capturá sin dejar escapar a ningún Pokémon.</li>
      <li>Activá el Boost de Shiny cuando tengas rachas altas para maximizar las chances.</li>
      <li>Llevá abundantes Pokéballs antes de ir a una sesión de caza de Shinys.</li>
      <li>Los Shiny en huevo (crianza) tienen su propia probabilidad: <strong>1 en 512</strong> por huevo.</li>
    </ul>
  `,

  // ─────────────────────────────────────────────────────────────
  combate: `
    <h1>⚔️ Sistema de Combate</h1>
    <p>El combate de Poké Vicio está basado en la mecánica de Gen 1 con algunas adaptaciones. Es por turnos: vos elegís una acción y el enemigo responde.</p>

    <h3>🎯 Tipos de Combate</h3>
    <ul>
      <li><strong>Pokémon Salvaje:</strong> Podés capturarlo o derrotarlo. Ganás EXP y BC al ganar.</li>
      <li><strong>Entrenador NPC:</strong> No podés capturar a su Pokémon. Mayor EXP y BC.</li>
      <li><strong>Líder de Gimnasio:</strong> Recompensa Medalla + MT + BC extra (especialmente para Entrenadores).</li>
      <li><strong>Rival:</strong> Encuentro especial con recompensas únicas.</li>
    </ul>

    <h3>📐 Daño</h3>
    <ul>
      <li>Los ataques Físicos usan <strong>ATK</strong> del atacante vs <strong>DEF</strong> del defensor.</li>
      <li>Los ataques Especiales usan <strong>AT.E</strong> del atacante vs <strong>DF.E</strong> del defensor.</li>
      <li><strong>Ventaja de tipo:</strong> ×2 si es súper efectivo, ×0.5 si no es muy efectivo, ×0 si es inmune.</li>
      <li><strong>STAB</strong> (Same Type Attack Bonus): ×1.5 si el movimiento es del mismo tipo que el Pokémon.</li>
      <li><strong>Crítico:</strong> Multiplica el daño. Afectado por la VEL del atacante.</li>
    </ul>

    <h3>😴 Estados Alterados</h3>
    <table class="library-table">
      <thead><tr><th>Estado</th><th>Efecto</th></tr></thead>
      <tbody>
        <tr><td>🔥 Quemado</td><td>Pierde % de PS al final de cada turno. ATK reducido.</td></tr>
        <tr><td>⚡ Paralizado</td><td>Puede no poder atacar ese turno. VEL reducida.</td></tr>
        <tr><td>☠️ Envenenado</td><td>Pierde PS progresivamente. El daño escala por turno.</td></tr>
        <tr><td>😴 Dormido</td><td>No puede atacar. Se despierta después de varios turnos.</td></tr>
        <tr><td>🧊 Congelado</td><td>No puede atacar hasta descongelarse (suele requerir un movimiento de fuego).</td></tr>
      </tbody>
    </table>
    <p><strong>Tip de captura:</strong> Dormido y Congelado dan ×2 al catch rate. Cualquier otro estado da ×1.5.</p>

    <h3>📈 EXP y Monedas (₽ / BC)</h3>
    <ul>
      <li>La EXP ganada depende del nivel del Pokémon enemigo y del tuyo.</li>
      <li><strong>Poké-Dólares (₽):</strong> Se ganan en todos los combates. Los entrenadores NPC dan 10 veces más que los salvajes.</li>
      <li><strong>Battle Coins (BC):</strong> Se ganan al vencer y se usan en la tienda y el sistema de clases.</li>
    </ul>

    <h3>🎭 Modificadores de Clase en Combate</h3>
    <table class="library-table">
      <thead><tr><th>Clase</th><th>Modificador</th></tr></thead>
      <tbody>
        <tr><td>🚀 Equipo Rocket</td><td><strong>Bono de Extorsión:</strong> +50% ₽ en batallas NPC. -10% BC en todas las batallas. Roba ítems al iniciar vs NPC (15–30%).</td></tr>
        <tr><td>🦗 Cazabichos</td><td>-20% EXP vs Entrenadores NPC. -15% BC en todas las batallas.</td></tr>
        <tr><td>🏅 Entrenador</td><td>+10% EXP en todos los combates. +30% BC en gimnasios.</td></tr>
        <tr><td>🧬 Criador</td><td>-10% EXP en todos los combates.</td></tr>
      </tbody>
    </table>
  `,

  // ─────────────────────────────────────────────────────────────
  eventos: `
    <h1>📅 Sistema de Eventos</h1>
    <p>Poké Vicio cuenta con un sistema de eventos dinámicos que otorgan bonificaciones temporales y desafíos especiales. Podés ver los eventos activos en el banner superior del juego.</p>

    <h3>🎣 Hora de Pesca (Magikarp)</h3>
    <p>Durante este evento, podés inscribir tus capturas de Magikarp en un concurso de IVs. ¡Los mejores ejemplares reciben premios exclusivos!</p>
    <ul>
      <li><strong>Inscripción:</strong> Automática al capturar un Magikarp mientras el evento está activo.</li>
      <li><strong>Puntuación:</strong> Se basa en la suma total de IVs (máximo 186).</li>
      <li><strong>Premios:</strong> Se entregan automáticamente al finalizar el evento a través del sistema de premios.</li>
    </ul>

    <h3>🎁 Premios y Recompensas</h3>
    <p>Si ganás un torneo o evento, recibirás una notificación. Los premios pueden incluir:</p>
    <ul>
      <li><strong>Dinero:</strong> Poké-Dólares (₽) o Battle Coins (BC).</li>
      <li><strong>Objetos:</strong> Ítems raros, MTs o consumibles.</li>
      <li><strong>Pokémon:</strong> Ejemplares especiales, a veces con IVs perfectos o en su versión Shiny ✨.</li>
    </ul>

    <h3>🛡️ Administración de Eventos</h3>
    <p>Los eventos son gestionados por los administradores y pueden ser programados (semanales) o activados manualmente para celebraciones especiales.</p>
  `

};
// --- FIN SECCIÓN DE CONTENIDO ---

// --- LÓGICA DEL MODAL ---
function toggleLibrary() {
  const modal = document.getElementById('library-modal');
  if (!modal) return;

  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'block';
    const contentArea = document.getElementById('library-article-content');
    // Forzamos la carga de la primera pestaña si el área de contenido está vacía o invisible
    if (contentArea && (!contentArea.innerHTML.trim() || contentArea.style.opacity === "0")) {
      const firstTab = document.querySelector('.library-nav-item');
      if (firstTab) {
        const match = firstTab.getAttribute('onclick').match(/'([^']+)'/);
        if (match) switchLibraryTab(match[1], firstTab);
      }
    }
  } else {
    modal.style.display = 'none';
  }
}

function switchLibraryTab(tab, element) {
  document.querySelectorAll('.library-nav-item').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');

  const contentArea = document.getElementById('library-article-content');
  if (!contentArea) return;

  contentArea.style.opacity = 0;

  setTimeout(() => {
    contentArea.innerHTML = libraryContent[tab] || '<h1>Próximamente</h1><p>Esta sección está en construcción.</p>';
    contentArea.style.opacity = 1;
    contentArea.style.transition = 'opacity 0.2s ease';
  }, 100);
}
