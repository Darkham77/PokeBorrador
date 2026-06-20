# Reporte de Efectos de Movimientos Pendientes de Implementar en ActionRegistry

## 🧠 Análisis y Clasificación de Mecánicas Pendientes

Tras evaluar el estado actual del motor de batalla modular y las alertas en consola (como el caso de `yawn` / *Bostezo*), se identifican cinco grandes familias de mecánicas que faltan integrar o expandir en el `ActionRegistry`:

### 1. Estados Volátiles con Delay / Contadores (Ej: `yawn` / *Bostezo*)

* **Problema**: Movimientos que no aplican un efecto inmediato, sino que programan un suceso para turnos posteriores.
* **Propuesta**:
  * Añadir un campo de estado temporal (ej. `yawnTurns: number`) en el modelo del Pokémon.
  * En `battleFlow.ts` o `battleStatus.ts`, decrementar este contador al final del turno. Al llegar a `0`, aplicar de forma determinista el estado principal `sleep` (siempre que el objetivo no tenga ya otro problema de estado primario).

### 2. Atrapamiento Parcial y Drenaje Continuo (Ej: `wrap`, `clamp`, `partiallytrapped`)

* **Problema**: Movimientos de daño recurrente por turnos que impiden la retirada.
* **Propuesta**:
  * Registrar un estado volátil `trappedTurns` (ej. entre 2 y 5 turnos).
  * Bloquear el botón de cambio (`[🔁 Switch]`) en la interfaz mientras este contador esté activo.
  * Restar una fracción fija de HP (ej. 1/16 o 1/8) al final del turno en `battleStatus.ts`.

### 3. Estados de Bloqueo de Acción / Turno Completo (Ej: `mustrecharge` / *Hiperrayo*, `lockedmove` / *Golpe*)

* **Problema**: Obligan al Pokémon a recargar en el siguiente turno o a repetir el mismo movimiento de forma ininterrumpida.
* **Propuesta**:
  * Implementar flags como `mustRecharge` en el estado de combate del Pokémon.
  * En la fase de selección de movimientos, si `mustRecharge` está activo, forzar una acción vacía de "recarga" y limpiar el flag al finalizar el turno.

### 4. Limitadores de Opciones de Combate (Ej: `disable`, `encore`, `torment`)

* **Problema**: Deshabilitan movimientos específicos o fuerzan a usar únicamente el último seleccionado.
* **Propuesta**:
  * Mantener un registro del último movimiento usado (`lastMoveId`) e inhabilitar los slots correspondientes en la interfaz de usuario de combate (añadiendo propiedades como `disabled` en el renderizado de la botonera).

### 5. Condiciones de Entrada y Campo (Ej: `spikes` / *Púas*, `toxicspikes`, `stealthrock`)

* **Problema**: Efectos que no se aplican al Pokémon activo, sino al lado del campo de batalla enemigo.
* **Propuesta**:
  * Integrar variables de campo en `BattleContext` (ej. `playerSideConditions: { spikes: number }`).
  * En la lógica de relevo / cambio de Pokémon, verificar estas condiciones y aplicar daño proporcional o estados alterados al Pokémon entrante antes de que pueda actuar.

---

Este documento lista todos los movimientos de Showdown que poseen efectos especiales (estados alterados, modificaciones de estadísticas, climas, curación, etc.) pero que no se encuentran mapeados en `MOVE_TO_EFFECT_ALIASES` o implementados como efecto local unívoco.

**Total de movimientos con efectos pendientes:** 381

