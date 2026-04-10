// ===== CHAT SYSTEM =====
// Friend chat (realtime inbox/outbox) + Global chat (DB persisted, max 50)

let _chatInboxChannel = null;
const _outboxChannels = {};

let _globalChatChannel = null;
let _globalChatInitialized = false;
let _globalChatMessages = [];
const _globalChatSeenIds = new Set();

const GLOBAL_CHAT_MAX_MESSAGES = 50;
const GLOBAL_CHAT_MIN_LEVEL = 10;
const GLOBAL_CHAT_MAX_TEXT = 180;
const GLOBAL_CHAT_ICON = String.fromCodePoint(0x1F4AC);

function getChatNotificationCount() {
  if (!state.chats) return 0;
  return Object.values(state.chats).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
}

function getUnreadCount(friendId) {
  if (!state.chats || !state.chats[friendId]) return 0;
  return state.chats[friendId].unreadCount || 0;
}

async function initGlobalChatListener() {
  if (!currentUser) return;
  await _initFriendChatInbox();
  await _initGlobalChat();
}

async function _initFriendChatInbox() {
  if (!currentUser || _chatInboxChannel) return;

  const inboxName = `chat-inbox-${currentUser.id}`;
  _chatInboxChannel = sb.channel(inboxName)
    .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
      _handleIncomingMessage(payload.senderId, payload.senderName, payload);
    })
    .subscribe();

  console.log('[CHAT] Friend inbox listener initialized');
}

async function openChat(friendId, friendUsername) {
  if (!currentUser) return;

  if (!state.chats) state.chats = {};
  if (!state.chats[friendId]) {
    state.chats[friendId] = {
      messages: [],
      username: friendUsername,
      unreadCount: 0
    };
  } else {
    state.chats[friendId].unreadCount = 0;
  }

  renderChatModal(friendId);

  refreshFriendsBadge();
  if (typeof renderFriendsList === 'function') renderFriendsList();
  scheduleSave();
}

function renderChatModal(friendId) {
  const chat = state.chats[friendId];
  let ov = document.getElementById(`chat-modal-${friendId}`);

  if (!ov) {
    ov = document.createElement('div');
    ov.id = `chat-modal-${friendId}`;
    ov.className = 'chat-modal-overlay';
    ov.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:900;width:300px;background:rgba(13,17,23,0.9);' +
      'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
      'border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,0.7);border:1px solid rgba(199,125,255,0.25);' +
      'overflow:hidden;display:flex;flex-direction:column;transition:height 0.3s cubic-bezier(0.4, 0, 0.2, 1);height:400px;';

    ov.innerHTML = `
      <div style="background:linear-gradient(90deg, var(--purple), #9d4edd);padding:12px 16px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;"
        onclick="const p = this.parentElement; p.style.height = p.style.height === '45px' ? '400px' : '45px'">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:14px;">${GLOBAL_CHAT_ICON}</span>
          <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.3);">${chat.username}</div>
        </div>
        <div style="color:#fff;font-size:18px;font-weight:bold;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,0,0,0.1);transition:background 0.2s;"
          onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'"
          onclick="event.stopPropagation(); closeChat('${friendId}')">x</div>
      </div>
      <div id="chat-messages-${friendId}" class="custom-scrollbar" style="flex:1;padding:12px;overflow-y:auto;background:rgba(0,0,0,0.15);display:flex;flex-direction:column;gap:10px;">
        <div style="color:var(--gray);font-size:10px;text-align:center;margin:15px 0;opacity:0.7;font-style:italic;">Conversacion con ${chat.username}</div>
      </div>
      <div style="padding:12px;background:rgba(255,255,255,0.03);border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:10px;align-items:center;">
        <input id="chat-input-${friendId}" type="text" placeholder="Escribe un mensaje..."
          style="flex:1;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;color:#fff;font-size:13px;outline:none;transition:border-color 0.2s;"
          onfocus="this.style.borderColor='rgba(199,125,255,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"
          onkeydown="if(event.key==='Enter') sendChatMessage('${friendId}')">
        <button onclick="sendChatMessage('${friendId}')"
          style="background:var(--purple);border:none;border-radius:10px;width:38px;height:38px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:transform 0.1s, background 0.2s;box-shadow:0 4px 12px rgba(119,67,219,0.3);"
          onmouseover="this.style.background='#8c52ff';this.style.transform='scale(1.05)'" onmouseout="this.style.background='var(--purple)';this.style.transform='scale(1)'"
          onmousedown="this.style.transform='scale(0.95)'">
          <span style="font-size:18px;transform:rotate(-45deg);margin-left:4px;margin-bottom:2px;">➤</span>
        </button>
      </div>
      <style>
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(199,125,255,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(199,125,255,0.4); }
      </style>
    `;
    document.body.appendChild(ov);
  } else {
    ov.style.display = 'flex';
  }

  _updateChatUI(friendId);
}

