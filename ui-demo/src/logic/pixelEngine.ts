// ui-demo/src/logic/pixelEngine.ts
/**
 * Universal Mathematical Bresenham & Chamfer Pixel Engine for GBA-style UI
 * Dynamically computes pixelated polygon clip-paths for parameterized radii:
 * - XS: Radius 1 block (Micro chamfer / 45-deg notch)
 * - SM: Radius 2 blocks (Tabs, Inputs, Small Buttons)
 * - MD: Radius 4 blocks (Cards, Slots, Medium Buttons)
 * - LG: Radius 8 blocks (Team Cards, Medium Modals)
 * - XL: Radius 12 blocks (Large Modals, Inventory, Detail)
 * - XXL: Radius 16 blocks (Full-window / Large Panels)
 * Also supports Straight 45° Chamfer models for sci-fi / arcade comparison.
 */

interface RawCoord {
  x: number;
  y: number;
}

export interface PolygonPaths {
  outerPath: string;
  innerPath: string;
  borderPath: string;
}

export const CORNER_MODELS = ['bresenham', 'chamfer', 'wide'] as const;
export type CornerModelId = typeof CORNER_MODELS[number];

const ARC_START_DEG = 270;
const ARC_END_DEG = 225;
const FULL_CIRCLE_DEG = 360;
const ROUNDING_OFFSET = 0.5;

export const RADIUS_XS = 1;
export const RADIUS_SM = 2;
export const RADIUS_MD = 4;
export const RADIUS_LG = 8;
export const RADIUS_XL = 12;
export const RADIUS_XXL = 16;

export const DEFAULT_FRAME_BORDER_WIDTH = 1;

let currentScale = 3; // singleton-ok: Module-level state
let currentModel: CornerModelId = 'bresenham'; // singleton-ok: Module-level state

function generatePoints(radius: number, pixelSize: number, offset = 0): RawCoord[] {
  const coords: RawCoord[] = [];
  const lastCoords = { x: -1, y: -1 };
  for (let i = ARC_START_DEG; i > ARC_END_DEG; i--) {
    const x = Math.trunc(radius * Math.sin((2 * Math.PI * i) / FULL_CIRCLE_DEG) + radius + ROUNDING_OFFSET) * pixelSize;
    const y = Math.trunc(radius * Math.cos((2 * Math.PI * i) / FULL_CIRCLE_DEG) + radius + ROUNDING_OFFSET) * pixelSize;
    if (x !== lastCoords.x || y !== lastCoords.y) {
      lastCoords.x = x;
      lastCoords.y = y;
      coords.push({ x: x + offset * pixelSize, y: y + offset * pixelSize });
    }
  }
  return addCorners(mergeCoords(coords));
}

function flipCoords(coords: RawCoord[]): RawCoord[] {
  const mirrored: RawCoord[] = coords.map(({ x, y }) => ({ x: y, y: x })).reverse();
  return [...coords, ...mirrored].filter(
    ({ x, y }, i, arr) => !i || arr[i - 1]?.x !== x || arr[i - 1]?.y !== y
  );
}

function insetCoords(coords: RawCoord[], pixelSize: number, offset: number): RawCoord[] {
  return coords
    .map(({ x, y }) => ({
      x: x + pixelSize * offset,
      y: y + pixelSize * Math.floor(offset / 2),
    }))
    .reduce<RawCoord[]>((ret, item) => {
      if (ret.length > 0 && ret[ret.length - 1]?.x === ret[ret.length - 1]?.y) return ret;
      ret.push(item);
      return ret;
    }, []);
}

function mergeCoords(coords: RawCoord[]): RawCoord[] {
  return coords.reduce<RawCoord[]>((result, point, index) => {
    if (index !== coords.length - 1 && point.x === 0 && coords[index + 1]?.x === 0) return result;
    if (index !== 0 && point.y === 0 && coords[index - 1]?.y === 0) return result;
    if (
      index !== 0 &&
      index !== coords.length - 1 &&
      point.x === coords[index - 1]?.x &&
      point.x === coords[index + 1]?.x
    ) {
      return result;
    }
    result.push(point);
    return result;
  }, []);
}

function addCorners(coords: RawCoord[]): RawCoord[] {
  return coords.reduce<RawCoord[]>((result, point, i) => {
    result.push(point);
    if (coords.length > 1 && i < coords.length - 1) {
      const next = coords[i + 1];
      if (next && next.x !== point.x && next.y !== point.y) {
        result.push({ x: next.x, y: point.y });
      }
    }
    return result;
  }, []);
}

function edgeCoord(n: number, offset: number): string {
  if (offset) return n === 0 ? `calc(100% - ${offset}px)` : `calc(100% - ${offset + n}px)`;
  return n === 0 ? '100%' : `calc(100% - ${n}px)`;
}

function mirrorCoords(coords: RawCoord[], offset = 0): { x: string; y: string }[] {
  return [
    ...coords.map(({ x, y }) => ({
      x: offset ? `${x + offset}px` : `${x}px`,
      y: offset ? `${y + offset}px` : `${y}px`,
    })),
    ...coords.map(({ x, y }) => ({
      x: edgeCoord(y, offset),
      y: offset ? `${x + offset}px` : `${x}px`,
    })),
    ...coords.map(({ x, y }) => ({
      x: edgeCoord(x, offset),
      y: edgeCoord(y, offset),
    })),
    ...coords.map(({ x, y }) => ({
      x: offset ? `${y + offset}px` : `${y}px`,
      y: edgeCoord(x, offset),
    })),
  ];
}

