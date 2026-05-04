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
- **UID Integrity**: The system verifies that the UID of the received Pokémon does not already exist on the player's side before finalizing the transaction.