function _handleIncomingMessage(friendId, friendUsername, payload) {
  if (!state.chats) state.chats = {};
  if (!state.chats[friendId]) {
    state.chats[friendId] = {
      messages: [],
      username: friendUsername || 'Entrenador',
      unreadCount: 0
    };
  }

  const chat = state.chats[friendId];
  const isDup = chat.messages.some(m => m.timestamp === payload.timestamp && m.text === payload.text);
  if (isDup) return;

  chat.messages.push(payload);
  if (chat.messages.length > 20) chat.messages.shift();

  const modal = document.getElementById(`chat-modal-${friendId}`);
  const isVisible = modal && modal.style.display !== 'none' && modal.style.height !== '45px';

  if (isVisible) {
    _updateChatUI(friendId);
    chat.unreadCount = 0;
  } else {
    if (payload.senderId !== currentUser.id) {
      notify(`Nuevo mensaje de ${chat.username}`, GLOBAL_CHAT_ICON);
      chat.unreadCount = (chat.unreadCount || 0) + 1;
      refreshFriendsBadge();
      if (typeof renderFriendsList === 'function') renderFriendsList();
    }
  }

  scheduleSave();
}

function _updateChatUI(friendId) {
  const el = document.getElementById(`chat-messages-${friendId}`);
  if (!el) return;

  const chat = state.chats[friendId];
  el.innerHTML = '<div style="color:var(--gray);font-size:10px;text-align:center;margin:10px 0;">Comienzo de la conversacion amistosa</div>';

  chat.messages.forEach(msg => {
    const isMe = msg.senderId === currentUser.id;
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `max-width:85%;padding:8px 12px;border-radius:12px;font-size:11px;line-height:1.4;word-break:break-word;` +
      `${isMe ? 'align-self:flex-end;background:rgba(199,125,255,0.2);color:var(--purple-light);border-bottom-right-radius:2px;'
              : 'align-self:flex-start;background:rgba(255,255,255,0.05);color:#eee;border-bottom-left-radius:2px;'}`;
    msgDiv.textContent = msg.text;
    el.appendChild(msgDiv);
  });

  el.scrollTop = el.scrollHeight;
}

async function sendChatMessage(friendId) {
  const input = document.getElementById(`chat-input-${friendId}`);
  const text = input.value.trim();
  if (!text || !currentUser || !state.chats || !state.chats[friendId]) return;

  const payload = {
    senderId: currentUser.id,
    senderName: state.trainer || 'Entrenador',
    text,
    timestamp: getServerTime()
  };

  if (!_outboxChannels[friendId]) {
    const channel = sb.channel(`chat-inbox-${friendId}`);
    _outboxChannels[friendId] = channel;
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'chat_msg', payload });
      }
    });
  } else {
    _outboxChannels[friendId].send({ type: 'broadcast', event: 'chat_msg', payload });
  }

  _handleIncomingMessage(friendId, state.chats[friendId].username, payload);
  input.value = '';
}

function closeChat(friendId) {
  const ov = document.getElementById(`chat-modal-${friendId}`);
  if (ov) ov.style.display = 'none';
}

// ===== GLOBAL CHAT =====

function _getBorderColorForLevel(level) {
  if (level >= 20) return '#ffd700';
  if (level >= 10) return '#c0c0c0';
  return '#cd7f32';
}

function _isMobileForGlobalChat() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function _getGlobalChatBottomOffset() {
  if (!_isMobileForGlobalChat()) return 16;

  const nav = document.querySelector('.nav');
  if (!nav) return 88;

  const styles = window.getComputedStyle(nav);
  const visible = styles.display !== 'none' && styles.visibility !== 'hidden';
  if (!visible) return 88;

  return Math.round(nav.getBoundingClientRect().height + 10);
}

