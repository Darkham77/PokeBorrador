# Manual de Ruteo y Redes MikroTik (Poké Vicio)

Este manual es la fuente de verdad definitiva para la configuración de infraestructura de red, balanceo de carga (Multi-WAN) y ruteo local (Hairpin NAT / Loopback) en routers MikroTik RouterOS para el proyecto Poké Vicio.

---

## 🏛️ 1. Contexto de Red e Infraestructura

El servidor del proyecto (hospedado en un QNAP NAS con Supabase y Docker) opera bajo un entorno de **Doble WAN (Redundancia de ISPs)**:

- **ISP-1 (Franco-Net / Ether1)**: Proveedor principal por donde ingresa el tráfico de internet público y se publica el dominio dinámico de QNAP Cloud.
- **ISP-2 (Omar / Ether2)**: Proveedor secundario utilizado para balanceo de carga general y tolerancia a fallos.

---

## ⚠️ 2. El Problema: Ruteo Asimétrico en Loopback LAN

Cuando un dispositivo dentro de la red local (LAN) intenta conectarse al servidor utilizando el dominio público `https://francogp.myqnapcloud.com:50001/`:

1. **Hairpin NAT (Loopback)**: El router redirige la petición de vuelta a la IP local del servidor (`192.168.88.250`) en lugar de sacarla a internet.
2. **Colisión de Marcado Mangle (`routing-mark`)**: Si el MikroTik tiene una regla de marcado de ruteo genérica para balancear la carga, el tráfico de respuesta del servidor local puede ser erróneamente marcado y forzado a salir por la interfaz del **ISP-2**.
3. **Consecuencia**: Se rompe la simetría de la conexión (ruteo asimétrico), lo que provoca desconexiones completas e imposibilidad de acceder al panel de administración o al juego desde dentro de la LAN usando la URL pública.

---

## 🛠️ 3. La Solución Quirúrgica (RouterOS Mangle Connection-Mark)

Para solucionar esto de manera permanente sin perder el marcado de ruteo para el tráfico legítimo de internet, debemos restringir la regla de marcado del MikroTik agregando un filtro específico de marcas de conexión (`connection-mark=ISP1-input`).

### Lógica del Filtro

- **Tráfico Externo**: El tráfico que entra desde internet a través de `ether1-ISP1-franco` es marcado con la conexión `ISP1-input`. Sus respuestas deben salir de forma obligatoria por `ISP-1`.
- **Tráfico Interno (LAN)**: El tráfico local que accede por Hairpin NAT **no** tiene la marca `ISP1-input` (porque entra por la interfaz del puente local `bridge`, no por `ether1`). Por lo tanto, el router no altera su ruteo de regreso y la conexión LAN-to-LAN se realiza de manera directa y fluida a 1 Gbps.

---

## 💻 4. Comandos de Configuración en RouterOS (MikroTik CLI)

Ejecuta las siguientes reglas de Mangle y NAT en la consola del MikroTik para implementar esta arquitectura segura:

### Regla Mangle Corregida (Filtro Quirúrgico de Conexión)

```routeros
/ip firewall mangle
add chain=prerouting src-address=192.168.88.0/24 dst-address-list=!Local \
    connection-mark=ISP1-input action=mark-routing new-routing-mark=to-ISP1 \
    passthrough=yes comment="Surgically mark routing ONLY for external ISP-1 inputs, preserving LAN Loopback"
```

> [!IMPORTANT]
> El parámetro clave es `connection-mark=ISP1-input`. Al agregarlo, aseguramos que la regla de marcado de ruta `to-ISP1` **solo** aplique a las conexiones que fueron iniciadas originalmente desde fuera de la red.

### Regla de Hairpin NAT (Loopback)

Asegúrate de que la regla de Hairpin NAT esté correctamente definida para el puerto del servidor:

```routeros
/ip firewall nat
add chain=srcnat src-address=192.168.88.0/24 dst-address=192.168.88.250 \
    protocol=tcp dst-port=50001 action=masquerade \
    comment="Hairpin NAT: Allow LAN users to access public NAS URL/port from inside"
```

---

## 🔍 5. Verificación del Estado

Para verificar que el tráfico local y externo esté perfectamente segregado, ejecuta en la consola de MikroTik:

```routeros
/ip firewall mangle print detail
```

Busca las reglas de prerouting y asegúrate de que el tráfico que va al dominio de QNAP desde la LAN **no** incremente el contador de bytes en las reglas que fuerzan la salida por ISP-1/ISP-2 (a menos que provenga originalmente de una conexión externa ya establecida).
