/**
 * js/27_cosmetics.js
 * Sistema de Personalización de Perfil (Nick y Avatar)
 */

const NICK_STYLES = [
    { id: null, name: 'Normal', class: '' },
    { id: 'nt-gold', name: 'Oro Radiante', class: 'nt-gold' },
    { id: 'nt-silver', name: 'Plata Pulida', class: 'nt-silver' },
    { id: 'nt-bronze', name: 'Bronce Antiguo', class: 'nt-bronze' },
    { id: 'nt-spark', name: 'Relámpago', class: 'nt-spark' },
    { id: 'nt-fire', name: 'Fuego Eterno', class: 'nt-fire' },
    { id: 'nt-water', name: 'Marea Azul', class: 'nt-water' },
    { id: 'nt-dark', name: 'Sombra Abisal', class: 'nt-dark' },
    { id: 'nt-royal', name: 'Realeza', class: 'nt-royal' },
    { id: 'nt-ghost', name: 'Espectral', class: 'nt-ghost' }
];

const AVATAR_STYLES = [
    { id: null, name: 'Sin Borde', class: '' },
    { id: 'av-water', name: 'Aura Celeste', class: 'av-water' },
    { id: 'av-fire', name: 'Fuego Infernal', class: 'av-fire' },
    { id: 'av-ice', name: 'Hielo Ártico', class: 'av-ice' },
    { id: 'av-dragon', name: 'Furia Dragón', class: 'av-dragon' },
    { id: 'av-legend', name: 'Resplandor Legendario', class: 'av-legend' },
    { id: 'av-master', name: 'Maestro Definitivo', class: 'av-master' },
    { id: 'av-ghost', name: 'Neblina Espectral', class: 'av-ghost' }
];

function openProfileEditor() {
    if (document.getElementById('profile-editor-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'profile-editor-overlay';
    overlay.className = 'custom-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(10px);';

    const modal = document.createElement('div');
    modal.style.cssText = 'width:min(450px,95vw);background:#1a2235;border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:24px;position:relative;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);';

    modal.innerHTML = `
        <div style="font-family:'Press Start 2P',monospace;font-size:12px;color:var(--yellow);margin-bottom:24px;text-align:center;">CONFIGURACIÓN DE PERFIL</div>
        
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:20px;text-align:center;">
            <div style="font-size:32px;margin-bottom:12px;">✨</div>
            <div style="color:#fff;font-size:14px;font-weight:700;margin-bottom:8px;">Estilos Personalizados</div>
            <p style="color:#94a3b8;font-size:12px;Line-height:1.6;margin:0;">
                ¡PRÓXIMAMENTE!<br>
                Estamos preparando nicks brillantes y bordes legendarios para futuras actualizaciones.
            </p>
        </div>

        <button id="close-profile-editor" style="margin-top:24px;width:100%;padding:14px;border:none;border-radius:12px;background:linear-gradient(90deg, #3b82f6, #2563eb);color:#fff;font-weight:700;cursor:pointer;font-size:13px;transition:transform 0.2s;">
            Aceptar
        </button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.getElementById('close-profile-editor').onclick = () => overlay.remove();
}

function previewCosmetic(type, id) {
    const ov = document.getElementById('profile-editor-overlay');
    if (!ov) return;
    
    const idVal = (id === 'null' || id === 'undefined') ? null : id;
    
    if (type === 'nick') {
        ov._tempNick = idVal;
        const nickEl = document.getElementById('preview-nick');
        nickEl.className = idVal || '';
    } else {
        ov._tempAvatar = idVal;
        // Re-render avatar with temp style
        // Need to temporarily set state.avatar_style to get the class in getAvatarHtml
        const old = state.avatar_style;
        state.avatar_style = idVal;
        
        const playerClassId = state.playerClass || null;
        const playerClass = PLAYER_CLASSES[playerClassId] || null;
        document.getElementById('preview-avatar-container').innerHTML = getAvatarHtml(playerClass, '#3b82f6', 64, idVal);
        
        state.avatar_style = old; // Restore state
    }
    
    // UI update for selections
    ov.querySelectorAll(`.cosmetic-option[data-type="${type}"]`).forEach(el => {
        const isActive = el.getAttribute('data-id') === String(id);
        el.style.background = isActive ? (type === 'nick' ? 'rgba(255,217,61,0.1)' : 'rgba(59,130,246,0.1)') : 'rgba(255,255,255,0.05)';
        el.style.borderColor = isActive ? (type === 'nick' ? 'var(--yellow)' : 'var(--blue)') : 'rgba(255,255,255,0.1)';
    });
}

async function saveCosmeticProfile() {
    const ov = document.getElementById('profile-editor-overlay');
    if (!ov) return;
    
    state.nick_style = ov._tempNick;
    state.avatar_style = ov._tempAvatar;
    
    notify('Perfil actualizado correctamente', '✨');
    ov.remove();
    
    // Trigger UI updates
    updateHud();
    if (typeof updateProfilePanel === 'function') updateProfilePanel(window.currentUser, { username: state.trainer });
    
    // Sync with database
    if (typeof scheduleSave === 'function') scheduleSave();
    else if (typeof saveGame === 'function') saveGame(false);
}
