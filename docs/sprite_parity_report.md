<!-- markdownlint-disable MD033 -->
# Reporte de Paridad de Sprites de Pokémon

Este reporte analiza la consistencia de archivos entre las carpetas de sprites de la Pokédex en `_raw-assets/Pokemon/`.

## Resumen de Archivos Totales

- **Vistas Frontales (Front)**: 1606 sprites
- **Vistas Traseras (Back)**: 1605 sprites
- **Vistas Frontales Shiny (Front shiny)**: 1600 sprites
- **Vistas Traseras Shiny (Back shiny)**: 1587 sprites
- **Iconos Normales (Icons)**: 1518 sprites
- **Iconos Shiny (Icons shiny)**: 1505 sprites
- **Huellas (Footprints)**: 1039 sprites

## 1. Paridad Vista Frontal vs Trasera (Normal)

### Faltantes en Back (Existen en Front pero NO en Back) (1 archivos faltantes)

Sprites frontales que no disponen de su correspondiente vista de espaldas (impidiendo mostrar correctamente al Pokémon del jugador en combate).

<details>
<summary>Ver lista de archivos faltantes</summary>

- `890_1.png`

</details>

### Faltantes en Front (Existen en Back pero NO en Front) (0 archivos faltantes)

Sprites traseros que no tienen su correspondiente vista frontal (impidiendo mostrar al Pokémon rival o salvaje).

- ✅ Paridad completa. No faltan archivos.

## 2. Paridad Vista Frontal vs Trasera (Shiny)

### Faltantes en Back Shiny (Existen en Front Shiny pero NO en Back Shiny) (13 archivos faltantes)

Sprites frontales brillantes sin su respectiva vista de espaldas brillante.

<details>
<summary>Ver lista de archivos faltantes</summary>

- `890_1.png`
- `1017_1.png`
- `1017_10.png`
- `1017_11.png`
- `1017_2.png`
- `1017_3.png`
- `1017_4.png`
- `1017_5.png`
- `1017_6.png`
- `1017_7.png`
- `1017_8.png`
- `1017_9.png`
- `1017.png`

</details>

### Faltantes en Front Shiny (Existen en Back Shiny pero NO en Front Shiny) (0 archivos faltantes)

Sprites traseros brillantes sin su respectiva vista frontal brillante.

- ✅ Paridad completa. No faltan archivos.

## 3. Paridad con Iconos

Los iconos usualmente no distinguen entre diferencias sutiles como género (ej. `_f`), pero sí deberían cubrir las formas principales.

### Faltantes en Icons (Existen en Front pero NO en Icons) (89 archivos faltantes)

Pokémon con vista frontal que no tienen icono en el inventario o caja.

<details>
<summary>Ver lista de archivos faltantes</summary>

- `3_f.png`
- `12_f.png`
- `19_f.png`
- `20_f.png`
- `41_f.png`
- `42_f.png`
- `44_f.png`
- `45_f.png`
- `64_f.png`
- `65_f.png`
- `84_f.png`
- `85_f.png`
- `97_f.png`
- `111_f.png`
- `112_f.png`
- `118_f.png`
- `119_f.png`
- `123_f.png`
- `129_f.png`
- `154_f.png`
- `165_f.png`
- `166_f.png`
- `172_2.png`
- `178_f.png`
- `185_f.png`
- `186_f.png`
- `190_f.png`
- `194_f.png`
- `195_f.png`
- `198_f.png`
- `203_f.png`
- `207_f.png`
- `208_f.png`
- `212_f.png`
- `215_1_f.png`
- `215_f.png`
- `217_f.png`
- `221_f.png`
- `224_f.png`
- `229_f.png`
- `232_f.png`
- `257_f.png`
- `267_f.png`
- `269_f.png`
- `272_f.png`
- `274_f.png`
- `275_f.png`
- `307_f.png`
- `308_f.png`
- `315_f.png`
- `316_f.png`
- `317_f.png`
- `322_f.png`
- `323_f.png`
- `332_f.png`
- `350_f.png`
- `369_f.png`
- `396_f.png`
- `397_f.png`
- `398_f.png`
- `399_f.png`
- `400_f.png`
- `401_f.png`
- `402_f.png`
- `403_f.png`
- `404_f.png`
- `405_f.png`
- `407_f.png`
- `417_f.png`
- `418_f.png`
- `419_f.png`
- `424_f.png`
- `443_f.png`
- `444_f.png`
- `445_f.png`
- `453_f.png`
- `454_f.png`
- `456_f.png`
- `457_f.png`
- `459_f.png`
- `460_f.png`
- `461_f.png`
- `464_f.png`
- `465_f.png`
- `473_f.png`
- `649_1.png`
- `649_2.png`
- `649_3.png`
- `649_4.png`

