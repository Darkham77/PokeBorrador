/**
 * GLOBAL ERROR HANDLER
 * Captura fallos inesperados y los muestra al usuario de forma clara.
 */

window.onerror = function(message, source, lineno, colno, error) {
    showGameError(error || message, {
        source,
        lineno,
        colno,
        type: 'Uncaught Error'
    });
    return false; // Seguir propagando hacia la consola
};

window.onunhandledrejection = function(event) {
    showGameError(event.reason, {
        type: 'Unhandled Promise Rejection'
    });
};

/**
 * Muestra el modal de error
 * @param {Error|string} error El objeto de error o mensaje
 * @param {Object} context Información adicional
 */
function showGameError(error, context = {}) {
    console.error("Critical Game Error:", error, context);

    // Evitar duplicados inmediatos
    if (document.getElementById('game-error-overlay')) return;

    const errorModal = document.createElement('div');
    errorModal.id = 'game-error-overlay';
    errorModal.className = 'error-overlay';

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No hay stack trace disponible.';
    
    // Obtener contexto del juego si está disponible
    let gameStateContext = '';
    try {
        if (typeof state !== 'undefined') {
            gameStateContext = `
                <div class="error-context-item"><strong>Entrenador:</strong> ${state.trainer || 'N/A'} (Nv. ${state.trainerLevel || 0})</div>
                <div class="error-context-item"><strong>Escena Activa:</strong> ${document.querySelector('.screen.active')?.id || 'N/A'}</div>
                <div class="error-context-item"><strong>Medallas:</strong> ${state.badges || 0}</div>
                <div class="error-context-item"><strong>Plataforma:</strong> ${navigator.platform}</div>
            `;
        }
    } catch(e) {}

    errorModal.innerHTML = `
        <div class="error-card">
            <div class="error-header">
                <span class="error-icon">⚠️</span>
                <div class="error-title">ERROR EN EL JUEGO</div>
            </div>
            
            <div class="error-body">
                <p class="error-intro">¡Uy! Algo salió mal. Pasale una captura de esto al desarrollador para que pueda arreglarlo.</p>
                
                <div class="error-message-box">
                    <strong>Mensaje:</strong> ${errorMessage}
                </div>

                <div class="error-user-action-container" style="margin-top: 15px; margin-bottom: 15px;">
                    <div class="error-sub-title" style="margin-bottom: 5px;">¿QUÉ ESTABAS HACIENDO?</div>
                    <textarea id="error-user-action" placeholder="Ej: Estaba por cambiar de Pokémon en batalla..." style="width: 100%; height: 60px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 8px; border-radius: 4px; resize: vertical; font-family: inherit; font-size: 0.9em; box-sizing: border-box;"></textarea>
                    <div style="font-size: 0.8em; color: #aaa; margin-top: 4px;">Esta información nos ayuda a reproducir y arreglar el error más rápido.</div>
                </div>

                <div class="error-stack-wrap">
                    <div class="error-sub-title">DETALLES TÉCNICOS:</div>
                    <pre class="error-stack">${errorStack}</pre>
                </div>

                <div class="error-game-context">
                    <div class="error-sub-title">ESTADO DEL JUEGO:</div>
                    ${gameStateContext}
                    <div class="error-context-item"><strong>Tipo:</strong> ${context.type || 'Desconocido'}</div>
                    ${context.lineno ? `<div class="error-context-item"><strong>Línea:</strong> ${context.lineno}:${context.colno}</div>` : ''}
                </div>
            </div>

            <div class="error-footer">
                <button class="error-btn copy-btn" onclick="copyErrorToClipboard()">
                    <i class="fas fa-copy"></i> COPIAR ERROR
                </button>
                <button class="error-btn reload-btn" onclick="location.reload()">
                    <i class="fas fa-sync"></i> REINICIAR JUEGO
                </button>
                <button class="error-btn close-btn" onclick="document.getElementById('game-error-overlay').remove()">
                    ✕ CERRAR
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(errorModal);
}

/**
 * Copia el error al portapapeles con formato
 */
function copyErrorToClipboard() {
    const errorTitle = "POKEBORRADOR ERROR REPORT";
    const errorMessage = document.querySelector('.error-message-box').innerText;
    const errorStack = document.querySelector('.error-stack').innerText;
    const context = Array.from(document.querySelectorAll('.error-context-item'))
                         .map(el => el.innerText).join('\n');
    
    const userActionElement = document.getElementById('error-user-action');
    const userAction = userActionElement && userActionElement.value.trim() ? userActionElement.value.trim() : "No especificado";
    
    const fullText = `${errorTitle}\n\n¿QUÉ ESTABA HACIENDO EL JUGADOR?\n${userAction}\n\n${errorMessage}\n\nCONTEXTO:\n${context}\n\nSTACK TRACE:\n${errorStack}`;
    
    navigator.clipboard.writeText(fullText).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> ¡COPIADO!';
        btn.style.background = 'var(--green)';
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Falló al copiar:', err);
        alert('No se pudo copiar automáticamente. Por favor, sacá una captura.');
    });
}
