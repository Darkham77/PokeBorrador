# Plan de Implementación: Sistema de Facciones y Clanes (Escuadrones de Kanto)

## 1. Contexto y Propósito

El sistema de **Facciones y Clanes** es la columna vertebral comunitaria de **Poké Vicio**. Mientras que las dos macro-facciones (**Team Unión** y **Team Poder**) definen la disputa territorial semanal por las rutas de Kanto ([`dominancia_mapas_plan.md`](./dominancia_mapas_plan.md)), los **Clanes** actúan como escuadrones independientes donde los jugadores cooperan en grupos medianos (15 a 30 miembros), forjan identidad y se ayudan mutuamente a progresar.

### Principios Fundamentales

* **Lealtad de Bando**: Cada clan nace jurando bandera a Team Unión o Team Poder. Todos los miembros comparten la misma facción.
* **100% Fair Play (Anti-P2W)**: Prohibida la venta de clanes, buffs o ventajas por dinero real. La fundación y el progreso del clan se basan estrictamente en méritos dentro de la partida.
* **Progresión Orgánica**: Cada combate ganado por cualquier miembro aporta experiencia para subir de nivel al clan, desbloqueando mejoras colectivas.
* **Sinergia con el Mundo Vivo**: Los clanes más destacados en la disputa territorial son celebrados públicamente en **Radio Kanto** ([`megafono_noticias_plan.md`](./megafono_noticias_plan.md)).

---

## 2. Estructura y Membresía

### 2.1 Requisitos de Fundación

Para fundar un nuevo clan, el entrenador debe demostrar veteranía en la región:

* Pertenecer formalmente a una facción (**Team Unión** o **Team Poder**).
* Poseer al menos **4 Medallas de Gimnasio** de Kanto.
* Pagar una tasa de registro de **50,000 P¥** (dinero del juego).
* Elegir un **Nombre** (4-16 caracteres) y un **Tag** (2-4 caracteres alfanuméricos, ej. `[ROCA]`).

### 2.2 Capacidad de Miembros y Rangos

* **Capacidad**: Comienza en **15 miembros** (Nivel 1) y aumenta progresivamente hasta un máximo de **30 miembros** (Nivel 5) para evitar la monopolización del servidor por un solo megagremio.
* **Rangos Operativos**:
  1. **Líder**: Control total. Puede editar descripción/política de acceso, promover/degradar oficiales, transferir el liderazgo o disolver el clan.
  2. **Oficial**: Puede invitar jugadores, aceptar solicitudes de ingreso y expulsar a miembros regulares.
  3. **Miembro**: Aporta experiencia jugando, disfruta de los buffs activos y participa en la dominancia de rutas.

### 2.3 Política de Ingreso y Periodo de Gracia

* **Modalidades**: Clan de acceso **Libre** (ingreso directo si hay plazas) o **Por Solicitud** (requiere aprobación de Líder u Oficial).
* **Cooldown de 24 horas**: Al abandonar o ser expulsado de un clan, el jugador debe esperar 24 horas antes de unirse a otro clan, evitando transferencias oportunistas durante los cierres de guerra de los viernes.

---

## 3. Progresión y Mejoras Colectivas (Clan Buffs)

Los clanes suben de nivel mediante **Puntos de Experiencia de Clan (XP)**. Cada victoria en combate (salvaje, entrenador o evento) aporta +1 XP al clan.

| Nivel | XP Requerida | Límite Miembros | Mejora Desbloqueada (Buff Pasivo) |
| :---: | :---: | :---: | :--- |
| **1** | 0 | 15 | Tag de Clan en perfil y Radio Kanto + Acceso a tablero del Clan |
| **2** | 1,500 | 18 | **Tesorería Común**: +5% de ganancias de Pokéyen en todos los combates |
| **3** | 4,500 | 22 | **Entrenamiento Grupal**: +5% de Experiencia ganada para el equipo Pokémon |
| **4** | 10,000 | 26 | **Convenio Comercial**: 5% de descuento en PokéMarts de ciudades aliadas |
| **5** | 20,000 | 30 | **Ojo Crítico**: +10% de probabilidad de encontrar Pokémon salvajes con IVs destacados (≥25) |

