# Reporte Técnico: Mecánicas de Cambio de Forma de Castform

A continuación, se detalla el comportamiento mecánico, compatibilidad climática y especificaciones de la habilidad de Castform en la saga principal de videojuegos de Pokémon.

---

## 1. Estado en Encuentros y Fuera de Combate

* **Encuentros Salvajes:** Castform **siempre** aparece en su **Forma Normal** al iniciar un encuentro salvaje. No es posible encontrarlo con una metamorfosis climática preactiva en la hierba alta u otros métodos de captura.
* **Fuera de Combate:** En el equipo, cajas del PC o menús de estado, Castform permanece estrictamente en su Forma Normal (Tipo Normal). Su estructura molecular solo se altera bajo las condiciones específicas de la fase de batalla.

---

## 2. La Habilidad: Predicción (*Forecast*)

La transformación de Castform no está ligada a un movimiento ni es una evolución permanente; depende exclusivamente de su habilidad insignia: **Predicción** (*Forecast*).

* **Mecánica:** Si al entrar al campo de batalla o durante el transcurso de los turnos el clima cambia, la habilidad se activa de forma inmediata antes de ejecutar cualquier acción, modificando tanto el aspecto visual del Pokémon como su tipo elemental.
* **Retorno al Estado Base:** Si el clima limpio se restablece, o si se suprimen los efectos del clima en el campo, Castform regresa instantáneamente a su Forma Normal.

---

## 3. Matriz de Interacción Climática y Formas

Castform dispone de tres mutaciones moleculares activables en combate. Cualquier otra condición climática no listada aquí mantendrá al Pokémon en su estado base.

| Clima Activo en Combate | Forma Resultante | Tipo Adquirido |
| --- | --- | --- |
| **Sol Intenso** (*Harsh Sunlight*) | Forma Sol | **Fuego** |
| **Lluvia** (*Rain*) | Forma Lluvia | **Agua** |
| **Granizo o Nieve** (*Hail / Snow*) | Forma Nieve | **Hielo** |
| **Tormenta de Arena** (*Sandstorm*) | Forma Normal | **Normal** |
| **Niebla** (*Fog*) | Forma Normal | **Normal** |

---

## 4. Sinergia Especial: Meteorobola (*Weather Ball*)

El set de movimientos de Castform está diseñado para aprovechar su habilidad mediante su ataque característico, **Meteorobola**:

* **Sin Clima:** Es un movimiento de Tipo Normal con una potencia base de **50**.
* **Con Clima Activo:** Si hay Sol, Lluvia, Granizo/Nieve o Tormenta de Arena, la potencia base se duplica a **100** y el tipo del movimiento cambia para coincidir con el clima actual.
* *Nota de diseño:* En Tormenta de Arena, Meteorobola pasa a ser de tipo Roca, pero Castform se mantiene Tipo Normal, por lo que no recibe el bono de daño por mismo tipo (STAB).

---

## 5. Excepciones y Supresión de Habilidad

La transformación puede ser anulada o revertida bajo los siguientes escenarios de combate:

1. **Habilidades de Anulación:** Si un Pokémon en pista posee **Aclimatación** (*Cloud Nine*) o **Bucle Aire** (*Air Lock*), los efectos del clima se ignoran en el cálculo de combate, forzando a Castform a regresar a su Forma Normal.
2. **Alteración de Habilidad:** Si Castform es afectado por movimientos como *Abatidoras* (*Gastro Acid*), *Intercambio* (*Skill Swap*) o habilidades como *Momia* (*Mummy*), pierde *Predicción* y, en consecuencia, revierte a su Forma Normal de manera inmediata sin importar el clima presente.
