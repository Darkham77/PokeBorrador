/**
 * Lógica de la Biblioteca (Tutorial y Ayuda)
 * Sincronizada con SKILL_LIBRARY_SYNC.md
 * Última actualización: Sistema de Clases completo (Fases 1-10)
 */

// --- SECCIÓN DE CONTENIDO ---
const libraryContent = {

  gimnasios: `
    <h1>🏆 Gimnasios de Kanto</h1>
    <p>Los 8 Gimnasios son la columna vertebral de tu progresión. Cada victoria te otorga una medalla, una MT exclusiva y desbloquea el acceso a nuevas rutas. Hay <strong>3 niveles de dificultad</strong>: Fácil, Normal y Difícil. Podes realizar rematches ilimitados.</p>

    <h3>💡 Recompensas por Rematch</h3>
    <ul>
      <li>Dificultad <strong>Fácil</strong>: <strong>105 Battle Coins</strong>.</li>
      <li>Dificultad <strong>Normal</strong>: <strong>210 Battle Coins</strong> + 3% de probabilidad de recibir la MT otra vez.</li>
      <li>Dificultad <strong>Difícil</strong>: <strong>315 Battle Coins</strong> + 5% de probabilidad de recibir la MT otra vez.</li>
      <li>Los <strong>Entrenadores</strong> (clase) reciben un <strong>+30% de Battle Coins</strong> adicionales en todas las victorias de Gimnasio.</li>
    </ul>

    <h3>📝 Notas de Combate</h3>
    <ul>
      <li>Cada nivel de dificultad aumenta el nivel de los Pokémon del Líder y mejora su IA.</li>
      <li>El nivel Difícil cuenta con Pokémon entre nivel <strong>62 y 90</strong>. ¡Prepárate bien!</li>
    </ul>
  `,

  captura: `
    <h1>🔴 Sistema de Captura</h1>
    <p>Poké Vicio utiliza una fórmula basada en la <strong>Gen 1</strong> para calcular el éxito de captura. Factores como los PS restantes del Pokémon salvaje y el tipo de Pokéball son fundamentales.</p>

    <h3>🎯 Probabilidades</h3>
    <ul>
      <li><strong>PS del Objetivo:</strong> Cuanto menos vida tenga el Pokémon rival, más fácil será capturarlo.</li>
      <li><strong>Estados Alterados:</strong> Dormir o Congelar al oponente aumenta significativamente el ratio de captura.</li>
      <li><strong>Rachas (Cazabichos):</strong> Capturar especies iguales de forma consecutiva mejora tus chances generales.</li>
    </ul>

    <h3>🎒 Tipos de Pokéball</h3>
    <table class="library-table">
      <thead><tr><th>Ball</th><th>Eficacia</th><th>Efecto Especial</th></tr></thead>
      <tbody>
        <tr><td>Poké Ball</td><td>1x</td><td>Uso estándar.</td></tr>
        <tr><td>Súper Ball</td><td>1.5x</td><td>Mejor rendimiento que la estándar.</td></tr>
        <tr><td>Ultra Ball</td><td>2x</td><td>Gran probabilidad de captura.</td></tr>
        <tr><td>Safari Ball</td><td>1.5x</td><td>Exclusiva de la Zona Safari.</td></tr>
        <tr><td>Master Ball</td><td>∞</td><td>Captura garantizada (100%).</td></tr>
      </tbody>
    </table>
  `,

  clases: `
    <h1>🎭 Clases de Jugador</h1>
    <p>Al alcanzar el <strong>Nivel 5</strong>, podés elegir una especialización que cambiará drásticamente tu forma de jugar. Podés cambiar de clase por <strong>10,000 BC</strong>.</p>

    <div class="class-info-box">
      <h3>🚀 Equipo Rocket</h3>
      <ul>
        <li><strong>Mercado Negro:</strong> Vendé cualquier Pokémon de tu caja directamente por ₽.</li>
        <li><strong>Robo Rápido:</strong> Chance de robar un objeto al azar al inicio de batallas NPC.</li>
        <li><strong>Robo al Oficial:</strong> 5% de chance de robarle un Pokémon al Oficial de Policía tras vencerlo.</li>
        <li><strong>Penalización:</strong> Los Centros Pokémon cuestan <strong>2x</strong>.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>🏅 Entrenador</h3>
      <ul>
        <li><strong>Progresión:</strong> Gana un <strong>+10% de EXP</strong> en todos los combates.</li>
        <li><strong>Dominio:</strong> Gana un <strong>+30% de BC</strong> en gimnasios.</li>
        <li><strong>Reputación:</strong> Desbloquea la tienda de reputación venciendo gimnasios.</li>
        <li><strong>Ruta Oficial:</strong> Marcá una ruta diaria para ganar reputación extra por combate.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>🦗 Cazabichos</h3>
      <ul>
        <li><strong>Rachas:</strong> Cada captura consecutiva aumenta el Shiny Rate (hasta x4) e IVs mínimos.</li>
        <li><strong>Red Maestra:</strong> 20% de chance de capturar un segundo ejemplar si es de tipo Bicho (2x1).</li>
        <li><strong>Aroma Atractivo:</strong> Chance de forzar la aparición de Scyther o Pinsir salvajes.</li>
      </ul>
    </div>

    <div class="class-info-box">
      <h3>🧬 Criador</h3>
      <ul>
        <li><strong>Genética:</strong> Los hijos heredan <strong>4 IVs</strong> de los padres (en lugar de 3).</li>
        <li><strong>Incubación:</strong> Los pasos para eclosionar se reducen un <strong>25%</strong>.</li>
        <li><strong>Escáner:</strong> Permite gestionar y visualizar genética detallada post-eclosión.</li>
      </ul>
    </div>
  `,

  crianza: `
    <h1>🥚 Sistema de Crianza</h1>
    <p>La crianza te permite crear Pokémon con estadísticas perfectas y movimientos heredados. Se realiza en la <strong>Guardería</strong>.</p>

    <h3>🧬 Herencia Genética</h3>
    <ul>
      <li><strong>IVs:</strong> Se heredan 3 IVs de los padres de forma aleatoria (4 para Criadores).</li>
      <li><strong>Naturaleza:</strong> El uso de la <strong>Piedra Eterna</strong> garantiza la herencia de la naturaleza del padre que la lleve asignada.</li>
      <li><strong>Movimientos Huevo:</strong> Ciertas especies pueden aprender movimientos únicos que no se consiguen por nivel.</li>
    </ul>

    <h3>⏳ Eclosión</h3>
    <p>Para que un Huevo nazca, debés llevarlo en tu equipo y explorar el mapa. Cada "paso" (encuentro salvaje) reduce el contador.</p>
  `,

  misiones: `
    <h1>📋 Misiones Diarias</h1>
    <p>Los NPCs de la Guardería te asignarán misiones diariamente. Completarlas otorga experiencia de clase y recursos valiosos.</p>
    <ul>
      <li>Las misiones se reinician cada 24 horas (horario GMT-3).</li>
      <li>Podés encontrar misiones de captura, derrota o entrega de objetos.</li>
      <li>Revisá la pestaña <strong>"Misiones"</strong> en el HUD para ver tu progreso actual.</li>
    </ul>
  `,

  encuentros: `
    <h1>🗺️ Encuentros y Ciclos</h1>
    <p>El mundo de Poké Vicio es dinámico. Las especies disponibles cambian según el <strong>Ciclo Horario</strong>.</p>

    <h3>🕒 Ciclo de 4 Horas</h3>
    <ul>
      <li><strong>Amanecer (04:00 - 08:00)</strong></li>
      <li><strong>Día (08:00 - 16:00)</strong></li>
      <li><strong>Atardecer (16:00 - 20:00)</strong></li>
      <li><strong>Noche (20:00 - 04:00)</strong></li>
    </ul>
    <p>Pokémon nocturnos como Gastly o Hoothoot raramente aparecerán durante el día.</p>
    
    <h3>🎣 Pesca</h3>
    <p>Si tenés una caña, podés interactuar con el agua en ciertas rutas. Pescar activa un <strong>minijuego de ritmo</strong>; acertar las notas garantiza el encuentro.</p>
  `,

  shinys: `
    <h1>✨ Pokémon Shiny</h1>
    <p>Son versiones raras con colores alternativos. No tienen mejores estadísticas (por ahora), pero son el mayor trofeo de un coleccionista.</p>

    <h3>📈 Probabilidades (Ratios)</h3>
    <ul>
      <li><strong>Tasa Base:</strong> 1 en 3,000 encuentros.</li>
      <li><strong>Bono de Fin de Semana:</strong> 30% más de probabilidad (+1.3x).</li>
      <li><strong>Dominancia:</strong> Si tu bando controla la zona, ganás un 30% extra de shiny chance.</li>
      <li><strong>Racha (Cazabichos):</strong> Puede aumentar la probabilidad hasta un <strong>x4.0</strong> (1 en 750).</li>
    </ul>
  `,

  combate: `
    <h1>⚔️ Sistema de Combate</h1>
    <p>Las batallas usan la lógica de la 1ra Generación con balanceos modernos.</p>
    <ul>
      <li><strong>STAB:</strong> Los movimientos del mismo tipo que el Pokémon pegan un 50% más fuerte.</li>
      <li><strong>Críticos:</strong> Se basan en la Velocidad base y el ratio del movimiento (ej: Corte Vacío).</li>
      <li><strong>Precisión:</strong> Algunos movimientos potentes tienen baja precisión (Trueno, Llamarada).</li>
    </ul>
  `,

  guerra: `
    <h1>🛡️ Guerra de Facciones</h1>
    <p>El juego se divide en dos bandos: <strong>Unión</strong> y <strong>Poder</strong>. Luchá por el control de las zonas de Kanto.</p>

    <h3>🚩 Dominancia Territorial</h3>
    <ul>
      <li><strong>Puntos de Guerra:</strong> Capturar Pokémon o vencer entrenadores en una ruta suma puntos a tu bando.</li>
      <li><strong>Territorio Dominado:</strong> El bando con más puntos al final de la disputa toma el control del mapa.</li>
      <li><strong>Beneficios de Dominancia:</strong>
        <ul>
          <li>+30% de <strong>Experiencia</strong> en la zona.</li>
          <li>+30% de probabilidad <strong>Shiny</strong>.</li>
          <li>+30% de probabilidad de <strong>IVs más altos</strong>.</li>
        </ul>
      </li>
    </ul>

    <h3>⚠️ Guardianes de Ruta</h3>
    <p>En zonas en disputa, podés encontrar <strong>Guardianes (Pokémon Alfa)</strong>. Derrotarlos otorga una gran cantidad de puntos y recompensas especiales.</p>
  `,

  pokedex: `
    <h1>📂 Pokédex Nacional</h1>
    <p>Tu enciclopedia Pokémon ha sido mejorada. Ahora podés ver información técnica detallada de cada especie capturada.</p>

    <h3>📑 Datos Disponibles</h3>
    <ul>
      <li><strong>Estadísticas Base:</strong> Conocé el potencial real de cada Pokémon.</li>
      <li><strong>Compatibilidad de MT:</strong> Revisá qué máquinas técnicas puede aprender antes de gastarlas.</li>
      <li><strong>Lista de Movimientos:</strong> Consultá qué ataques aprende por nivel y evolución.</li>
      <li><strong>Cadena Evolutiva:</strong> Descubrí cómo y a qué nivel evoluciona tu compañero.</li>
    </ul>
  `,

  eventos: `
    <h1>📅 Sistema de Eventos</h1>
    <p>Mantenete atento al banner superior. Los eventos ofrecen desafíos únicos por tiempo limitado.</p>

    <h3>🏆 Concursos de Captura</h3>
    <p>Eventos como el de Magikarp donde se premia al ejemplar con mejores IVs. La inscripción es <strong>automática</strong> al realizar la captura durante el evento.</p>

    <h3>⏳ Eventos de Tiempo</h3>
    <p>Algunos eventos especiales <strong>ignoran las restricciones de ciclo</strong>, permitiendo capturar Pokémon raros en horarios inusuales.</p>
  `,

  interfaz: `
    <h1>📱 Interfaz y Premium Tooltips</h1>
    <p>Hemos diseñado una interfaz intuitiva para acceder a la información sin salir de la acción.</p>

    <h3>💡 Tooltips en Movimientos</h3>
    <ul>
      <li><strong>Móvil:</strong> Mantener presionado el botón de un movimiento para ver su potencia, precisión y descripción detallada.</li>
      <li><strong>PC:</strong> Simplemente pasá el mouse sobre el movimiento para desplegar la información.</li>
    </ul>
    <p>Esto también funciona para los <strong>Estados Alterados</strong> (Quemado, Paralizado, etc.) y los iconos de stats en el HUD.</p>
  `

};

// --- FIN SECCIÓN DE CONTENIDO ---

// --- LÓGICA DEL MODAL ---
function toggleLibrary() {
  const modal = document.getElementById('library-modal');
  if (!modal) return;

  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'block';
    // Abrir siempre en la sección de Gimnasios por defecto
    const gymTab = document.querySelector('.library-nav-item[onclick*="\\'gimnasios\\'"]');
    if (gymTab) {
      switchLibraryTab('gimnasios', gymTab);
    } else {
      // Fallback a la primera pestaña si no se encuentra la de gimnasios
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

function openLibrarySection(tab) {
  const modal = document.getElementById('library-modal');
  if (modal) {
    modal.style.display = 'block';
    const element = document.querySelector(`.library-nav-item[onclick*="'${tab}'"]`);
    switchLibraryTab(tab, element);
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
