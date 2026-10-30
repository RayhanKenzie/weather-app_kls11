/**
 * Web Mercator helpers for the weather map.
 *
 * The map draws ordinary 256px raster tiles, so the projection maths lives
 * here instead of a native map dependency. That keeps the feature working on
 * iOS, Android and web with the modules the project already ships.
 */

export const TILE_SIZE = 256;
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 10;

/** Web Mercator cannot represent latitudes beyond this value. */
const MAX_LATITUDE = 85.05112878;

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapViewState extends LatLng {
  zoom: number;
}

export interface MapSize {
  width: number;
  height: number;
}

export interface MapBounds {
  north: number;
  south: number;
  west: number;
  east: number;
}

export interface MapTile {
  key: string;
  uri: string;
  left: number;
  top: number;
}

export function clampLatitude(latitude: number): number {
  return Math.min(MAX_LATITUDE, Math.max(-MAX_LATITUDE, latitude));
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
}

/** Wraps a longitude into the -180..180 range. */
export function normalizeLongitude(longitude: number): number {
  if (!Number.isFinite(longitude)) return 0;
  return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

function worldSize(zoom: number): number {
  return TILE_SIZE * 2 ** zoom;
}

/** Projects a coordinate to world pixels at the given zoom. */
export function projectToWorld({ latitude, longitude }: LatLng, zoom: number) {
  const sin = Math.sin((clampLatitude(latitude) * Math.PI) / 180);
  const size = worldSize(zoom);
  return {
    x: ((longitude + 180) / 360) * size,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size,
  };
}

export function unprojectFromWorld(x: number, y: number, zoom: number): LatLng {
  const size = worldSize(zoom);
  const longitude = normalizeLongitude((x / size) * 360 - 180);
  const n = Math.PI - (2 * Math.PI * y) / size;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude: clampLatitude(latitude), longitude };
}

/**
 * Screen position (in points) of a coordinate for the current view.
 * Coordinates are wrapped so the map can pan across the antimeridian.
 */
export function screenPoint(target: LatLng, view: MapViewState, size: MapSize) {
  const center = projectToWorld(view, view.zoom);
  const point = projectToWorld(target, view.zoom);
  const world = worldSize(view.zoom);

  let dx = point.x - center.x;
  if (dx > world / 2) dx -= world;
  if (dx < -world / 2) dx += world;

  return {
    x: size.width / 2 + dx,
    y: size.height / 2 + (point.y - center.y),
  };
}

/**
 * Geographic bounds covered by the viewport. `margin` above 1 fetches a
 * slightly larger area than the screen so short pans stay covered while the
 * next grid request is in flight.
 */
export function boundsForView(view: MapViewState, size: MapSize, margin = 1): MapBounds {
  const center = projectToWorld(view, view.zoom);
  const halfWidth = (size.width * margin) / 2;
  const halfHeight = (size.height * margin) / 2;

  const northWest = unprojectFromWorld(center.x - halfWidth, center.y - halfHeight, view.zoom);
  const southEast = unprojectFromWorld(center.x + halfWidth, center.y + halfHeight, view.zoom);

  return {
    north: northWest.latitude,
    south: southEast.latitude,
    west: northWest.longitude,
    east: southEast.longitude,
  };
}

/** New view state after the map was dragged by `dx`/`dy` screen points. */
export function panCenter(view: MapViewState, size: MapSize, dx: number, dy: number): MapViewState {
  const center = projectToWorld(view, view.zoom);
  const next = unprojectFromWorld(center.x - dx, center.y - dy, view.zoom);
  return { latitude: next.latitude, longitude: next.longitude, zoom: view.zoom };
}

/**
 * Raster tiles that cover the viewport, with one tile of padding on each side
 * so a drag does not reveal an empty strip before the view state commits.
 */
export function tilesForView(
  view: MapViewState,
  size: MapSize,
  style: "light" | "dark"
): MapTile[] {
  const count = 2 ** view.zoom;
  const center = projectToWorld(view, view.zoom);
  const left = center.x - size.width / 2;
  const top = center.y - size.height / 2;

  const minX = Math.floor(left / TILE_SIZE) - 1;
  const maxX = Math.floor((left + size.width) / TILE_SIZE) + 1;
  const minY = Math.max(0, Math.floor(top / TILE_SIZE) - 1);
  const maxY = Math.min(count - 1, Math.floor((top + size.height) / TILE_SIZE) + 1);

  const basemap = style === "dark" ? "dark_all" : "light_all";
  const subdomains = ["a", "b", "c", "d"];
  const tiles: MapTile[] = [];

  for (let x = minX; x <= maxX; x += 1) {
    // Longitude wraps around the globe, latitude stops at the poles.
    const tileX = ((x % count) + count) % count;
    for (let y = minY; y <= maxY; y += 1) {
      const subdomain = subdomains[(tileX + y) % subdomains.length];
      tiles.push({
        key: `${view.zoom}/${tileX}/${y}`,
        uri: `https://${subdomain}.basemaps.cartocdn.com/${basemap}/${view.zoom}/${tileX}/${y}@2x.png`,
        left: x * TILE_SIZE - left,
        top: y * TILE_SIZE - top,
      });
    }
  }

  return tiles;
}
