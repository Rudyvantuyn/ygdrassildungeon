import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ForestFloorMap, ForestPoi, ForestPoiKind } from "@ygd/shared";

interface TiledProperty {
  name: string;
  type?: string;
  value: unknown;
}

interface TiledObject {
  id: number;
  name?: string;
  type?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: TiledProperty[];
}

interface TiledLayer {
  name: string;
  type: string;
  objects?: TiledObject[];
}

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  layers: TiledLayer[];
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const floorsRoot = join(projectRoot, "game", "content", "floors");
const supportedExtensions = new Set([".tmj", ".json"]);

const floorsBySeason = loadFloorMaps();

export function getForestFloorMap(floorNumber: number, seasonId = "s1"): ForestFloorMap | null {
  const season = floorsBySeason.get(seasonId);
  if (!season) {
    return null;
  }
  return season.find((floor) => floor.floorNumber === floorNumber) ?? null;
}

export function getForestMaxAuthoredFloor(seasonId = "s1"): number {
  const season = floorsBySeason.get(seasonId);
  return season?.at(-1)?.floorNumber ?? 1;
}

function loadFloorMaps(): Map<string, ForestFloorMap[]> {
  const loaded = new Map<string, ForestFloorMap[]>();
  const seasonDirs = safeReadDir(floorsRoot).filter((entry) => entry.isDirectory());
  for (const seasonDir of seasonDirs) {
    const seasonId = seasonDir.name;
    const seasonPath = join(floorsRoot, seasonId);
    const files = safeReadDir(seasonPath)
      .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    const seasonFloors = files.map((file) => {
      const floorPath = join(seasonPath, file.name);
      return parseTiledFloor(seasonId, floorPath, file.name);
    });
    seasonFloors.sort((a, b) => a.floorNumber - b.floorNumber);
    validateSeasonStairs(seasonFloors, seasonId);
    loaded.set(seasonId, seasonFloors);
  }
  return loaded;
}