function _positionGlobalChatUi() {
  const toggle = document.getElementById('global-chat-toggle');
  const panel = document.getElementById('global-chat-panel');
  if (!toggle || !panel) return;

  const baseBottom = _getGlobalChatBottomOffset();
  toggle.style.bottom = `${baseBottom}px`;
  panel.style.bottom = `${baseBottom + 54}px`;

  if (_isMobileForGlobalChat()) {
    panel.style.left = '10px';
    panel.style.width = 'calc(100vw - 20px)';
    panel.style.maxWidth = 'unset';
    panel.style.height = 'min(56vh, 430px)';
  } else {
    panel.style.left = '14px';
    panel.style.width = '360px';
    panel.style.maxWidth = '360px';
    panel.style.height = '430px';
  }
}

function _ensureGlobalChatStyles() {
  if (document.getElementById('global-chat-style')) return;

  const style = document.createElement('style');
  style.id = 'global-chat-style';
  style.textContent = `
    #global-chat-root { position: fixed; left: 0; bottom: 0; z-index: 1600; pointer-events: none; }
    #global-chat-root * { box-sizing: border-box; }

    #global-chat-toggle {
      position: fixed;
      left: 14px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 42px;
      padding: 0 12px;
      border-radius: 999px;
      border: 1px solid rgba(199,125,255,0.35);
      background: rgba(10,14,22,0.9);
      color: #fff;
      font-family: 'Press Start 2P', monospace;
      font-size: 9px;
      cursor: pointer;
      box-shadow: 0 8px 26px rgba(0,0,0,0.45);
      pointer-events: auto;
      user-select: none;
    }

    #global-chat-panel {
      position: fixed;
      left: 14px;
      width: 360px;
      height: 430px;
      border-radius: 18px;
      border: 1px solid rgba(199,125,255,0.3);
      background: rgba(10,14,22,0.95);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 18px 40px rgba(0,0,0,0.55);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      pointer-events: auto;
      transition: opacity 0.18s ease, transform 0.18s ease;
    }

    #global-chat-panel.gc-hidden {
      opacity: 0;
      transform: translateY(12px);
      pointer-events: none;
    }

    .gc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      background: linear-gradient(90deg, rgba(119,67,219,0.3), rgba(59,139,255,0.25));
    }

    .gc-title {
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      color: #fff;
      letter-spacing: 0.3px;
    }

    .gc-close {
      width: 24px;
      height: 24px;
      border-radius: 999px;
      border: none;
      background: rgba(0,0,0,0.25);
      color: #fff;
      cursor: pointer;
      font-weight: 700;
    }

    #global-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      scrollbar-width: thin;
    }

    #global-chat-messages::-webkit-scrollbar { width: 6px; }
    #global-chat-messages::-webkit-scrollbar-thumb { background: rgba(199,125,255,0.35); border-radius: 999px; }

    .gc-row {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    .gc-avatar {
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      border-radius: 999px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255,255,255,0.08);
    }

    .gc-msg {
      min-width: 0;
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      padding: 6px 8px;
      color: #e5e7eb;
      font-size: 11px;
      line-height: 1.35;
      word-break: break-word;
    }

    .gc-line {
      display: inline;
    }

    .gc-nick {
      border: none;
      background: transparent;
      color: #93c5fd; /* Fallback azul claro */
      font-family: 'Press Start 2P', monospace;
      font-weight: 400; /* La fuente pixel ya es gruesa */
      padding: 0;
      margin: 0;
      cursor: pointer;
      font-size: 11px; /* Base 11px pero con fuente pixel */
      text-shadow: 0 2px 4px rgba(0,0,0,0.3);
      transition: filter 0.2s;
      vertical-align: middle;
    }
    .gc-nick:hover { filter: brightness(1.2); }
    /* Fix para que los estilos cosméticos (nt-*) no sean tapados por el color base */
    .gc-nick[class*="nt-"] { color: transparent !important; }

    .gc-colon { color: #9ca3af; font-weight: 700; margin-right: 3px; }
    .gc-time { color: #6b7280; font-size: 9px; margin-top: 2px; }

    .gc-compose {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(255,255,255,0.02);
    }

    .gc-input-row {
      display: flex;
      gap: 6px;
    }

    #global-chat-input {
      flex: 1;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(0,0,0,0.3);
      color: #fff;
      font-size: 12px;
      padding: 8px 10px;
      outline: none;
    }

    #global-chat-send {
      border: none;
      border-radius: 10px;
      min-width: 80px;
      background: rgba(119,67,219,0.9);
      color: #fff;
      font-family: 'Press Start 2P', monospace;
      font-size: 8px;
      cursor: pointer;
    }

    #global-chat-send:disabled,
    #global-chat-input:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    #global-chat-hint {
      color: #9ca3af;
      font-size: 10px;
      line-height: 1.3;
      min-height: 14px;
    }

    .gc-empty {
      color: #9ca3af;
      font-size: 11px;
      text-align: center;
      margin-top: 12px;
      opacity: 0.8;
    }

    @media (max-width: 900px) {
      #global-chat-toggle {
        width: 48px;
        height: 48px;
        padding: 0;
        justify-content: center;
        border-radius: 14px;
      }

      #global-chat-toggle .gc-label {
        display: none;
      }

      #global-chat-panel {
        width: calc(100vw - 20px);
        left: 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

function _ensureGlobalChatUi() {
  if (document.getElementById('global-chat-root')) return;

  _ensureGlobalChatStyles();

  const root = document.createElement('div');
  root.id = 'global-chat-root';
  root.innerHTML = `
    <button id="global-chat-toggle" type="button" aria-label="Abrir chat global">
      <span class="gc-icon">${GLOBAL_CHAT_ICON}</span>
      <span class="gc-label">Chat</span>
    </button>

    <section id="global-chat-panel" class="gc-hidden" aria-live="polite">
      <header class="gc-header">
        <div class="gc-title">CHAT GLOBAL</div>
        <button id="global-chat-close" type="button" class="gc-close" aria-label="Cerrar">x</button>
      </header>
      <div id="global-chat-messages"></div>
      <div class="gc-compose">
        <div class="gc-input-row">
          <input id="global-chat-input" maxlength="${GLOBAL_CHAT_MAX_TEXT}" placeholder="Escribe en el chat global..." />
          <button id="global-chat-send" type="button">Enviar</button>
        </div>
        <div id="global-chat-hint"></div>
      </div>
    </section>
  `;

  document.body.appendChild(root);

  const toggleBtn = document.getElementById('global-chat-toggle');
  const closeBtn = document.getElementById('global-chat-close');
  const sendBtn = document.getElementById('global-chat-send');
  const input = document.getElementById('global-chat-input');

  toggleBtn?.addEventListener('click', () => toggleGlobalChat());
  closeBtn?.addEventListener('click', () => toggleGlobalChat(false));
  sendBtn?.addEventListener('click', () => sendGlobalChatMessage());
  input?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') sendGlobalChatMessage();
  });

  window.addEventListener('resize', _positionGlobalChatUi);
  _positionGlobalChatUi();
  _refreshGlobalChatComposerState();
}

async function _initGlobalChat() {
  if (!currentUser || _globalChatInitialized) return;

  _ensureGlobalChatUi();
  await _loadGlobalChatHistory();

  _globalChatChannel = sb.channel('global-chat-room')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'global_chat_messages'
    }, async ({ new: row }) => {
      // If row is missing metadata, try to fetch it from profiles immediately
      if (!row.username || !row.nick_style) {
        const { data: prof } = await sb.from('profiles').select('*').eq('id', row.user_id).single();
        if (prof) row.profiles = prof;
      }
      _appendGlobalChatMessage(row, false);
    })
    .subscribe();

  _globalChatInitialized = true;
  console.log('[CHAT] Global chat initialized');
}

async function _loadGlobalChatHistory() {
  const { data, error } = await sb
    .from('global_chat_messages')
    .select('*, profiles:user_id(username, nick_style, avatar_style, trainer_level, player_class)')
    .order('created_at', { ascending: false })
    .limit(GLOBAL_CHAT_MAX_MESSAGES);

  if (error) {
    console.warn('[CHAT] Could not load global history:', error.message);
    return;
  }

  _globalChatMessages = (data || []).reverse();
  _globalChatSeenIds.clear();
  _globalChatMessages.forEach(m => {
    if (m && m.id !== undefined && m.id !== null) _globalChatSeenIds.add(String(m.id));
  });

  _renderGlobalChatMessages(true);
}

function _formatGlobalChatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function _globalChatAvatarHtml(msg) {
  const level = Number(msg?.trainer_level || 1);
  const borderColor = _getBorderColorForLevel(level);

  if (typeof getAvatarHtml === 'function' && typeof PLAYER_CLASSES !== 'undefined') {
    const clsId = msg?.player_class || null;
    const cls = clsId ? PLAYER_CLASSES[clsId] : null;
    return getAvatarHtml(cls, borderColor, 26, msg.avatar_style);
  }

  return '<div style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.15);font-size:13px;">👤</div>';
}

function _appendGlobalChatMessage(msg, forceScroll) {
  if (!msg) return;

  const idKey = (msg.id !== undefined && msg.id !== null) ? String(msg.id) : null;
  if (idKey && _globalChatSeenIds.has(idKey)) return;
  if (idKey) _globalChatSeenIds.add(idKey);

  _globalChatMessages.push(msg);
  if (_globalChatMessages.length > GLOBAL_CHAT_MAX_MESSAGES) {
    _globalChatMessages = _globalChatMessages.slice(-GLOBAL_CHAT_MAX_MESSAGES);
  }

  _renderGlobalChatMessages(!!forceScroll);
}

function _renderGlobalChatMessages(forceBottom) {
  const list = document.getElementById('global-chat-messages');
  if (!list) return;

  const nearBottom = (list.scrollHeight - list.scrollTop - list.clientHeight) < 42;
  list.innerHTML = '';

  if (!_globalChatMessages.length) {
    const empty = document.createElement('div');
    empty.className = 'gc-empty';
    empty.textContent = 'No hay mensajes todavia.';
    list.appendChild(empty);
  }

  _globalChatMessages.forEach(msg => {
    const row = document.createElement('div');
    row.className = 'gc-row';

    const avatar = document.createElement('div');
    avatar.className = 'gc-avatar';
    
    // Fallback data from profile if message is old/incomplete
    const msgCopy = { ...msg };
    if (!msgCopy.username && msg.profiles?.username) msgCopy.username = msg.profiles.username;
    if (!msgCopy.nick_style && msg.profiles?.nick_style) msgCopy.nick_style = msg.profiles.nick_style;
    if (!msgCopy.avatar_style && msg.profiles?.avatar_style) msgCopy.avatar_style = msg.profiles.avatar_style;
    if (!msgCopy.trainer_level && msg.profiles?.trainer_level) msgCopy.trainer_level = msg.profiles.trainer_level;
    if (!msgCopy.player_class && msg.profiles?.player_class) msgCopy.player_class = msg.profiles.player_class;

    avatar.innerHTML = _globalChatAvatarHtml(msgCopy);

    const body = document.createElement('div');
    body.className = 'gc-msg';

    const line = document.createElement('div');
    line.className = 'gc-line';

    const nickText = (msgCopy.username || 'Entrenador').trim() || 'Entrenador';
    const nickBtn = document.createElement('span');
    nickBtn.className = 'gc-nick' + (msgCopy.nick_style ? ' ' + msgCopy.nick_style : '');
    nickBtn.style.cursor = 'pointer';
    nickBtn.textContent = nickText;
    nickBtn.addEventListener('click', () => {
      openGlobalChatProfile(
        msgCopy.user_id,
        nickText,
        msgCopy.player_class || null,
        Number(msgCopy.trainer_level || 1)
      );
    });

    const colon = document.createElement('span');
    colon.className = 'gc-colon';
    colon.textContent = ': ';

    const text = document.createElement('span');
    text.textContent = msg.message || '';

    line.appendChild(nickBtn);
    line.appendChild(colon);
    line.appendChild(text);

    const time = document.createElement('div');
    time.className = 'gc-time';
    time.textContent = _formatGlobalChatTime(msg.created_at);

    body.appendChild(line);
    body.appendChild(time);

    row.appendChild(avatar);
    row.appendChild(body);

    list.appendChild(row);
  });

  if (forceBottom || nearBottom) {
    list.scrollTop = list.scrollHeight;
  }
}

function _refreshGlobalChatComposerState() {
  const input = document.getElementById('global-chat-input');
  const sendBtn = document.getElementById('global-chat-send');
  const hint = document.getElementById('global-chat-hint');
  if (!input || !sendBtn || !hint) return;

  const level = Number(state?.trainerLevel || 1);
  const canWrite = level >= GLOBAL_CHAT_MIN_LEVEL;

  input.disabled = !canWrite;
  sendBtn.disabled = !canWrite;

  if (canWrite) {
    hint.textContent = `Nivel ${level}. Puedes hablar en global.`;
  } else {
    hint.textContent = `Necesitas nivel ${GLOBAL_CHAT_MIN_LEVEL} para escribir (actual: ${level}).`;
  }
}

function toggleGlobalChat(forceState) {
  const panel = document.getElementById('global-chat-panel');
  if (!panel) return;

  const shouldOpen = typeof forceState === 'boolean'
    ? forceState
    : panel.classList.contains('gc-hidden');

  panel.classList.toggle('gc-hidden', !shouldOpen);

  if (shouldOpen) {
    _refreshGlobalChatComposerState();
    _renderGlobalChatMessages(true);
    if (!_isMobileForGlobalChat()) {
      document.getElementById('global-chat-input')?.focus();
    }
  }
}

async function sendGlobalChatMessage() {
  if (!currentUser) return;

  const level = Number(state?.trainerLevel || 1);
  if (level < GLOBAL_CHAT_MIN_LEVEL) {
    notify(`Necesitas nivel ${GLOBAL_CHAT_MIN_LEVEL} para usar el chat global.`, '🔒');
    _refreshGlobalChatComposerState();
    return;
  }

  const input = document.getElementById('global-chat-input');
  const sendBtn = document.getElementById('global-chat-send');
  if (!input || !sendBtn) return;

  const text = (input.value || '').trim();
  if (!text) return;

  const message = text.slice(0, GLOBAL_CHAT_MAX_TEXT);

  input.disabled = true;
  sendBtn.disabled = true;

  try {
    const payload = {
      user_id: currentUser.id,
      username: state?.trainer || currentUser?.user_metadata?.username || 'Entrenador',
      message,
      player_class: state?.playerClass || null,
      trainer_level: level,
      nick_style: state.nick_style || null,
      avatar_style: state.avatar_style || null
    };

    const { data, error } = await sb
      .from('global_chat_messages')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      notify('No se pudo enviar el mensaje global.', '❌');
      console.warn('[CHAT] sendGlobalChatMessage:', error.message);
      return;
    }

    if (data) _appendGlobalChatMessage(data, true);
    input.value = '';
  } finally {
    _refreshGlobalChatComposerState();
  }
}

async function openGlobalChatProfile(userId, fallbackUsername, fallbackClass, fallbackLevel) {
  if (!userId) return;

  document.getElementById('global-chat-profile-modal')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'global-chat-profile-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:1700;display:flex;align-items:center;justify-content:center;padding:16px;';

  const card = document.createElement('div');
  card.style.cssText = 'width:min(360px,95vw);background:#101822;border:1px solid rgba(199,125,255,0.28);border-radius:18px;padding:16px;box-shadow:0 18px 40px rgba(0,0,0,0.55);';
  card.innerHTML = '<div style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:#d8b4fe;margin-bottom:12px;">PERFIL</div>';

  const body = document.createElement('div');
  body.style.cssText = 'color:#e5e7eb;font-size:12px;';
  body.textContent = 'Cargando...';
  card.appendChild(body);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = 'Cerrar';
  closeBtn.style.cssText = 'margin-top:14px;width:100%;padding:10px;border:none;border-radius:10px;background:rgba(255,255,255,0.08);color:#cbd5e1;cursor:pointer;font-size:12px;';
  closeBtn.addEventListener('click', () => overlay.remove());
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.remove();
  });
  document.body.appendChild(overlay);

  const [profileRes, saveRes] = await Promise.all([
    sb.from('profiles').select('id,username,nick_style,avatar_style').eq('id', userId).maybeSingle(),
    sb.from('game_saves').select('save_data').eq('user_id', userId).maybeSingle()
  ]);

  const profile = profileRes?.data || null;
  const save = saveRes?.data?.save_data || null;

  const username = profile?.username || fallbackUsername || 'Entrenador';
  const playerClass = save?.playerClass || fallbackClass || null;
  const trainerLevel = Number(save?.trainerLevel || fallbackLevel || 1);
  const nickStyle = profile?.nick_style || null;
  const avatarStyle = profile?.avatar_style || null;

  let relation = null;
  if (currentUser && userId !== currentUser.id) {
    const [outRes, inRes] = await Promise.all([
      sb.from('friendships').select('*').eq('requester_id', currentUser.id).eq('addressee_id', userId).maybeSingle(),
      sb.from('friendships').select('*').eq('requester_id', userId).eq('addressee_id', currentUser.id).maybeSingle()
    ]);
    relation = outRes?.data || inRes?.data || null;
  }

  const avatarWrap = document.createElement('div');
  avatarWrap.style.cssText = 'display:flex;align-items:center;justify-content:center;margin-bottom:12px;';
  avatarWrap.innerHTML = _globalChatAvatarHtml({ 
    player_class: playerClass, 
    trainer_level: trainerLevel,
    avatar_style: avatarStyle
  });

  const nameEl = document.createElement('div');
  nameEl.className = nickStyle ? nickStyle : '';
  nameEl.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:6px;text-align:center;';
  nameEl.textContent = username;

  const classLabel = (typeof PLAYER_CLASSES !== 'undefined' && playerClass && PLAYER_CLASSES[playerClass])
    ? PLAYER_CLASSES[playerClass].name
    : (playerClass || 'Sin clase');

  const metaEl = document.createElement('div');
  metaEl.style.cssText = 'font-size:11px;color:#94a3b8;text-align:center;';
  metaEl.textContent = `Nivel ${trainerLevel} · ${classLabel}`;

  const actionWrap = document.createElement('div');
  actionWrap.style.cssText = 'margin-top:14px;';

  if (currentUser && userId === currentUser.id) {
    const selfBadge = document.createElement('div');
    selfBadge.style.cssText = 'padding:10px;border-radius:10px;background:rgba(59,139,255,0.12);color:#93c5fd;font-size:11px;text-align:center;';
    selfBadge.textContent = 'Este perfil es el tuyo.';
    actionWrap.appendChild(selfBadge);
  } else if (!relation) {
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = 'Enviar solicitud de amistad';
    addBtn.style.cssText = 'width:100%;padding:10px;border:none;border-radius:10px;background:rgba(199,125,255,0.2);color:#d8b4fe;cursor:pointer;font-size:11px;font-weight:700;';
    addBtn.addEventListener('click', () => sendFriendRequest(userId, username, addBtn));
    actionWrap.appendChild(addBtn);
  } else if (relation.status === 'accepted') {
    const ok = document.createElement('div');
    ok.style.cssText = 'padding:10px;border-radius:10px;background:rgba(107,203,119,0.12);color:#86efac;font-size:11px;text-align:center;';
    ok.textContent = 'Ya son amigos.';
    actionWrap.appendChild(ok);
  } else if (relation.status === 'pending' && relation.requester_id === currentUser.id) {
    const pending = document.createElement('div');
    pending.style.cssText = 'padding:10px;border-radius:10px;background:rgba(255,217,61,0.12);color:#fde68a;font-size:11px;text-align:center;';
    pending.textContent = 'Solicitud enviada.';
    actionWrap.appendChild(pending);
  } else if (relation.status === 'pending' && relation.addressee_id === currentUser.id) {
    const acceptBtn = document.createElement('button');
    acceptBtn.type = 'button';
    acceptBtn.textContent = 'Aceptar solicitud de amistad';
    acceptBtn.style.cssText = 'width:100%;padding:10px;border:none;border-radius:10px;background:rgba(107,203,119,0.2);color:#bbf7d0;cursor:pointer;font-size:11px;font-weight:700;';
    acceptBtn.addEventListener('click', async () => {
      await respondFriend(relation.id, 'accepted');
      overlay.remove();
    });
    actionWrap.appendChild(acceptBtn);
  }

  body.innerHTML = '';
  body.appendChild(avatarWrap);
  body.appendChild(nameEl);
  body.appendChild(metaEl);
  body.appendChild(actionWrap);
}

function cleanupChats() {
  if (_chatInboxChannel) _chatInboxChannel.unsubscribe();
  _chatInboxChannel = null;

  Object.keys(_outboxChannels).forEach(id => {
    if (_outboxChannels[id]) _outboxChannels[id].unsubscribe();
    delete _outboxChannels[id];
  });

  if (_globalChatChannel) _globalChatChannel.unsubscribe();
  _globalChatChannel = null;
  _globalChatInitialized = false;
  _globalChatMessages = [];
  _globalChatSeenIds.clear();

  document.getElementById('global-chat-profile-modal')?.remove();
  document.getElementById('global-chat-root')?.remove();
}
