    // ===== CHAT SYSTEM =====
    // This system uses Supabase Realtime broadcast for ephemeral player-to-player messaging.
    // Messages are kept in state.chats (max 20 per conversation) and persisted with the game save.

    let _chatInboxChannel = null;
    const _outboxChannels = {};

    function getChatNotificationCount() {
      if (!state.chats) return 0;
      return Object.values(state.chats).reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
    }

    function getUnreadCount(friendId) {
      if (!state.chats || !state.chats[friendId]) return 0;
      return state.chats[friendId].unreadCount || 0;
    }

    async function initGlobalChatListener() {
      if (!currentUser || _chatInboxChannel) return;

      const inboxName = `chat-inbox-${currentUser.id}`;
      _chatInboxChannel = sb.channel(inboxName)
        .on('broadcast', { event: 'chat_msg' }, ({ payload }) => {
          _handleIncomingMessage(payload.senderId, payload.senderName, payload);
        })
        .subscribe();
      
      console.log("[CHAT] Global inbox listener initialized");
    }

    async function openChat(friendId, friendUsername) {
      if (!currentUser) return;

      // Initialize chat state if not exists
      if (!state.chats) state.chats = {};
      if (!state.chats[friendId]) {
        state.chats[friendId] = {
          messages: [],
          username: friendUsername,
          unreadCount: 0
        };
      } else {
        // Mark as read
        state.chats[friendId].unreadCount = 0;
      }

      // Create or show chat UI
      renderChatModal(friendId);
      
      refreshFriendsBadge();
      if (typeof renderFriendsList === 'function') renderFriendsList();
      
      // Save progress (read status)
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
              <span style="font-size:14px;">💬</span>
              <div style="font-family:'Press Start 2P',monospace;font-size:8px;color:#fff;text-shadow:0 2px 4px rgba(0,0,0,0.3);">${chat.username}</div>
            </div>
            <div style="color:#fff;font-size:18px;font-weight:bold;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,0,0,0.1);transition:background 0.2s;" 
              onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'"
              onclick="event.stopPropagation(); closeChat('${friendId}')">×</div>
          </div>
          <div id="chat-messages-${friendId}" class="custom-scrollbar" style="flex:1;padding:12px;overflow-y:auto;background:rgba(0,0,0,0.15);display:flex;flex-direction:column;gap:10px;">
            <div style="color:var(--gray);font-size:10px;text-align:center;margin:15px 0;opacity:0.7;font-style:italic;">Conversación con ${chat.username}</div>
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
      // Initialize state if it didn't exist (background message)
      if (!state.chats[friendId]) {
        state.chats[friendId] = {
          messages: [],
          username: friendUsername || 'Entrenador',
          unreadCount: 0
        };
      }
      
      const chat = state.chats[friendId];
      
      // Prevent duplicates (in case of double delivery or self-send broadcast issues)
      const isDup = chat.messages.some(m => m.timestamp === payload.timestamp && m.text === payload.text);
      if (isDup) return;

      chat.messages.push(payload);
      
      // Keep only last 20 messages
      if (chat.messages.length > 20) {
        chat.messages.shift();
      }
      
      const modal = document.getElementById(`chat-modal-${friendId}`);
      const isVisible = modal && modal.style.display !== 'none' && modal.style.height !== '45px';

      if (isVisible) {
        _updateChatUI(friendId);
        chat.unreadCount = 0;
      } else {
        // Notify user if chat is not open/focused
        if (payload.senderId !== currentUser.id) {
          notify(`Nuevo mensaje de ${chat.username}`, '💬');
          chat.unreadCount = (chat.unreadCount || 0) + 1;
          refreshFriendsBadge();
          if (typeof renderFriendsList === 'function') renderFriendsList();
        }
      }
      
      // Persist the message
      scheduleSave();
    }

    function _updateChatUI(friendId) {
      const el = document.getElementById(`chat-messages-${friendId}`);
      if (!el) return;
      
      const chat = state.chats[friendId];
      
      // Clear except the intro message
      el.innerHTML = '<div style="color:var(--gray);font-size:10px;text-align:center;margin:10px 0;">Comienzo de la conversación amistosa</div>';
      
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
        text: text,
        timestamp: getServerTime()
      };
      
      // Send to recipient's inbox using a cached outbox channel
      if (!_outboxChannels[friendId]) {
        const channel = sb.channel(`chat-inbox-${friendId}`);
        _outboxChannels[friendId] = channel;
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'chat_msg',
              payload: payload
            });
          }
        });
      } else {
        _outboxChannels[friendId].send({
          type: 'broadcast',
          event: 'chat_msg',
          payload: payload
        });
      }

      // Also add to our own local history immediately
      _handleIncomingMessage(friendId, state.chats[friendId].username, payload);
      input.value = '';
    }

    function closeChat(friendId) {
      const ov = document.getElementById(`chat-modal-${friendId}`);
      if (ov) ov.style.display = 'none';
      // We keep the state and channel alive so history is preserved during session
    }

    function cleanupChats() {
      if (_chatInboxChannel) _chatInboxChannel.unsubscribe();
      _chatInboxChannel = null;
      // We don't delete state.chats here because we want persistence
      Object.keys(_outboxChannels).forEach(id => {
        if (_outboxChannels[id]) _outboxChannels[id].unsubscribe();
        delete _outboxChannels[id];
      });
    }