| ID | Movimiento | Tipo | Categoría | Efectos Identificados en Showdown |
| --- | --- | --- | --- | --- |
| `acidspray` | **Acid Spray** | Poison | Special | Secundario (100%): {"spd":-2} |
| `airslash` | **Air Slash** | Flying | Special | Secundario (30%): undefined |
| `alluringvoice` | **Alluring Voice** | Fairy | Special | Secundario (100%): undefined |
| `amnesia` | **Amnesia** | Psychic | Status | Ajustes Stats: {"spd":2} |
| `anchorshot` | **Anchor Shot** | Steel | Physical | Secundario (100%): undefined |
| `appleacid` | **Apple Acid** | Grass | Special | Secundario (100%): {"spd":-1} |
| `aquaring` | **Aqua Ring** | Water | Status | Estado Volátil: aquaring |
| `aquastep` | **Aqua Step** | Water | Physical | Secundario (100%): undefined |
| `armorcannon` | **Armor Cannon** | Fire | Special | Efecto Propio: {"boosts":{"def":-1,"spd":-1}} |
| `aromaticmist` | **Aromatic Mist** | Fairy | Status | Ajustes Stats: {"spd":1} |
| `astonish` | **Astonish** | Ghost | Physical | Secundario (30%): undefined |
| `attract` | **Attract** | Normal | Status | Estado Volátil: attract |
| `aurawheel` | **Aura Wheel** | Electric | Physical | Secundario (100%): undefined |
| `auroraveil` | **Aurora Veil** | Ice | Status | Condición de Campo: auroraveil |
| `autotomize` | **Autotomize** | Steel | Status | Ajustes Stats: {"spe":2} |
| `axekick` | **Axe Kick** | Fighting | Physical | Secundario (30%): undefined |
| `babydolleyes` | **Baby-Doll Eyes** | Fairy | Status | Ajustes Stats: {"atk":-1} |
| `baddybad` | **Baddy Bad** | Dark | Special | Efecto Propio: {"sideCondition":"reflect"} |
| `banefulbunker` | **Baneful Bunker** | Poison | Status | Estado Volátil: banefulbunker |
| `barbbarrage` | **Barb Barrage** | Poison | Physical | Secundario (50%): "psn" |
| `batonpass` | **Baton Pass** | Normal | Status | Efecto Propio: {} |
| `bide` | **Bide** | Normal | Physical | Estado Volátil: bide |
| `bind` | **Bind** | Normal | Physical | Estado Volátil: partiallytrapped |
| `bittermalice` | **Bitter Malice** | Ghost | Special | Secundario (100%): {"atk":-1} |
| `blastburn` | **Blast Burn** | Fire | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `blazekick` | **Blaze Kick** | Fire | Physical | Secundario (10%): "brn" |
| `blazingtorque` | **Blazing Torque** | Fire | Physical | Secundario (30%): "brn" |
| `bleakwindstorm` | **Bleakwind Storm** | Flying | Special | Secundario (30%): {"spe":-1} |
| `blueflare` | **Blue Flare** | Fire | Special | Secundario (20%): "brn" |
| `boltstrike` | **Bolt Strike** | Electric | Physical | Secundario (20%): "par" |
| `boneclub` | **Bone Club** | Ground | Physical | Secundario (10%): undefined |
| `bounce` | **Bounce** | Flying | Physical | Secundario (30%): "par" |
| `breakingswipe` | **Breaking Swipe** | Dragon | Physical | Secundario (100%): {"atk":-1} |
| `bugbuzz` | **Bug Buzz** | Bug | Special | Secundario (10%): {"spd":-1} |
| `bulldoze` | **Bulldoze** | Ground | Physical | Secundario (100%): {"spe":-1} |
| `burningbulwark` | **Burning Bulwark** | Fire | Status | Estado Volátil: burningbulwark |
| `burningjealousy` | **Burning Jealousy** | Fire | Special | Secundario (100%): undefined |
| `burnup` | **Burn Up** | Fire | Special | Efecto Propio: {} |
| `buzzybuzz` | **Buzzy Buzz** | Electric | Special | Secundario (100%): "par" |
| `captivate` | **Captivate** | Normal | Status | Ajustes Stats: {"spa":-2} |
| `ceaselessedge` | **Ceaseless Edge** | Dark | Physical | Secundario (undefined%): undefined |
| `charge` | **Charge** | Electric | Status | Ajustes Stats: {"spd":1}, Estado Volátil: charge |
| `chargebeam` | **Charge Beam** | Electric | Special | Secundario (70%): undefined |
| `charm` | **Charm** | Fairy | Status | Ajustes Stats: {"atk":-2} |
| `chatter` | **Chatter** | Flying | Special | Secundario (100%): undefined |
| `chillingwater` | **Chilling Water** | Water | Special | Secundario (100%): {"atk":-1} |
| `chillyreception` | **Chilly Reception** | Ice | Status | Clima: snowscape |
| `clamp` | **Clamp** | Water | Physical | Estado Volátil: partiallytrapped |
| `clangoroussoul` | **Clangorous Soul** | Dragon | Status | Ajustes Stats: {"atk":1,"def":1,"spa":1,"spd":1,"spe":1} |
| `clangoroussoulblaze` | **Clangorous Soulblaze** | Dragon | Special | Secundario (undefined%): undefined |
| `coaching` | **Coaching** | Fighting | Status | Ajustes Stats: {"atk":1,"def":1} |
| `coil` | **Coil** | Poison | Status | Ajustes Stats: {"atk":1,"def":1,"accuracy":1} |
| `combattorque` | **Combat Torque** | Fighting | Physical | Secundario (30%): "par" |
| `confide` | **Confide** | Normal | Status | Ajustes Stats: {"spa":-1} |
| `cottonguard` | **Cotton Guard** | Grass | Status | Ajustes Stats: {"def":3} |
| `craftyshield` | **Crafty Shield** | Fairy | Status | Condición de Campo: craftyshield |
| `crosspoison` | **Cross Poison** | Poison | Physical | Secundario (10%): "psn" |
| `crushclaw` | **Crush Claw** | Normal | Physical | Secundario (50%): {"def":-1} |
| `darkpulse` | **Dark Pulse** | Dark | Special | Secundario (20%): undefined |
| `darkvoid` | **Dark Void** | Dark | Status | Condición de Estado: slp |
| `decorate` | **Decorate** | Fairy | Status | Ajustes Stats: {"atk":2,"spa":2} |
| `defendorder` | **Defend Order** | Bug | Status | Ajustes Stats: {"def":1,"spd":1} |
| `destinybond` | **Destiny Bond** | Ghost | Status | Estado Volátil: destinybond |
| `detect` | **Detect** | Fighting | Status | Estado Volátil: protect |
| `diamondstorm` | **Diamond Storm** | Rock | Physical | Efecto Propio: {"chance":50,"boosts":{"def":2}}, Secundario (undefined%): undefined |
| `direclaw` | **Dire Claw** | Poison | Physical | Secundario (50%): undefined |
| `disable` | **Disable** | Normal | Status | Estado Volátil: disable |
| `dizzypunch` | **Dizzy Punch** | Normal | Physical | Secundario (20%): undefined |
| `doubleironbash` | **Double Iron Bash** | Steel | Physical | Secundario (30%): undefined |
| `doubleshock` | **Double Shock** | Electric | Physical | Efecto Propio: {} |
| `dragonascent` | **Dragon Ascent** | Flying | Physical | Efecto Propio: {"boosts":{"def":-1,"spd":-1}} |
| `dragonbreath` | **Dragon Breath** | Dragon | Special | Secundario (30%): "par" |
| `dragoncheer` | **Dragon Cheer** | Dragon | Status | Estado Volátil: dragoncheer |
| `dragonrush` | **Dragon Rush** | Dragon | Physical | Secundario (20%): undefined |
| `drumbeating` | **Drum Beating** | Grass | Physical | Secundario (100%): {"spe":-1} |
| `dynamicpunch` | **Dynamic Punch** | Fighting | Physical | Secundario (100%): undefined |
| `earthpower` | **Earth Power** | Ground | Special | Secundario (10%): {"spd":-1} |
| `eerieimpulse` | **Eerie Impulse** | Electric | Status | Ajustes Stats: {"spa":-2} |
| `eeriespell` | **Eerie Spell** | Psychic | Special | Secundario (100%): undefined |
| `electrify` | **Electrify** | Electric | Status | Estado Volátil: electrify |
| `electroweb` | **Electroweb** | Electric | Special | Secundario (100%): {"spe":-1} |
| `embargo` | **Embargo** | Dark | Status | Estado Volátil: embargo |
| `encore` | **Encore** | Normal | Status | Estado Volátil: encore |
| `endure` | **Endure** | Normal | Status | Estado Volátil: endure |
| `energyball` | **Energy Ball** | Grass | Special | Secundario (10%): {"spd":-1} |
| `esperwing` | **Esper Wing** | Psychic | Special | Secundario (100%): undefined |
| `eternabeam` | **Eternabeam** | Dragon | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `extrasensory` | **Extrasensory** | Psychic | Special | Secundario (10%): undefined |
| `extremeevoboost` | **Extreme Evoboost** | Normal | Status | Ajustes Stats: {"atk":2,"def":2,"spa":2,"spd":2,"spe":2} |
| `fakeout` | **Fake Out** | Normal | Physical | Secundario (100%): undefined |
| `faketears` | **Fake Tears** | Dark | Status | Ajustes Stats: {"spd":-2} |
| `featherdance` | **Feather Dance** | Flying | Status | Ajustes Stats: {"atk":-2} |
| `fierydance` | **Fiery Dance** | Fire | Special | Secundario (50%): undefined |
| `fierywrath` | **Fiery Wrath** | Dark | Special | Secundario (20%): undefined |
| `filletaway` | **Fillet Away** | Normal | Status | Ajustes Stats: {"atk":2,"spa":2,"spe":2} |
| `firelash` | **Fire Lash** | Fire | Physical | Secundario (100%): {"def":-1} |
| `firepunch` | **Fire Punch** | Fire | Physical | Secundario (10%): "brn" |
| `firespin` | **Fire Spin** | Fire | Special | Estado Volátil: partiallytrapped |
| `flamecharge` | **Flame Charge** | Fire | Physical | Secundario (100%): undefined |
| `flamewheel` | **Flame Wheel** | Fire | Physical | Secundario (10%): "brn" |
| `flareblitz` | **Flare Blitz** | Fire | Physical | Secundario (10%): "brn" |
| `flashcannon` | **Flash Cannon** | Steel | Special | Secundario (10%): {"spd":-1} |
| `flatter` | **Flatter** | Dark | Status | Ajustes Stats: {"spa":1}, Estado Volátil: confusion |
| `fleurcannon` | **Fleur Cannon** | Fairy | Special | Efecto Propio: {"boosts":{"spa":-2}} |
| `floatyfall` | **Floaty Fall** | Flying | Physical | Secundario (30%): undefined |
| `focusblast` | **Focus Blast** | Fighting | Special | Secundario (10%): {"spd":-1} |
| `focusenergy` | **Focus Energy** | Normal | Status | Estado Volátil: focusenergy |
| `followme` | **Follow Me** | Normal | Status | Estado Volátil: followme |
| `forcepalm` | **Force Palm** | Fighting | Physical | Secundario (30%): "par" |
| `foresight` | **Foresight** | Normal | Status | Estado Volátil: foresight |
| `freezedry` | **Freeze-Dry** | Ice | Special | Secundario (10%): "frz" |
| `freezeshock` | **Freeze Shock** | Ice | Physical | Secundario (30%): "par" |
| `freezingglare` | **Freezing Glare** | Psychic | Special | Secundario (10%): "frz" |
| `frenzyplant` | **Frenzy Plant** | Grass | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `gastroacid` | **Gastro Acid** | Poison | Status | Estado Volátil: gastroacid |
| `genesissupernova` | **Genesis Supernova** | Psychic | Special | Secundario (100%): undefined |
| `geomancy` | **Geomancy** | Fairy | Status | Ajustes Stats: {"spa":2,"spd":2,"spe":2} |
| `gigaimpact` | **Giga Impact** | Normal | Physical | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `glaciate` | **Glaciate** | Ice | Special | Secundario (100%): {"spe":-1} |
| `glaiverush` | **Glaive Rush** | Dragon | Physical | Efecto Propio: {"volatileStatus":"glaiverush"} |
| `glitzyglow` | **Glitzy Glow** | Psychic | Special | Efecto Propio: {"sideCondition":"lightscreen"} |
| `gmaxbefuddle` | **G-Max Befuddle** | Bug | Physical | Efecto Propio: {} |
| `gmaxcannonade` | **G-Max Cannonade** | Water | Physical | Efecto Propio: {} |
| `gmaxcentiferno` | **G-Max Centiferno** | Fire | Physical | Efecto Propio: {} |
| `gmaxchistrike` | **G-Max Chi Strike** | Fighting | Physical | Efecto Propio: {} |
| `gmaxcuddle` | **G-Max Cuddle** | Normal | Physical | Efecto Propio: {} |
| `gmaxdepletion` | **G-Max Depletion** | Dragon | Physical | Efecto Propio: {} |
| `gmaxfinale` | **G-Max Finale** | Fairy | Physical | Efecto Propio: {} |
| `gmaxfoamburst` | **G-Max Foam Burst** | Water | Physical | Efecto Propio: {} |
| `gmaxgoldrush` | **G-Max Gold Rush** | Normal | Physical | Efecto Propio: {} |
| `gmaxgravitas` | **G-Max Gravitas** | Psychic | Physical | Efecto Propio: {"pseudoWeather":"gravity"} |
| `gmaxmalodor` | **G-Max Malodor** | Poison | Physical | Efecto Propio: {} |
| `gmaxmeltdown` | **G-Max Meltdown** | Steel | Physical | Efecto Propio: {} |
| `gmaxreplenish` | **G-Max Replenish** | Normal | Physical | Efecto Propio: {} |
| `gmaxresonance` | **G-Max Resonance** | Ice | Physical | Efecto Propio: {"sideCondition":"auroraveil"} |
| `gmaxsandblast` | **G-Max Sandblast** | Ground | Physical | Efecto Propio: {} |
| `gmaxsmite` | **G-Max Smite** | Fairy | Physical | Efecto Propio: {} |
| `gmaxsteelsurge` | **G-Max Steelsurge** | Steel | Physical | Efecto Propio: {} |
| `gmaxstonesurge` | **G-Max Stonesurge** | Water | Physical | Efecto Propio: {} |
| `gmaxstunshock` | **G-Max Stun Shock** | Electric | Physical | Efecto Propio: {} |
| `gmaxsweetness` | **G-Max Sweetness** | Grass | Physical | Efecto Propio: {} |
| `gmaxtartness` | **G-Max Tartness** | Grass | Physical | Efecto Propio: {} |
| `gmaxterror` | **G-Max Terror** | Ghost | Physical | Efecto Propio: {} |
| `gmaxvinelash` | **G-Max Vine Lash** | Grass | Physical | Efecto Propio: {} |
| `gmaxvolcalith` | **G-Max Volcalith** | Rock | Physical | Efecto Propio: {} |
| `gmaxvoltcrash` | **G-Max Volt Crash** | Electric | Physical | Efecto Propio: {} |
| `gmaxwildfire` | **G-Max Wildfire** | Fire | Physical | Efecto Propio: {} |
| `gmaxwindrage` | **G-Max Wind Rage** | Flying | Physical | Efecto Propio: {} |
| `grasswhistle` | **Grass Whistle** | Grass | Status | Condición de Estado: slp |
| `gravapple` | **Grav Apple** | Grass | Physical | Secundario (100%): {"def":-1} |
| `grudge` | **Grudge** | Ghost | Status | Estado Volátil: grudge |
| `gunkshot` | **Gunk Shot** | Poison | Physical | Secundario (30%): "psn" |
| `hammerarm` | **Hammer Arm** | Fighting | Physical | Efecto Propio: {"boosts":{"spe":-1}} |
| `headlongrush` | **Headlong Rush** | Ground | Physical | Efecto Propio: {"boosts":{"def":-1,"spd":-1}} |
| `healblock` | **Heal Block** | Psychic | Status | Estado Volátil: healblock |
| `healingwish` | **Healing Wish** | Psychic | Status | User faints. Next hurt Pokemon is fully healed. |
| `healorder` | **Heal Order** | Bug | Status | Curación: [1,2] |
| `heartstamp` | **Heart Stamp** | Psychic | Physical | Secundario (30%): undefined |
| `helpinghand` | **Helping Hand** | Normal | Status | Estado Volátil: helpinghand |
| `honeclaws` | **Hone Claws** | Dark | Status | Ajustes Stats: {"atk":1,"accuracy":1} |
| `howl` | **Howl** | Normal | Status | Ajustes Stats: {"atk":1} |
| `hurricane` | **Hurricane** | Flying | Special | Secundario (30%): undefined |
| `hydrocannon` | **Hydro Cannon** | Water | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `hyperbeam` | **Hyper Beam** | Normal | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `hyperspacefury` | **Hyperspace Fury** | Dark | Physical | Efecto Propio: {"boosts":{"def":-1}} |
| `iceburn` | **Ice Burn** | Ice | Special | Secundario (30%): "brn" |
| `icehammer` | **Ice Hammer** | Ice | Physical | Efecto Propio: {"boosts":{"spe":-1}} |
| `icepunch` | **Ice Punch** | Ice | Physical | Secundario (10%): "frz" |
| `iciclecrash` | **Icicle Crash** | Ice | Physical | Secundario (30%): undefined |
| `imprison` | **Imprison** | Psychic | Status | Estado Volátil: imprison |
| `infernalparade` | **Infernal Parade** | Ghost | Special | Secundario (30%): "brn" |
| `inferno` | **Inferno** | Fire | Special | Secundario (100%): "brn" |
| `infestation` | **Infestation** | Bug | Special | Estado Volátil: partiallytrapped |
| `ingrain` | **Ingrain** | Grass | Status | Estado Volátil: ingrain |
| `irondefense` | **Iron Defense** | Steel | Status | Ajustes Stats: {"def":2} |
| `ironhead` | **Iron Head** | Steel | Physical | Secundario (30%): undefined |
| `kingsshield` | **King's Shield** | Steel | Status | Estado Volátil: kingsshield |
| `laserfocus` | **Laser Focus** | Normal | Status | Estado Volátil: laserfocus |
| `lavaplume` | **Lava Plume** | Fire | Special | Secundario (30%): "brn" |
| `leaftornado` | **Leaf Tornado** | Grass | Special | Secundario (50%): {"accuracy":-1} |
| `lifedew` | **Life Dew** | Water | Status | Curación: [1,4] |
| `lightscreen` | **Light Screen** | Psychic | Status | Condición de Campo: lightscreen |
| `liquidation` | **Liquidation** | Water | Physical | Secundario (20%): {"def":-1} |
| `lowsweep` | **Low Sweep** | Fighting | Physical | Secundario (100%): {"spe":-1} |
| `luckychant` | **Lucky Chant** | Normal | Status | Condición de Campo: luckychant |
| `luminacrash` | **Lumina Crash** | Psychic | Special | Secundario (100%): {"spd":-2} |
| `lunardance` | **Lunar Dance** | Psychic | Status | User faints. Next hurt Pkmn is cured, max HP/PP. |
| `lunge` | **Lunge** | Bug | Physical | Secundario (100%): {"atk":-1} |
| `lusterpurge` | **Luster Purge** | Psychic | Special | Secundario (50%): {"spd":-1} |
| `magicaltorque` | **Magical Torque** | Fairy | Physical | Secundario (30%): undefined |
| `magiccoat` | **Magic Coat** | Psychic | Status | Estado Volátil: magiccoat |
| `magmastorm` | **Magma Storm** | Fire | Special | Estado Volátil: partiallytrapped |
| `magnetrise` | **Magnet Rise** | Electric | Status | Estado Volátil: magnetrise |
| `makeitrain` | **Make It Rain** | Steel | Special | Efecto Propio: {"boosts":{"spa":-1}} |
| `malignantchain` | **Malignant Chain** | Poison | Special | Secundario (50%): "tox" |
| `matblock` | **Mat Block** | Fighting | Status | Condición de Campo: matblock |
| `matchagotcha` | **Matcha Gotcha** | Grass | Special | Secundario (20%): "brn" |
| `maxairstream` | **Max Airstream** | Flying | Physical | Efecto Propio: {} |
| `maxdarkness` | **Max Darkness** | Dark | Physical | Efecto Propio: {} |
| `maxflare` | **Max Flare** | Fire | Physical | Efecto Propio: {} |
| `maxflutterby` | **Max Flutterby** | Bug | Physical | Efecto Propio: {} |
| `maxgeyser` | **Max Geyser** | Water | Physical | Efecto Propio: {} |
| `maxguard` | **Max Guard** | Normal | Status | Estado Volátil: maxguard |
| `maxhailstorm` | **Max Hailstorm** | Ice | Physical | Efecto Propio: {} |
| `maxknuckle` | **Max Knuckle** | Fighting | Physical | Efecto Propio: {} |
| `maxlightning` | **Max Lightning** | Electric | Physical | Efecto Propio: {} |
| `maxmindstorm` | **Max Mindstorm** | Psychic | Physical | Efecto Propio: {} |
| `maxooze` | **Max Ooze** | Poison | Physical | Efecto Propio: {} |
| `maxovergrowth` | **Max Overgrowth** | Grass | Physical | Efecto Propio: {} |
| `maxphantasm` | **Max Phantasm** | Ghost | Physical | Efecto Propio: {} |
| `maxquake` | **Max Quake** | Ground | Physical | Efecto Propio: {} |
| `maxrockfall` | **Max Rockfall** | Rock | Physical | Efecto Propio: {} |
| `maxstarfall` | **Max Starfall** | Fairy | Physical | Efecto Propio: {} |
| `maxsteelspike` | **Max Steelspike** | Steel | Physical | Efecto Propio: {} |
| `maxstrike` | **Max Strike** | Normal | Physical | Efecto Propio: {} |
| `maxwyrmwind` | **Max Wyrmwind** | Dragon | Physical | Efecto Propio: {} |
| `meditate` | **Meditate** | Psychic | Status | Ajustes Stats: {"atk":1} |
| `memento` | **Memento** | Dark | Status | Ajustes Stats: {"atk":-2,"spa":-2} |
| `metalclaw` | **Metal Claw** | Steel | Physical | Secundario (10%): undefined |
| `metalsound` | **Metal Sound** | Steel | Status | Ajustes Stats: {"spd":-2} |
| `meteorassault` | **Meteor Assault** | Fighting | Physical | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `meteormash` | **Meteor Mash** | Steel | Physical | Secundario (20%): undefined |
| `miracleeye` | **Miracle Eye** | Psychic | Status | Estado Volátil: miracleeye |
| `mirrorshot` | **Mirror Shot** | Steel | Special | Secundario (30%): {"accuracy":-1} |
| `mist` | **Mist** | Ice | Status | Condición de Campo: mist |
| `mistball` | **Mist Ball** | Psychic | Special | Secundario (50%): {"spa":-1} |
| `moonblast` | **Moonblast** | Fairy | Special | Secundario (30%): {"spa":-1} |
| `mortalspin` | **Mortal Spin** | Poison | Physical | Secundario (100%): "psn" |
| `mountaingale` | **Mountain Gale** | Ice | Physical | Secundario (30%): undefined |
| `mudbomb` | **Mud Bomb** | Ground | Special | Secundario (30%): {"accuracy":-1} |
| `muddywater` | **Muddy Water** | Water | Special | Secundario (30%): {"accuracy":-1} |
| `mudslap` | **Mud-Slap** | Ground | Special | Secundario (100%): {"accuracy":-1} |
| `mysticalfire` | **Mystical Fire** | Fire | Special | Secundario (100%): {"spa":-1} |
| `mysticalpower` | **Mystical Power** | Psychic | Special | Secundario (100%): undefined |
| `nastyplot` | **Nasty Plot** | Dark | Status | Ajustes Stats: {"spa":2} |
| `needlearm` | **Needle Arm** | Grass | Physical | Secundario (30%): undefined |
| `nightdaze` | **Night Daze** | Dark | Special | Secundario (40%): {"accuracy":-1} |
| `nightmare` | **Nightmare** | Ghost | Status | Estado Volátil: nightmare |
| `nobleroar` | **Noble Roar** | Normal | Status | Ajustes Stats: {"atk":-1,"spa":-1} |
| `noretreat` | **No Retreat** | Fighting | Status | Ajustes Stats: {"atk":1,"def":1,"spa":1,"spd":1,"spe":1}, Estado Volátil: noretreat |
| `noxioustorque` | **Noxious Torque** | Poison | Physical | Secundario (30%): "psn" |
| `nuzzle` | **Nuzzle** | Electric | Physical | Secundario (100%): "par" |
| `obstruct` | **Obstruct** | Dark | Status | Estado Volátil: obstruct |
| `octazooka` | **Octazooka** | Water | Special | Secundario (50%): {"accuracy":-1} |
| `octolock` | **Octolock** | Fighting | Status | Estado Volátil: octolock |
| `odorsleuth` | **Odor Sleuth** | Normal | Status | Estado Volátil: foresight |
| `ominouswind` | **Ominous Wind** | Ghost | Special | Secundario (10%): undefined |
| `outrage` | **Outrage** | Dragon | Physical | Efecto Propio: {"volatileStatus":"lockedmove"} |
| `petaldance` | **Petal Dance** | Grass | Special | Efecto Propio: {"volatileStatus":"lockedmove"} |
| `playnice` | **Play Nice** | Normal | Status | Ajustes Stats: {"atk":-1} |
| `playrough` | **Play Rough** | Fairy | Physical | Secundario (10%): {"atk":-1} |
| `poisonfang` | **Poison Fang** | Poison | Physical | Secundario (50%): "tox" |
| `poisongas` | **Poison Gas** | Poison | Status | Condición de Estado: psn |
| `poisonjab` | **Poison Jab** | Poison | Physical | Secundario (30%): "psn" |
| `poisonpowder` | **Poison Powder** | Poison | Status | Condición de Estado: psn |
| `poisontail` | **Poison Tail** | Poison | Physical | Secundario (10%): "psn" |
| `pounce` | **Pounce** | Bug | Physical | Secundario (100%): {"spe":-1} |
| `powder` | **Powder** | Bug | Status | Estado Volátil: powder |
| `powdersnow` | **Powder Snow** | Ice | Special | Secundario (10%): "frz" |
| `powershift` | **Power Shift** | Normal | Status | Estado Volátil: powershift |
| `powertrick` | **Power Trick** | Psychic | Status | Estado Volátil: powertrick |
| `poweruppunch` | **Power-Up Punch** | Fighting | Physical | Secundario (100%): undefined |
| `prismaticlaser` | **Prismatic Laser** | Psychic | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `protect` | **Protect** | Normal | Status | Estado Volátil: protect |
| `psychicnoise` | **Psychic Noise** | Psychic | Special | Secundario (100%): undefined |
| `psychoshift` | **Psycho Shift** | Psychic | Status | Efecto Propio: {} |
| `psyshieldbash` | **Psyshield Bash** | Psychic | Physical | Secundario (100%): undefined |
| `pyroball` | **Pyro Ball** | Fire | Physical | Secundario (10%): "brn" |
| `quickguard` | **Quick Guard** | Fighting | Status | Condición de Campo: quickguard |
| `quiverdance` | **Quiver Dance** | Bug | Status | Ajustes Stats: {"spa":1,"spd":1,"spe":1} |
| `rage` | **Rage** | Normal | Physical | Efecto Propio: {"volatileStatus":"rage"} |
| `ragepowder` | **Rage Powder** | Bug | Status | Estado Volátil: ragepowder |
| `ragingfury` | **Raging Fury** | Fire | Physical | Efecto Propio: {"volatileStatus":"lockedmove"} |
| `rapidspin` | **Rapid Spin** | Normal | Physical | Secundario (100%): undefined |
| `razorshell` | **Razor Shell** | Water | Physical | Secundario (50%): {"def":-1} |
| `reflect` | **Reflect** | Psychic | Status | Condición de Campo: reflect |
| `relicsong` | **Relic Song** | Normal | Special | Secundario (10%): "slp" |
| `revivalblessing` | **Revival Blessing** | Normal | Status | Revives a fainted Pokemon to 50% HP. |
| `roaroftime` | **Roar of Time** | Dragon | Special | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `rockclimb` | **Rock Climb** | Normal | Physical | Secundario (20%): undefined |
| `rockpolish` | **Rock Polish** | Rock | Status | Ajustes Stats: {"spe":2} |
| `rocksmash` | **Rock Smash** | Fighting | Physical | Secundario (50%): {"def":-1} |
| `rockwrecker` | **Rock Wrecker** | Rock | Physical | Efecto Propio: {"volatileStatus":"mustrecharge"} |
| `rollingkick` | **Rolling Kick** | Fighting | Physical | Secundario (30%): undefined |
| `sacredfire` | **Sacred Fire** | Fire | Physical | Secundario (50%): "brn" |
| `safeguard` | **Safeguard** | Normal | Status | Condición de Campo: safeguard |
| `saltcure` | **Salt Cure** | Rock | Physical | Secundario (100%): undefined |
| `sandsearstorm` | **Sandsear Storm** | Ground | Special | Secundario (20%): "brn" |
| `sandtomb` | **Sand Tomb** | Ground | Physical | Estado Volátil: partiallytrapped |
| `scald` | **Scald** | Water | Special | Secundario (30%): "brn" |
| `scorchingsands` | **Scorching Sands** | Ground | Special | Secundario (30%): "brn" |
| `searingshot` | **Searing Shot** | Fire | Special | Secundario (30%): "brn" |
| `secretpower` | **Secret Power** | Normal | Physical | Secundario (30%): "par" |
| `seedflare` | **Seed Flare** | Grass | Special | Secundario (40%): {"spd":-2} |
| `shadowbone` | **Shadow Bone** | Ghost | Physical | Secundario (20%): {"def":-1} |
| `sharpen` | **Sharpen** | Normal | Status | Ajustes Stats: {"atk":1} |
| `shedtail` | **Shed Tail** | Normal | Status | Estado Volátil: substitute, Efecto Propio: {} |
| `shellsidearm` | **Shell Side Arm** | Poison | Special | Secundario (20%): "psn" |
| `shellsmash` | **Shell Smash** | Normal | Status | Ajustes Stats: {"def":-1,"spd":-1,"atk":2,"spa":2,"spe":2} |
| `shelter` | **Shelter** | Steel | Status | Ajustes Stats: {"def":2} |
| `shiftgear` | **Shift Gear** | Steel | Status | Ajustes Stats: {"spe":2,"atk":1} |
| `signalbeam` | **Signal Beam** | Bug | Special | Secundario (10%): undefined |
| `silktrap` | **Silk Trap** | Bug | Status | Estado Volátil: silktrap |
| `sizzlyslide` | **Sizzly Slide** | Fire | Physical | Secundario (100%): "brn" |
| `skittersmack` | **Skitter Smack** | Bug | Physical | Secundario (100%): {"spa":-1} |
| `skyattack` | **Sky Attack** | Flying | Physical | Secundario (30%): undefined |
| `sludgewave` | **Sludge Wave** | Poison | Special | Secundario (10%): "psn" |
| `smackdown` | **Smack Down** | Rock | Physical | Estado Volátil: smackdown |
| `snaptrap` | **Snap Trap** | Grass | Physical | Estado Volátil: partiallytrapped |
| `snarl` | **Snarl** | Dark | Special | Secundario (100%): {"spa":-1} |
| `snore` | **Snore** | Normal | Special | Secundario (30%): undefined |
| `snowscape` | **Snowscape** | Ice | Status | Clima: snowscape |
| `sparklingaria` | **Sparkling Aria** | Water | Special | Secundario (100%): undefined |
| `sparklyswirl` | **Sparkly Swirl** | Fairy | Special | Efecto Propio: {} |
| `spicyextract` | **Spicy Extract** | Grass | Status | Ajustes Stats: {"atk":2,"def":-2} |
| `spikes` | **Spikes** | Ground | Status | Condición de Campo: spikes |
| `spikyshield` | **Spiky Shield** | Grass | Status | Estado Volátil: spikyshield |
| `spinout` | **Spin Out** | Steel | Physical | Efecto Propio: {"boosts":{"spe":-2}} |
| `spiritbreak` | **Spirit Break** | Fairy | Physical | Secundario (100%): {"spa":-1} |
| `spiritshackle` | **Spirit Shackle** | Ghost | Physical | Secundario (100%): undefined |
| `splishysplash` | **Splishy Splash** | Water | Special | Secundario (30%): "par" |
| `spotlight` | **Spotlight** | Normal | Status | Estado Volátil: spotlight |
| `springtidestorm` | **Springtide Storm** | Fairy | Special | Secundario (30%): {"atk":-1} |
| `stealthrock` | **Stealth Rock** | Rock | Status | Condición de Campo: stealthrock |
| `steameruption` | **Steam Eruption** | Water | Special | Secundario (30%): "brn" |
| `steamroller` | **Steamroller** | Bug | Physical | Secundario (30%): undefined |
| `steelwing` | **Steel Wing** | Steel | Physical | Secundario (10%): undefined |
| `stickyweb` | **Sticky Web** | Bug | Status | Condición de Campo: stickyweb |
| `stockpile` | **Stockpile** | Normal | Status | Estado Volátil: stockpile |
| `stokedsparksurfer` | **Stoked Sparksurfer** | Electric | Special | Secundario (100%): "par" |
| `stoneaxe` | **Stone Axe** | Rock | Physical | Secundario (undefined%): undefined |
| `strangesteam` | **Strange Steam** | Fairy | Special | Secundario (20%): undefined |
| `strugglebug` | **Struggle Bug** | Bug | Special | Secundario (100%): {"spa":-1} |
| `substitute` | **Substitute** | Normal | Status | Estado Volátil: substitute |
| `swagger` | **Swagger** | Normal | Status | Ajustes Stats: {"atk":2}, Estado Volátil: confusion |
| `sweetscent` | **Sweet Scent** | Normal | Status | Ajustes Stats: {"evasion":-2} |
| `syrupbomb` | **Syrup Bomb** | Grass | Special | Secundario (100%): undefined |
| `tailglow` | **Tail Glow** | Bug | Status | Ajustes Stats: {"spa":3} |
| `tailwind` | **Tailwind** | Flying | Status | Condición de Campo: tailwind |
| `tarshot` | **Tar Shot** | Rock | Status | Ajustes Stats: {"spe":-1}, Estado Volátil: tarshot |
| `taunt` | **Taunt** | Dark | Status | Estado Volátil: taunt |
| `tearfullook` | **Tearful Look** | Normal | Status | Ajustes Stats: {"atk":-1,"spa":-1} |
| `teeterdance` | **Teeter Dance** | Normal | Status | Estado Volátil: confusion |
| `telekinesis` | **Telekinesis** | Psychic | Status | Estado Volátil: telekinesis |
| `thousandarrows` | **Thousand Arrows** | Ground | Physical | Estado Volátil: smackdown |
| `thrash` | **Thrash** | Normal | Physical | Efecto Propio: {"volatileStatus":"lockedmove"} |
| `throatchop` | **Throat Chop** | Dark | Physical | Secundario (100%): undefined |
| `thundercage` | **Thunder Cage** | Electric | Special | Estado Volátil: partiallytrapped |
| `thunderouskick` | **Thunderous Kick** | Fighting | Physical | Secundario (100%): {"def":-1} |
| `thunderpunch` | **Thunder Punch** | Electric | Physical | Secundario (10%): "par" |
| `tickle` | **Tickle** | Normal | Status | Ajustes Stats: {"atk":-1,"def":-1} |
| `torchsong` | **Torch Song** | Fire | Special | Secundario (100%): undefined |
| `torment` | **Torment** | Dark | Status | Estado Volátil: torment |
| `toxicspikes` | **Toxic Spikes** | Poison | Status | Condición de Campo: toxicspikes |
| `toxicthread` | **Toxic Thread** | Poison | Status | Condición de Estado: psn, Ajustes Stats: {"spe":-1} |
| `trailblaze` | **Trailblaze** | Grass | Physical | Secundario (100%): undefined |
| `triattack` | **Tri Attack** | Normal | Special | Secundario (20%): undefined |
| `tropkick` | **Trop Kick** | Grass | Physical | Secundario (100%): {"atk":-1} |
| `twineedle` | **Twineedle** | Bug | Physical | Secundario (20%): "psn" |
| `twister` | **Twister** | Dragon | Special | Secundario (20%): undefined |
| `upperhand` | **Upper Hand** | Fighting | Physical | Secundario (100%): undefined |
| `uproar` | **Uproar** | Normal | Special | Efecto Propio: {"volatileStatus":"uproar"} |
| `vcreate` | **V-create** | Fire | Physical | Efecto Propio: {"boosts":{"spe":-1,"def":-1,"spd":-1}} |
| `victorydance` | **Victory Dance** | Fighting | Status | Ajustes Stats: {"atk":1,"def":1,"spe":1} |
| `volttackle` | **Volt Tackle** | Electric | Physical | Secundario (10%): "par" |
| `waterfall` | **Waterfall** | Water | Physical | Secundario (20%): undefined |
| `whirlpool` | **Whirlpool** | Water | Special | Estado Volátil: partiallytrapped |
| `wickedtorque` | **Wicked Torque** | Dark | Physical | Secundario (10%): "slp" |
| `wideguard` | **Wide Guard** | Rock | Status | Condición de Campo: wideguard |
| `wildboltstorm` | **Wildbolt Storm** | Electric | Special | Secundario (20%): "par" |
| `wish` | **Wish** | Normal | Status | Next turn, 50% of the user's max HP is restored. |
| `workup` | **Work Up** | Normal | Status | Ajustes Stats: {"atk":1,"spa":1} |
| `wrap` | **Wrap** | Normal | Physical | Estado Volátil: partiallytrapped |
| `yawn` | **Yawn** | Normal | Status | Estado Volátil: yawn |
| `zapcannon` | **Zap Cannon** | Electric | Special | Secundario (100%): "par" |
| `zenheadbutt` | **Zen Headbutt** | Psychic | Physical | Secundario (20%): undefined |
| `zingzap` | **Zing Zap** | Electric | Physical | Secundario (30%): undefined |
| `zippyzap` | **Zippy Zap** | Electric | Physical | Secundario (100%): undefined |
| `paleowave` | **Paleo Wave** | Rock | Special | Secundario (20%): {"atk":-1} |
| `shadowstrike` | **Shadow Strike** | Ghost | Physical | Secundario (50%): {"def":-1} |
| `polarflare` | **Polar Flare** | Fire | Special | Secundario (10%): "frz" |