</details>

### Faltantes en Icons Shiny (Existen en Front Shiny pero NO en Icons Shiny) (101 archivos faltantes)

Pokémon shiny con vista frontal que no tienen icono brillante.

<details>
<summary>Ver lista de archivos faltantes</summary>

- `3_f.png`
- `12_f.png`
- `19_f.png`
- `20_f.png`
- `41_f.png`
- `42_f.png`
- `44_f.png`
- `45_f.png`
- `64_f.png`
- `65_f.png`
- `84_f.png`
- `85_f.png`
- `97_f.png`
- `111_f.png`
- `112_f.png`
- `118_f.png`
- `119_f.png`
- `123_f.png`
- `129_f.png`
- `154_f.png`
- `165_f.png`
- `166_f.png`
- `172_2.png`
- `178_f.png`
- `185_f.png`
- `186_f.png`
- `190_f.png`
- `194_f.png`
- `195_f.png`
- `198_f.png`
- `203_f.png`
- `207_f.png`
- `208_f.png`
- `212_f.png`
- `215_1_f.png`
- `215_f.png`
- `217_f.png`
- `221_f.png`
- `224_f.png`
- `229_f.png`
- `232_f.png`
- `257_f.png`
- `267_f.png`
- `269_f.png`
- `272_f.png`
- `274_f.png`
- `275_f.png`
- `307_f.png`
- `308_f.png`
- `315_f.png`
- `316_f.png`
- `317_f.png`
- `322_f.png`
- `323_f.png`
- `332_f.png`
- `350_f.png`
- `369_f.png`
- `396_f.png`
- `397_f.png`
- `398_f.png`
- `399_f.png`
- `400_f.png`
- `401_f.png`
- `402_f.png`
- `403_f.png`
- `404_f.png`
- `405_f.png`
- `407_f.png`
- `417_f.png`
- `418_f.png`
- `419_f.png`
- `424_f.png`
- `443_f.png`
- `444_f.png`
- `445_f.png`
- `453_f.png`
- `454_f.png`
- `456_f.png`
- `457_f.png`
- `459_f.png`
- `460_f.png`
- `461_f.png`
- `464_f.png`
- `465_f.png`
- `473_f.png`
- `649_1.png`
- `649_2.png`
- `649_3.png`
- `649_4.png`
- `1017_1.png`
- `1017_10.png`
- `1017_11.png`
- `1017_2.png`
- `1017_3.png`
- `1017_4.png`
- `1017_5.png`
- `1017_6.png`
- `1017_7.png`
- `1017_8.png`
- `1017_9.png`
- `1017.png`

</details>

## 4. Paridad Normal vs Shiny

### Faltantes en Front Shiny (Existen en Front pero NO en Front Shiny) (6 archivos faltantes)

Sprites normales frontales que carecen de variante brillante/shiny.

<details>
<summary>Ver lista de archivos faltantes</summary>

- `25_2.png`
- `25_3.png`
- `25_4.png`
- `25_5.png`
- `25_6.png`
- `25_7.png`

</details>

### Faltantes en Back Shiny (Existen en Back pero NO en Back Shiny) (18 archivos faltantes)

Sprites normales traseros que carecen de variante brillante/shiny.

<details>
<summary>Ver lista de archivos faltantes</summary>

- `25_2.png`
- `25_3.png`
- `25_4.png`
- `25_5.png`
- `25_6.png`
- `25_7.png`
- `1017_1.png`
- `1017_10.png`
- `1017_11.png`
- `1017_2.png`
- `1017_3.png`
- `1017_4.png`
- `1017_5.png`
- `1017_6.png`
- `1017_7.png`
- `1017_8.png`
- `1017_9.png`
- `1017.png`

</details>
