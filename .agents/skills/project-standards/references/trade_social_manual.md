# Manual de Intercambio y Sistemas Sociales (Poké Vicio)

Este manual documenta el funcionamiento técnico del GTS, intercambios directos y el sistema de amigos.

## 🤝 Modelo Escrow (Custodia)

Para garantizar la integridad de los datos en un entorno multijugador, Poké Vicio utiliza un modelo de custodia:

1. **Salida de Inventario**: Al poner un Pokémon en el GTS o enviarlo en una oferta de intercambio, el activo se elimina del inventario del jugador y se mueve a una tabla de custodia en el servidor.
2. **Reclamo Atómico**: El receptor (o el emisor al cancelar) debe reclamar el activo manualmente. Este proceso es atómico y requiere un "Save Flush" previo.
3. **Sync Flush**: Antes de cualquier acción social (enviar oferta, publicar en GTS), el sistema fuerza un guardado atómico para asegurar que el estado local coincida con el servidor.

---

## 📊 Límites y Cuotas (Throttling)

Para prevenir el spam y la sobrecarga de la base de datos, se aplican los siguientes límites centralizados:

- **Espacios (Slots)**: Máximo **50 espacios** para:
  - Solicitudes de amistad pendientes.
  - Ofertas de intercambio activas.
  - Publicaciones simultáneas en el GTS.
- **Cooldown de Reclamo**: Tiempo de espera obligatorio de **5 segundos** entre reclamos individuales para evitar ataques de carrera (race conditions).

---

## 🔄 Protocolos de Seguridad

- **Validación de Snapshot**: Al iniciar un intercambio, se toma una captura del estado del jugador. Solo se permiten incrementos lógicos.
- **UID Integrity**: El sistema verifica que el UID del Pokémon recibido no exista ya en el bando del jugador antes de finalizar la transacción.
