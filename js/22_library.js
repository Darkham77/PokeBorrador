/**
 * Lógica de la Biblioteca (Tutorial y Ayuda)
 * Este archivo se sincroniza con SKILL_LIBRARY_SYNC.md
 */

// --- SECCIÓN DE CONTENIDO (EDITABLE POR IA) ---
const libraryContent = {
  gimnasios: `
    <h1>🏆 Gimnasios de Kanto</h1>
    <p>Los Gimnasios son el corazón de tu progresión en Poké Vicio. Al derrotar a los líderes, obtendrás medallas que desbloquean nuevos mapas y funciones.</p>
    
    <h3>¿Cómo funcionan?</h3>
    <ul>
      <li><strong>Inscripción:</strong> Debes pagar una pequeña cuota en Battle Coins (BC) para entrar.</li>
      <li><strong>Nivel Recomendado:</strong> Cada líder tiene un nivel fijo. Asegúrate de que tu equipo esté a la altura.</li>
      <li><strong>Recompensas:</strong> Al ganar, recibes la Medalla del gimnasio, una gran cantidad de EXP y objetos raros.</li>
    </ul>

    <h3>Lista de Líderes</h3>
    <table class="library-table">
      <thead>
        <tr><th>Líder</th><th>Tipo</th><th>Ciudad</th></tr>
      </thead>
      <tbody>
        <tr><td>Brock</td><td>🪨 Roca</td><td>Ciudad Plateada</td></tr>
        <tr><td>Misty</td><td>💧 Agua</td><td>Ciudad Celeste</td></tr>
        <tr><td>Lt. Surge</td><td>⚡ Eléctrico</td><td>Ciudad Carmín</td></tr>
        <tr><td>Erika</td><td>🌿 Planta</td><td>Ciudad Azulona</td></tr>
      </tbody>
    </table>
  `,
  captura: `
    <h1>🔴 Sistema de Captura</h1>
    <p>Capturar Pokémon es fundamental para completar tu Pokédex y fortalecer tu equipo.</p>
    
    <h3>Factores que influyen</h3>
    <ul>
      <li><strong>HP Restante:</strong> Cuanto menos vida tenga el Pokémon salvaje, más fácil será capturarlo.</li>
      <li><strong>Tipo de Pokéball:</strong> Cada bola tiene un multiplicador distinto (Pokéball x1, Superball x1.5, Ultraball x2).</li>
      <li><strong>Estado Alterado:</strong> Dormir o Congelar al rival aumenta drásticamente la probabilidad.</li>
    </ul>

    <h3>Consejos de Experto</h3>
    <p>No malgastes tus Ultraballs en Pokémon comunes. Guarda tus mejores recursos para los encuentros raros o Legendarios que aparecen con baja probabilidad.</p>
  `,
  eventos: `
    <h1>🔥 Eventos Especiales</h1>
    <p>El mundo de Poké Vicio está en constante cambio. Los eventos ofrecen oportunidades únicas por tiempo limitado.</p>
    
    <h3>Tipos de Eventos</h3>
    <ul>
      <li><strong>Invasiones:</strong> Pokémon de otras regiones aparecen en mapas específicos.</li>
      <li><strong>Bonus de EXP:</strong> Multiplicadores de experiencia globales durante ciertas horas.</li>
      <li><strong>Días de Crianza:</strong> Los huevos eclosionan más rápido y tienen mejores IVs.</li>
    </ul>
    
    <p>Revisa siempre el <strong>Banner de Eventos</strong> en la parte superior de la pantalla para estar al tanto de lo que sucede en el servidor.</p>
  `,
  clases: `
    <h1>🧑‍🤝‍🧑 Clases de Entrenador</h1>
    <p>Al comenzar o avanzar en tu aventura, puedes especializarte en una clase que define tu estilo de juego.</p>
    
    <h3>Clases Disponibles</h3>
    <ul>
      <li><strong>Equipo Rocket:</strong> Enfocado en el dinero. Vende Pokémon por más ₽ y tiene misiones de contrabando.</li>
      <li><strong>Cazabichos:</strong> Experto en capturas. Mejores probabilidades de Shiny y IVs altos al capturar en racha.</li>
      <li><strong>Entrenador:</strong> La clase equilibrada. Gana más EXP en combate y tiene descuentos en gimnasios.</li>
      <li><strong>Criador:</strong> Maestro de la genética. Los huevos eclosionan más rápido y heredan mejores stats.</li>
    </ul>

    <h3>¿Cómo cambiar?</h3>
    <p>Puedes ver tu clase actual en tu perfil. Algunas clases requieren cumplir ciertos requisitos o completar misiones específicas para ser desbloqueadas.</p>
  `,
  crianza: `
    <h1>🥚 El Arte de la Crianza</h1>
    <p>La crianza te permite crear el Pokémon perfecto combinando los mejores stats de sus padres.</p>
    
    <h3>Conceptos Clave</h3>
    <ul>
      <li><strong>IVs (Valores Individuales):</strong> Son los genes del Pokémon. Van de 0 a 31.</li>
      <li><strong>Herencia:</strong> Los hijos heredan algunos IVs de sus padres. Usa objetos como el Lazo Destino para asegurar mejores genes.</li>
      <li><strong>Pasos:</strong> Para que un huevo eclosione, debes caminar (realizar acciones en el juego).</li>
    </ul>

    <p>Los <strong>Criadores Pokémon</strong> tienen bonificaciones especiales que reducen el tiempo de espera y aseguran mejores resultados genéticos.</p>
  `
};
// --- FIN SECCIÓN DE CONTENIDO ---

// --- LÓGICA DEL MODAL ---
function toggleLibrary() {
  const modal = document.getElementById('library-modal');
  if (!modal) return;
  
  if (modal.style.display === 'none' || modal.style.display === '') {
    modal.style.display = 'block';
    // Cargar la primera pestaña por defecto si no hay contenido
    const contentArea = document.getElementById('library-article-content');
    if (contentArea && !contentArea.innerHTML.trim()) {
      const firstTab = document.querySelector('.library-nav-item');
      if (firstTab) {
        const tabKey = firstTab.getAttribute('onclick').match(/'([^']+)'/)[1];
        switchLibraryTab(tabKey, firstTab);
      }
    }
  } else {
    modal.style.display = 'none';
  }
}

function switchLibraryTab(tab, element) {
  // Actualizar UI de pestañas
  document.querySelectorAll('.library-nav-item').forEach(el => el.classList.remove('active'));
  if (element) element.classList.add('active');

  // Actualizar contenido
  const contentArea = document.getElementById('library-article-content');
  if (!contentArea) return;
  
  contentArea.style.opacity = 0;
  
  setTimeout(() => {
    contentArea.innerHTML = libraryContent[tab] || '<h1>Próximamente</h1>';
    contentArea.style.opacity = 1;
    contentArea.style.transition = 'opacity 0.2s ease';
  }, 100);
}