function parseTiledFloor(seasonId: string, floorPath: string, fileName: string): ForestFloorMap {
  const raw = readFileSync(floorPath, "utf8");
  const tiled = JSON.parse(raw) as TiledMap;
  if (!tiled || !Array.isArray(tiled.layers)) {
    throw new Error(`Invalid Tiled file: ${fileName}`);
  }
  const width = Math.floor(tiled.width);
  const height = Math.floor(tiled.height);
  const tileWidth = Math.max(1, Math.floor(tiled.tilewidth));
  const tileHeight = Math.max(1, Math.floor(tiled.tileheight));
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid map dimensions in ${fileName}`);
  }

  const pathLayer = requireLayer(tiled.layers, "paths");
  const wallLayer = requireLayer(tiled.layers, "walls");
  const poiLayer = requireLayer(tiled.layers, "poi");
  const passable = createGrid(width, height, false);

  for (const object of pathLayer.objects ?? []) {
    forEachRectCell(object, tileWidth, tileHeight, width, height, (x, y) => {
      passable[y][x] = true;
    });
  }
  for (const object of wallLayer.objects ?? []) {
    forEachRectCell(object, tileWidth, tileHeight, width, height, (x, y) => {
      passable[y][x] = false;
    });
  }

  const rawPois = (poiLayer.objects ?? [])
    .filter((object) => String(object.type ?? "").trim().length > 0)
    .map((object) => parsePoi(object, tileWidth, tileHeight));
  const pois = rawPois.map((poi) => snapPoiToNearestPassable(poi, passable, width, height));
  const startPoi = pois.find((poi) => poi.kind === "start");
  if (!startPoi) {
    throw new Error(`Floor ${fileName} is missing start POI`);
  }
  const stairsDown = toCoordOrNull(pois.find((poi) => poi.kind === "stairs_down"));
  const stairsUp = toCoordOrNull(pois.find((poi) => poi.kind === "stairs_up"));

  if (!isInside(startPoi.x, startPoi.y, width, height)) {
    throw new Error(`Start position is out of bounds in ${fileName}`);
  }
  ensureReachable(passable, startPoi.x, startPoi.y, fileName);
  for (const poi of pois) {
    if (!isInside(poi.x, poi.y, width, height)) {
      throw new Error(`POI ${poi.id} is out of bounds in ${fileName}`);
    }
    if (!passable[poi.y]?.[poi.x]) {
      throw new Error(`POI ${poi.id} is not on a passable tile in ${fileName}`);
    }
  }

  const floorNumber = parseFloorNumber(fileName);
  return {
    seasonId,
    floorId: `${seasonId}-f${floorNumber}`,
    floorNumber,
    width,
    height,
    start: {
      x: startPoi.x,
      y: startPoi.y,
      heading: 0
    },
    stairsDown,
    stairsUp,
    passableCells: gridToCells(passable),
    pois
  };
}

function parsePoi(object: TiledObject, tileWidth: number, tileHeight: number): ForestPoi {
  const kind = normalizePoiKind(object.type);
  if (!kind) {
    throw new Error(`Unknown POI type: ${object.type ?? "(missing type)"}`);
  }
  const x = clampToInt(object.x / tileWidth);
  const y = clampToInt(object.y / tileHeight);
  return {
    id: object.name?.trim() || `${kind}_${object.id}`,
    kind,
    x,
    y,
    once: readBoolProperty(object.properties, "once"),
    lootTable: readStringProperty(object.properties, "lootTable"),
    eventId: readStringProperty(object.properties, "eventId"),
    encounterPool: readStringProperty(object.properties, "encounterPool")
  };
}

function snapPoiToNearestPassable(poi: ForestPoi, passable: boolean[][], width: number, height: number): ForestPoi {
  if (isInside(poi.x, poi.y, width, height) && passable[poi.y]?.[poi.x]) {
    return poi;
  }
  const nearest = findNearestPassableCell(poi.x, poi.y, passable, width, height);
  if (!nearest) {
    return poi;
  }
  return { ...poi, x: nearest.x, y: nearest.y };
}

function findNearestPassableCell(
  x: number,
  y: number,
  passable: boolean[][],
  width: number,
  height: number
): { x: number; y: number } | null {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));
  if (passable[clampedY]?.[clampedX]) {
    return { x: clampedX, y: clampedY };
  }
  const maxRadius = Math.max(width, height);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) + Math.abs(dy) !== radius) {
          continue;
        }
        const nx = clampedX + dx;
        const ny = clampedY + dy;
        if (!isInside(nx, ny, width, height)) {
          continue;
        }
        if (passable[ny]?.[nx]) {
          return { x: nx, y: ny };
        }
      }
    }
  }
  return null;
}

function normalizePoiKind(value: string | undefined): ForestPoiKind | null {
  if (
    value === "start" ||
    value === "stairs_down" ||
    value === "stairs_up" ||
    value === "mining" ||
    value === "treasure" ||
    value === "event" ||
    value === "encounter" ||
    value === "npc"
  ) {
    return value;
  }
  return null;
}

function readStringProperty(properties: TiledProperty[] | undefined, key: string): string | undefined {
  const value = properties?.find((property) => property.name === key)?.value;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolProperty(properties: TiledProperty[] | undefined, key: string): boolean | undefined {
  const value = properties?.find((property) => property.name === key)?.value;
  return typeof value === "boolean" ? value : undefined;
}

function toCoordOrNull(value: ForestPoi | undefined): { x: number; y: number } | null {
  return value ? { x: value.x, y: value.y } : null;
}

function validateSeasonStairs(floors: ForestFloorMap[], seasonId: string): void {
  for (let i = 0; i < floors.length; i += 1) {
    const floor = floors[i];
    if (!floor) {
      continue;
    }
    const isFinal = i === floors.length - 1;
    if (!isFinal && !floor.stairsDown) {
      throw new Error(`Season ${seasonId} floor ${floor.floorNumber} must define stairs_down`);
    }
  }
}

function forEachRectCell(
  object: TiledObject,
  tileWidth: number,
  tileHeight: number,
  width: number,
  height: number,
  apply: (x: number, y: number) => void
): void {
  const rectWidth = Math.max(tileWidth, clampToInt(object.width ?? tileWidth));
  const rectHeight = Math.max(tileHeight, clampToInt(object.height ?? tileHeight));
  const startX = clampToInt(object.x / tileWidth);
  const startY = clampToInt(object.y / tileHeight);
  const cellW = Math.max(1, clampToInt(rectWidth / tileWidth));
  const cellH = Math.max(1, clampToInt(rectHeight / tileHeight));
  for (let y = startY; y < startY + cellH; y += 1) {
    for (let x = startX; x < startX + cellW; x += 1) {
      if (!isInside(x, y, width, height)) {
        continue;
      }
      apply(x, y);
    }
  }
}

function ensureReachable(passable: boolean[][], startX: number, startY: number, fileName: string): void {
  const height = passable.length;
  const width = passable[0]?.length ?? 0;
  const seen = createGrid(width, height, false);
  const stack: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  while (stack.length > 0) {
    const next = stack.pop();
    if (!next) {
      continue;
    }
    if (!isInside(next.x, next.y, width, height) || seen[next.y][next.x] || !passable[next.y][next.x]) {
      continue;
    }
    seen[next.y][next.x] = true;
    stack.push({ x: next.x + 1, y: next.y });
    stack.push({ x: next.x - 1, y: next.y });
    stack.push({ x: next.x, y: next.y + 1 });
    stack.push({ x: next.x, y: next.y - 1 });
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (passable[y][x] && !seen[y][x]) {
        throw new Error(`Disconnected passable cell at ${x},${y} in ${fileName}`);
      }
    }
  }
}

function requireLayer(layers: TiledLayer[], layerName: string): TiledLayer {
  const layer = layers.find((candidate) => candidate.name === layerName && candidate.type === "objectgroup");
  if (!layer) {
    throw new Error(`Missing required object layer "${layerName}"`);
  }
  return layer;
}

function parseFloorNumber(fileName: string): number {
  const matched = fileName.match(/floor-(\d+)/i);
  if (!matched) {
    throw new Error(`Could not read floor number from ${fileName}`);
  }
  return Number(matched[1]);
}

function safeReadDir(path: string): Array<{ name: string; isFile(): boolean; isDirectory(): boolean }> {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

function createGrid(width: number, height: number, value: boolean): boolean[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => value));
}

function gridToCells(grid: boolean[][]): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < (grid[y]?.length ?? 0); x += 1) {
      if (grid[y][x]) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function isInside(x: number, y: number, width: number, height: number): boolean {
  return x >= 0 && y >= 0 && x < width && y < height;
}

function clampToInt(value: number): number {
  return Math.floor(Number.isFinite(value) ? value : 0);
}