function generatePath(coords: RawCoord[], reverse = false): string {
  const mirrored = mirrorCoords(coords);
  return (reverse ? mirrored : mirrored.reverse()).map(p => `${p.x} ${p.y}`).join(', ');
}

export function getPixelFramePolygons(radius: number, pixelSize: number, borderWidth = DEFAULT_FRAME_BORDER_WIDTH): PolygonPaths {
  const outerCoords = flipCoords(generatePoints(radius, pixelSize));
  const outerPath = generatePath(outerCoords);
  const innerCoords = addCorners(
    flipCoords(
      borderWidth < radius
        ? insetCoords(generatePoints(radius, pixelSize), pixelSize, borderWidth)
        : generatePoints(RADIUS_XS, pixelSize, borderWidth)
    )
  );
  const innerPath = generatePath(innerCoords, true);
  const borderPath = `${outerPath}, 0px 50%, ${borderWidth * pixelSize}px 50%, ${innerPath}, ${borderWidth * pixelSize}px 50%, 0px 50%`;
  return { outerPath, innerPath, borderPath };
}

export function getChamferFramePolygons(blocks: number, pixelSize: number, borderWidth = DEFAULT_FRAME_BORDER_WIDTH): PolygonPaths {
  const outerCut = blocks * pixelSize;
  const outerCoords = [{ x: 0, y: outerCut }, { x: outerCut, y: 0 }];
  const outerPath = mirrorCoords(outerCoords).map(p => `${p.x} ${p.y}`).join(', ');

  const b = borderWidth * pixelSize;
  const innerCut = Math.max(b, outerCut);
  const innerCoords = [{ x: b, y: innerCut }, { x: innerCut, y: b }];
  const innerPath = mirrorCoords(innerCoords).reverse().map(p => `${p.x} ${p.y}`).join(', ');
  const borderPath = `${outerPath}, 0px 50%, ${b}px 50%, ${innerPath}, ${b}px 50%, 0px 50%`;
  return { outerPath, innerPath, borderPath };
}

function applyPolygonVars(prefix: string, polygons: PolygonPaths): void {
  document.documentElement.style.setProperty(`--clip-${prefix}-outer`, `polygon(${polygons.outerPath})`);
  document.documentElement.style.setProperty(`--clip-${prefix}-border`, `polygon(${polygons.borderPath})`);
  document.documentElement.style.setProperty(`--clip-${prefix}-inner`, `polygon(${polygons.innerPath})`);
  document.documentElement.style.setProperty(`--clip-${prefix}`, `polygon(${polygons.outerPath})`);
}

export function updatePixelScale(pixelSize: number, model: CornerModelId = currentModel): void {
  if (typeof document === 'undefined') return;

  currentScale = pixelSize;
  currentModel = model;

  document.documentElement.style.setProperty('--s', `${pixelSize}px`);

  // 1. Curvas Bresenham Escalonadas (Píxeles escalonados circulares)
  const lXs = getPixelFramePolygons(RADIUS_XS, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const lSm = getPixelFramePolygons(RADIUS_SM, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const lMd = getPixelFramePolygons(RADIUS_MD, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const lLg = getPixelFramePolygons(RADIUS_LG, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const lXl = getPixelFramePolygons(RADIUS_XL, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const lXxl = getPixelFramePolygons(RADIUS_XXL, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);

  applyPolygonVars('curve-xs', lXs);
  applyPolygonVars('curve-sm', lSm);
  applyPolygonVars('curve-md', lMd);
  applyPolygonVars('curve-lg', lLg);
  applyPolygonVars('curve-xl', lXl);
  applyPolygonVars('curve-xxl', lXxl);

  // 2. Chaflanes Rectos 45° (Notch lineal diagonal)
  const chXs = getChamferFramePolygons(RADIUS_XS, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const chSm = getChamferFramePolygons(RADIUS_SM, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const chMd = getChamferFramePolygons(RADIUS_MD, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const chLg = getChamferFramePolygons(RADIUS_LG, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);
  const chXl = getChamferFramePolygons(RADIUS_XL, pixelSize, DEFAULT_FRAME_BORDER_WIDTH);

  applyPolygonVars('chamfer-xs', chXs);
  applyPolygonVars('chamfer-sm', chSm);
  applyPolygonVars('chamfer-md', chMd);
  applyPolygonVars('chamfer-lg', chLg);
  applyPolygonVars('chamfer-xl', chXl);

  // 3. Asignación Semántica según Modelo Seleccionado
  if (model === 'chamfer') {
    applyPolygonVars('pill', chXs);
    applyPolygonVars('control', chSm);
    applyPolygonVars('btn', chSm);
    applyPolygonVars('panel', chMd);
    applyPolygonVars('card', chMd);
    applyPolygonVars('modal', chLg);
  } else if (model === 'wide') {
    applyPolygonVars('pill', lXs);
    applyPolygonVars('control', lMd);
    applyPolygonVars('btn', lSm);
    applyPolygonVars('panel', lLg);
    applyPolygonVars('card', lXl);
    applyPolygonVars('modal', lXxl);
  } else {
    // bresenham (canónico)
    applyPolygonVars('pill', lXs);
    applyPolygonVars('control', lSm);
    applyPolygonVars('btn', lSm);
    applyPolygonVars('panel', lMd);
    applyPolygonVars('card', lLg);
    applyPolygonVars('modal', lXl);
  }
}

export function setCornerModel(model: CornerModelId): void {
  updatePixelScale(currentScale, model);
}
