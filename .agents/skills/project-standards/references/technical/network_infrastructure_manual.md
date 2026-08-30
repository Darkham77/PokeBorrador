# Network Infrastructure & Loopback Routing Manual

> **Scope & Authority**: This manual serves as the Single Source of Truth for network infrastructure configuration, Multi-WAN load balancing, and local loopback routing (Hairpin NAT) on MikroTik RouterOS for Poké Vicio's server and NAS deployments.
> **Sources of Truth**:
> - Supabase Infrastructure: [`supabase_infrastructure_manual.md`](./supabase_infrastructure_manual.md)
> - Database Persistence: [`../rules/database_and_persistence.md`](../rules/database_and_persistence.md)

---

## 1. 🏛️ Network & Infrastructure Context

The project server (hosted on a QNAP NAS with Supabase and Docker) operates under a **Dual WAN (ISP Redundancy)** configuration:

- **ISP-1 (Franco-Net / Ether1)**: Primary ISP handling public internet ingress traffic and publishing QNAP Cloud dynamic domain.
- **ISP-2 (Secondary / Ether2)**: Secondary ISP used for general load balancing and failover tolerance.

---

## 2. ⚠️ Issue: Asymmetric Loopback LAN Routing

When a local device inside the LAN attempts to connect to the server using the public domain `https://francogp.myqnapcloud.com:50001/`:

1. **Hairpin NAT (Loopback)**: The router redirects the request back to the server's local IP (`192.168.88.250`) instead of routing out to the internet.
2. **Mangle Marking Collision (`routing-mark`)**: If MikroTik has a generic routing mark rule for load balancing, local server response traffic can be incorrectly marked and forced out via **ISP-2**.
3. **Consequence**: Connection symmetry breaks (asymmetric routing), causing complete disconnections and preventing LAN devices from accessing the administration panel or game via the public URL.

---

## 3. 🛠️ Resolution (RouterOS Mangle Connection-Mark)

To resolve this permanently without losing routing marks for external internet traffic, restrict MikroTik's marking rule by adding a specific connection-mark filter (`connection-mark=ISP1-input`).

### Filter Logic

- **External Traffic**: Traffic arriving from the internet via `ether1-ISP1-franco` is marked with connection mark `ISP1-input`. Responses **MUST** egress through `ISP-1`.
- **Internal Traffic (LAN)**: Local traffic arriving via Hairpin NAT does **not** carry `ISP1-input` (since it enters via the local bridge interface, not `ether1`). Therefore, the router leaves response routing unaltered, allowing LAN-to-LAN connections at full 1 Gbps speed.

---

## 4. 💻 RouterOS Configuration Commands (MikroTik CLI)

Execute the following Mangle and NAT rules in the MikroTik console:

### Mangle Rule (Connection Filter)

```routeros
/ip firewall mangle
add chain=prerouting src-address=192.168.88.0/24 dst-address-list=!Local \
    connection-mark=ISP1-input action=mark-routing new-routing-mark=to-ISP1 \
    passthrough=yes comment="Surgically mark routing ONLY for external ISP-1 inputs, preserving LAN Loopback"
```

> [!IMPORTANT]
> The key parameter is `connection-mark=ISP1-input`. This ensures `to-ISP1` routing marks ONLY apply to connections originally initiated from outside the network.

### Hairpin NAT Rule

Ensure Hairpin NAT is configured for the server port:

```routeros
/ip firewall nat
add chain=srcnat src-address=192.168.88.0/24 dst-address=192.168.88.250 \
    protocol=tcp dst-port=50001 action=masquerade \
    comment="Hairpin NAT: Allow LAN users to access public NAS URL/port from inside"
```

---

## 5. 🔍 Verification

To verify that local and external traffic are properly segregated, run:

```routeros
/ip firewall mangle print detail
```

Verify that local LAN traffic targeting the QNAP domain does **not** increment byte counters on rules forcing egress via ISP-1/ISP-2 (unless originating from an established external connection).