*(Todos los multiplicadores son aditivos y moderados para no romper el balance competitivo de Showdown).*

---

## 4. Integración con Dominancia de Mapas y Radio Kanto

1. **Aporte Territorial**: Cada vez que un miembro resuelve un evento en una ruta en disputa durante la semana, suma Puntos de Territorio (PT) a su facción general y simultáneamente computa para el ranking de clanes de esa facción.
2. **Clan Protector de Ruta**: Al resolverse la guerra el viernes por la noche, el clan de la facción ganadora que más PT aportó a esa ruta específica es nombrado el **"Clan Protector de [Ruta X]"**.
3. **Emisión Radial**: Radio Kanto emite un boletín oficial reconociendo la hazaña:
   * *"¡Boletín de Guerra de Radio Kanto! Team Unión domina la Ruta 2 gracias a la extraordinaria labor del clan [TITAN] Titanes de Kanto."*

---

## 5. Esquema de Base de Datos (Supabase PostgreSQL)

```sql
-- 1. Tabla de Clanes
CREATE TABLE public.clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL CHECK (char_length(name) BETWEEN 4 AND 16),
  tag VARCHAR(4) UNIQUE NOT NULL CHECK (char_length(tag) BETWEEN 2 AND 4),
  faction TEXT NOT NULL CHECK (faction IN ('union', 'poder')),
  leader_id UUID NOT NULL REFERENCES auth.users(id),
  level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  xp BIGINT NOT NULL DEFAULT 0,
  description TEXT DEFAULT 'Un nuevo escuadrón de Kanto.',
  policy TEXT NOT NULL DEFAULT 'approval' CHECK (policy IN ('open', 'approval')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Miembros de Clanes
CREATE TABLE public.clan_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'officer', 'member')),
  contributed_xp BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cooldown_until TIMESTAMPTZ
);

-- 3. Historial de Actividad del Clan
CREATE TABLE public.clan_logs (
  id BIGSERIAL PRIMARY KEY,
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'join', 'leave', 'kick', 'promote', 'levelup'
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Solicitudes de Ingreso
CREATE TABLE public.clan_requests (
  id BIGSERIAL PRIMARY KEY,
  clan_id UUID NOT NULL REFERENCES public.clans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clan_id, user_id)
);
```

---

## 6. Arquitectura Frontend

```text
src/
├── types/clan/
│   └── clan.ts                    # Contratos de TypeScript (Clan, ClanMember, ClanBuff)
├── stores/
│   └── clanStore.ts               # Store de Pinia: clan activo, miembros, peticiones y buffs
└── components/clan/
    ├── ClanDashboardModal.vue     # Modal principal: información, XP, lista de miembros y buffs
    ├── ClanCreateModal.vue        # Formulario de fundación (verificación de facción, P¥ y medallas)
    ├── ClanDirectoryView.vue      # Buscador y lista de clanes de la misma facción
    └── ClanBadge.vue              # Tag pixelado [TAG] reutilizable en perfiles y Radio Kanto
```

---

## 7. Registro de Decisiones (Decision Log)

| ID | Tema | Decisión | Alternativas Descartadas | Razón |
| :--- | :--- | :--- | :--- | :--- |
| **ADR-CLN-01** | Alineación de Clanes | Clanes estrictamente alineados con Team Unión o Team Poder. | Clanes neutrales o mixtos. | Coherencia con la guerra de dominancia territorial semanal. |
| **ADR-CLN-02** | Acceso y Creación | Gratuito en dinero real; requiere 4 medallas y 50,000 P¥ del juego. | Pago con moneda premium / Gold real. | Principio inquebrantable de Fair Play (cero Pay-to-Win). |
| **ADR-CLN-03** | Tamaño de Clanes | 15 a 30 miembros máximo. | Gremios masivos de 50+ o escuadras diminutas de 5. | Fomenta multiplicidad de comunidades y evita monopolios. |
| **ADR-CLN-04** | Beneficios de Clan | Buffs pasivos moderados (+5% P¥, +5% EXP). | Venta de ítems exclusivos o ventajas desmedidas en stats. | Preservar el equilibrio competitivo del motor Showdown. |
