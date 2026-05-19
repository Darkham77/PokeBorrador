# Trade and Social Systems Manual (Poké Vicio)

This manual documents the technical operation of the GTS, direct trades, and the friend system.

## 🤝 Escrow Model (Custody)

To guarantee data integrity in a multiplayer environment, Poké Vicio uses a custody model:

1. **Inventory Outflow**: When putting a Pokémon in the GTS or sending it in a trade offer, the asset is removed from the player's inventory and moved to a custody table on the server.
2. **Atomic Claim**: The receiver (or the sender upon cancellation) must manually claim the asset. This process is atomic and requires a prior "Save Flush."
3. **Sync Flush**: Before any social action (sending an offer, posting on GTS), the system forces an atomic save to ensure that the local state matches the server.

---

## 📊 Limits and Quotas (Throttling)

To prevent spam and database overload, the following centralized limits apply:

- **Slots**: Maximum **50 slots** for:
  - Pending friend requests.
  - Active trade offers.
  - Simultaneous GTS postings.
- **Claim Cooldown**: Mandatory waiting time of **5 seconds** between individual claims to avoid race conditions.

---

## 🔄 Security Protocols

- **Snapshot Validation**: When starting a trade, a snapshot of the player's state is taken. Only logical increments are allowed.
- **GTS Integrity**: It is strictly forbidden to allow a player to buy their own listings. UI components MUST disable purchase buttons and change labels to "YOUR OFFER" when `item.seller_id` matches `auth.user.id`.
- **UID Integrity**: The system verifies that the UID of the received Pokémon does not already exist on the player's side before finalizing the transaction.

---

## 💬 Private Messaging Architecture & UX (Persistence & Throttling)

To guarantee reliable message delivery across active sessions and maintain an immersive, non-intrusive UI experience:

1. **Bidirectional Persistence (`chat_messages`)**: Volatile event channels (`BroadcastChannel`) are insufficient for guaranteed delivery if the recipient is offline, reloads the page, or navigates away. All private messages MUST be broadcast in real-time while simultaneously being persisted into the `chat_messages` database table to enable seamless offline history hydration upon login.
2. **Immersive UX & Initial Collapsed State (`isCollapsed: true`)**: When initializing a player's session and fetching historical private messages from the database, chat window states MUST be initialized as collapsed (`isCollapsed: true`) by default in the reactive store. This prevents an invasive, disruptive cascade of multiple modal popups across the screen upon login.
3. **Reactive Notification Badges (`unreadCount`)**: Instead of aggressively forcing chat windows open, background history hydration MUST detect unread incoming messages and increment an individual `unreadCount` tracker. This property reactively feeds global computed summaries (e.g., `totalUnreadChats`) to display elegant notification badges on the HUD `SOCIAL` button and individual friend cards.
4. **Cross-Environment Query Compatibility & Zero-Warning Standards**: To maintain a strict retention limit (e.g., 1000 messages per user) that is fully compatible across both cloud Supabase instances and local SQLite engines (`ProxyQuery`), data pruning queries MUST prioritize standard chained methods such as `.limit(N)` and `.order(...)` over environment-specific functions like `.range()`. Furthermore, explicit type assertions (`as unknown[]`) and `Array.isArray()` checks MUST be employed to satisfy strict static analysis and maintain the project's Zero-Warning TypeScript policy.
