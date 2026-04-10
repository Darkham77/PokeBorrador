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
    const ov = document.createElement('div');
    ov.id = 'profile-editor-overlay';
    ov.className = 'custom-modal-overlay';
    ov.style.zIndex = '10005';
    
    // Preview state template
    const currentNick = state.trainer || 'Entrenador';
    const playerClassId = state.playerClass || null;
    const playerClass = PLAYER_CLASSES[playerClassId] || null;
    const borderColor = '#3b82f6'; // Default if no level logic etc

    ov.innerHTML = `
        <div class="custom-modal-content" style="max-width: 500px; padding: 25px; background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
                <h2 style="font-family:'Press Start 2P',monospace; font-size:12px; color:var(--yellow); margin:0;">EDITAR PERFIL</h2>
                <button onclick="this.closest('#profile-editor-overlay').remove()" style="background:none; border:none; color:var(--gray); cursor:pointer; font-size:20px;">&times;</button>
            </div>

            <!-- PREVIEW AREA -->
            <div style="background:rgba(0,0,0,0.3); border-radius:18px; padding:20px; margin-bottom:25px; display:flex; flex-direction:column; align-items:center; gap:15px; border:1px solid rgba(255,255,255,0.05);">
                <div style="font-size:8px; color:var(--gray); text-transform:uppercase; font-family:'Press Start 2P',monospace;">Vista Previa</div>
                <div id="cosmetic-preview" style="display:flex; align-items:center; gap:20px; padding:15px; background:rgba(255,255,255,0.02); border-radius:14px; width:100\%; box-sizing:border-box;">
                    <div id="preview-avatar-container">
                        ${getAvatarHtml(playerClass, borderColor, 64)}
                    </div>
                    <div style="flex:1;">
                        <div id="preview-nick" class="${state.nick_style || ''}" style="font-family:'Press Start 2P',monospace; font-size:14px; margin-bottom:5px;">${currentNick}</div>
                        <div style="font-size:10px; color:var(--gray);">Nivel ${state.trainerLevel} - ${playerClass?.name || 'Clase'}</div>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px;">
                <!-- NICK STYLES -->
                <div>
                    <label style="display:block; font-size:10px; color:var(--gray); margin-bottom:10px; font-weight:bold;">ESTILO DE NOMBRE</label>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height: 250px; overflow-y:auto; padding-right:5px;">
                        ${NICK_STYLES.map(s => `
                            <div onclick="previewCosmetic('nick', '${s.id}')" style="background:${state.nick_style === s.id ? 'rgba(255,217,61,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${state.nick_style === s.id ? 'var(--yellow)' : 'rgba(255,255,255,0.1)'}; padding:10px; border-radius:10px; cursor:pointer; transition:all 0.2s;" class="cosmetic-option ${state.nick_style === s.id ? 'active' : ''}" data-type="nick" data-id="${s.id}">
                                <div class="${s.class}" style="font-size:11px; font-weight:bold;">${s.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- AVATAR STYLES -->
                <div>
                    <label style="display:block; font-size:10px; color:var(--gray); margin-bottom:10px; font-weight:bold;">BORDE DE AVATAR</label>
                    <div style="display:flex; flex-direction:column; gap:8px; max-height: 250px; overflow-y:auto; padding-right:5px;">
                        ${AVATAR_STYLES.map(s => `
                            <div onclick="previewCosmetic('avatar', '${s.id}')" style="background:${state.avatar_style === s.id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)'}; border:1px solid ${state.avatar_style === s.id ? 'var(--blue)' : 'rgba(255,255,255,0.1)'}; padding:10px; border-radius:10px; cursor:pointer; transition:all 0.2s;" class="cosmetic-option ${state.avatar_style === s.id ? 'active' : ''}" data-type="avatar" data-id="${s.id}">
                                <div style="font-size:11px; color:#fff;">${s.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div style="margin-top:30px; display:flex; gap:10px;">
                <button onclick="this.closest('#profile-editor-overlay').remove()" style="flex:1; padding:15px; border-radius:14px; background:rgba(255,255,255,0.05); color:var(--gray); border:none; font-family:'Press Start 2P',monospace; font-size:9px; cursor:pointer;">CANCELAR</button>
                <button onclick="saveCosmeticProfile()" style="flex:2; padding:15px; border-radius:14px; background:var(--yellow); color:var(--darker); border:none; font-family:'Press Start 2P',monospace; font-size:9px; cursor:pointer; font-weight:bold;">GUARDAR CAMBIOS</button>
            </div>
        </div>
    `;

    document.body.appendChild(ov);
    
    // Store temp selections for preview
    ov._tempNick = state.nick_style;
    ov._tempAvatar = state.avatar_style;
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
        document.getElementById('preview-avatar-container').innerHTML = getAvatarHtml(playerClass, '#3b82f6', 64);
        
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
