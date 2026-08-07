const DATA_URL = new URL("./data/commute_map_data.json", import.meta.url).toString();
const DEFAULT_TRANSIT_TIME_MINUTES = 4;
const DEFAULT_MAX_TIME_MINUTES = 60;
const MIN_AREA_WEIGHT = 1;
const MAX_AREA_WEIGHT = 2.67;
const MIN_VIEWPORT_SCALE = 1;
const MAX_VIEWPORT_SCALE = 4;
const VIEWPORT_ZOOM_STEP = 1.35;
const PANEL_PADDING = 18;
const ROUTE_LINE_WIDTH = 2.2;
const WEIGHT_BLUR_PASSES = 2;
const WEIGHT_BLUR_RADIUS = 2;
const HOVER_DEADBAND = 14;
const MOBILE_PIN_TAP_SLOP = 10;
const MOBILE_PIN_HIT_RADIUS = 26;
const DESKTOP_PIN_TAP_SLOP = 6;
const DESKTOP_PIN_HIT_RADIUS = 18;
const HEATMAP_RESOLUTION_SCALE = 1;
const LIVE_HEATMAP_RESOLUTION_SCALE = 0.55;
const HEATMAP_BLUR_PX = 5;
const LIVE_HEATMAP_BLUR_PX = 3;
const HEATMAP_ALPHA = 0.8;
const WARP_GRID_SAMPLE_STEP = 2;
const LIVE_WARP_GRID_SAMPLE_STEP = 2;
const WARP_INFLUENCE_RADIUS = 8;
const WARP_SIGMA_CELLS = 3.4;
const WARP_DISPLACEMENT_SCALE = 1.0;
const WARP_MAX_SHIFT_CELLS = 6.6;
const WARP_NODE_SMOOTHING_PASSES = 3;
const LIVE_WARP_NODE_SMOOTHING_PASSES = 3;
const WARP_EDGE_FADE_CELLS = 10;
const IMAGE_WARP_BLOCK_CELLS = 4;
const IMAGE_WARP_OVERDRAW_PX = 0.35;
const LIVE_HEATMAP_CELL_STEP = 2;
const WARP_LINE_CURVE_TOLERANCE_PX = 2.4;
const WARP_LINE_MAX_SUBDIVISION_DEPTH = 4;
const DEFAULT_SWIM_METERS_PER_MINUTE = 28;
const SHARE_COORDINATE_DECIMALS = 5;
const EMOJI_BURST_INTERVAL_MS = 90;
const EMOJI_BURST_PER_TICK = 3;
const EMOJI_BURST_LIFETIME_MS = 900;
const MOBILE_DRAWER_SWIPE_THRESHOLD_PX = 36;
const METERS_PER_MINUTE_PER_MPH = 26.8224;
const SETTINGS_STORAGE_KEY = "chicago-cartogram-settings-v1";
const FAVORITES_STORAGE_KEY = "chicago-cartogram-favorites-v1";
const MAX_FAVORITES = 12;
const TRAVEL_MODE_KEYS = ["subway", "metra", "drive", "bus", "bike", "walk"];
const DEFAULT_TRAVEL_MODES = {
  subway: true,
  metra: false,
  drive: false,
  bus: false,
  bike: false,
  walk: false,
};
const DEFAULT_LAYER_VISIBILITY = {
  interactionMarkers: true,
  neighborhoodLabels: true,
  stations: true,
  reachabilityOutline: true,
  heatmap: true,
  transitRoutes: true,
  streets: true,
  parks: true,
  externalLand: true,
  lake: true,
  panelBackground: true,
};
const DIRECT_MODE_SPEEDS = {
  drive: 18 * METERS_PER_MINUTE_PER_MPH,
  bike: 12 * METERS_PER_MINUTE_PER_MPH,
};
const DIRECT_MODE_DISTANCE_MULTIPLIERS = {
  drive: 1.35,
  bike: 1.18,
  walk: 1,
};
const DRIVE_ACCESS_PENALTY_MINUTES = 4;
// Fill in with your deployed routing-proxy Worker URL (see worker/index.js and
// README) to have the pinned probe measurement follow real streets for
// walk/bike/drive instead of the straight-line estimate above. Left blank,
// this feature silently no-ops and the app behaves exactly as before.
const ROAD_ROUTING_PROXY_URL = "";
const ROAD_ROUTING_PROFILES = { walk: "foot-walking", bike: "cycling-regular", drive: "driving-car" };
const ROAD_ROUTING_TIMEOUT_MS = 6000;
const WARP_QUALITY_OPTIONS = {
  full: {
    quality: "full",
    sampleStep: WARP_GRID_SAMPLE_STEP,
    smoothingPasses: WARP_NODE_SMOOTHING_PASSES,
    includeReachability: true,
  },
  live: {
    quality: "live",
    sampleStep: LIVE_WARP_GRID_SAMPLE_STEP,
    smoothingPasses: LIVE_WARP_NODE_SMOOTHING_PASSES,
    includeReachability: false,
  },
};

const EMOJI_BURST_SETS = {
  github: ["💻", "🖥️", "⌨️", "⚙️", "🧑‍💻"],
  chicago: ["🌆", "🚊", "🌊", "⭐", "🏙️"],
  transit: ["🚇", "🚉", "🚊", "🚦", "🛤️"],
  maps: ["🗺️", "📍", "🧭", "➡️", "📌"],
  parks: ["🌳", "🌲", "🌿", "🍃", "🌱"],
  anthony: ["🤓", "✨", "🧠", "💫", "🪄"],
  twitter: ["🐦", "🕊️", "🐥", "🪽"],
  linkedin: ["💼", "📈", "🤝", "🧠", "📊"],
  coffee: ["☕", "🥤", "🧋", "🍵"],
};

const state = {
  data: null,
  ready: false,
  showWarp: true,
  showHeatmap: false,
  showReachOutline: false,
  activeModes: { ...DEFAULT_TRAVEL_MODES },
  layerVisibility: { ...DEFAULT_LAYER_VISIBILITY },
  showPinHint: true,
  isMobile: false,
  drawerCollapsed: false,
  mobileHelpCollapsed: false,
  viewportScale: 1,
  viewportCenter: null,
  mapPanOffset: [0, 0],
  panGestureStartScreen: null,
  panGestureStartOffset: [0, 0],
  panGestureStartWorld: null,
  cursorPoint: null,
  cursorScreen: null,
  originPoint: null,
  originLabel: null,
  pinnedPoint: null,
  pinnedScreen: null,
  pinned: false,
  probePoint: null,
  probePinned: false,
  mobilePointerId: null,
  mobileDragTarget: null,
  mobileGestureStartScreen: null,
  mobileGestureMoved: false,
  mobileDrawerPointerId: null,
  mobileDrawerStartY: 0,
  mobileDrawerOffset: 0,
  mobileDrawerDidSwipe: false,
  transform: null,
  currentRender: null,
  baseMapCache: null,
  warpCache: null,
  liveWarpCache: null,
  heatmapCache: null,
  cellAccessCache: null,
  routeStateEnabledCache: null,
  activeTransitStationCache: null,
  activeTransitStationEntryCache: null,
  dynamicAdjacencyCache: null,
  drawFrameRequested: false,
  fullWarpSettleFrame: null,
  travelSettings: null,
  travelSettingsDefaults: null,
  compareModeActive: false,
  compareOrigin: null,
  compareDijkstraCache: null,
  compareStats: null,
  roadRouteCache: null,
  dirty: true,
};

const mapCanvas = document.getElementById("mapCanvas");
const statusText = document.getElementById("statusText");
const originFrequencyNote = document.getElementById("originFrequencyNote");
const warpToggle = document.getElementById("warpToggle");
const heatmapToggle = document.getElementById("heatmapToggle");
const outlineToggle = document.getElementById("outlineToggle");
const flatWaitToggle = document.getElementById("flatWaitToggle");
const mobileFlatWaitToggle = document.getElementById("mobileFlatWaitToggle");
const flatWaitToggles = [flatWaitToggle, mobileFlatWaitToggle].filter(Boolean);
const heatmapLegend = document.getElementById("heatmapLegend");
const heatmapLegendMin = document.getElementById("heatmapLegendMin");
const heatmapLegendMax = document.getElementById("heatmapLegendMax");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const searchForm = document.getElementById("searchForm");
const addressInput = document.getElementById("addressInput");
const searchButton = document.getElementById("searchButton");
const shareButton = document.getElementById("shareButton");
const sharePanel = document.getElementById("sharePanel");
const shareNativeRow = document.getElementById("shareNativeRow");
const nativeShareAction = document.getElementById("nativeShareAction");
const shareXAction = document.getElementById("shareXAction");
const shareFacebookAction = document.getElementById("shareFacebookAction");
const shareInstagramAction = document.getElementById("shareInstagramAction");
const shareLinkedInAction = document.getElementById("shareLinkedInAction");
const downloadImageAction = document.getElementById("downloadImageAction");
const shareXIcon = document.getElementById("shareXIcon");
const shareFacebookIcon = document.getElementById("shareFacebookIcon");
const shareInstagramIcon = document.getElementById("shareInstagramIcon");
const shareLinkedInIcon = document.getElementById("shareLinkedInIcon");
const searchMeta = document.getElementById("searchMeta");
const searchResults = document.getElementById("searchResults");
const reachScoreCard = document.getElementById("reachScoreCard");
const reachScoreValue = document.getElementById("reachScoreValue");
const reachScoreMeta = document.getElementById("reachScoreMeta");
const reachScoreLabels = Array.from(document.querySelectorAll("[data-reach-score-label]"));
const mobileOriginTitle = document.getElementById("mobileOriginTitle");
const mobileStatusText = document.getElementById("mobileStatusText");
const mobileOriginFrequencyNote = document.getElementById("mobileOriginFrequencyNote");
const mobileClearButton = document.getElementById("mobileClearButton");
const mobileSheet = document.getElementById("mobileSheet");
const mobileSheetToggle = document.getElementById("mobileSheetToggle");
const mobileSheetBody = document.getElementById("mobileSheetBody");
const mobileReachValue = document.getElementById("mobileReachValue");
const mobileReachMeta = document.getElementById("mobileReachMeta");
const mobileWarpToggle = document.getElementById("mobileWarpToggle");
const mobileHeatmapToggle = document.getElementById("mobileHeatmapToggle");
const mobileOutlineToggle = document.getElementById("mobileOutlineToggle");
const mobileSearchForm = document.getElementById("mobileSearchForm");
const mobileAddressInput = document.getElementById("mobileAddressInput");
const mobileSearchButton = document.getElementById("mobileSearchButton");
const mobileSearchMeta = document.getElementById("mobileSearchMeta");
const mobileSearchResults = document.getElementById("mobileSearchResults");
const saveFavoriteButton = document.getElementById("saveFavoriteButton");
const favoritesList = document.getElementById("favoritesList");
const favoritesEmpty = document.getElementById("favoritesEmpty");
const mobileSaveFavoriteButton = document.getElementById("mobileSaveFavoriteButton");
const mobileFavoritesList = document.getElementById("mobileFavoritesList");
const mobileFavoritesEmpty = document.getElementById("mobileFavoritesEmpty");
const mobileLocateButton = document.getElementById("mobileLocateButton");
const mobileShareButton = document.getElementById("mobileShareButton");
const mobileMapHelp = document.getElementById("mobileMapHelp");
const mobileMapInstructions = document.getElementById("mobileMapInstructions");
const mobileInstructionsLocateButton = document.getElementById("mobileInstructionsLocateButton");
const mobileHelpBubble = document.getElementById("mobileHelpBubble");
const settingsInputs = Array.from(document.querySelectorAll("[data-setting-key]"));
const settingsValueLabels = Array.from(document.querySelectorAll("[data-setting-value]"));
const timeBudgetPresetButtons = Array.from(document.querySelectorAll("[data-preset-minutes]"));
const settingsResetButtons = Array.from(document.querySelectorAll("[data-settings-reset]"));
const settingsSaveButtons = Array.from(document.querySelectorAll("[data-settings-save]"));
const settingsMenus = Array.from(document.querySelectorAll(".settings-menu"));
const travelModeToggles = Array.from(document.querySelectorAll("[data-mode-toggle]"));
const debugLayerToggles = Array.from(document.querySelectorAll("[data-layer-toggle]"));
const debugLayerPanel = document.getElementById("debugLayerPanel");
const ctx = mapCanvas.getContext("2d");
const panelCard = document.querySelector(".panel-card");
const footerEmojiLinks = Array.from(document.querySelectorAll("[data-emoji-burst]"));

const emojiBurstState = {
  mediaQuery: null,
  layer: null,
  activeLink: null,
  pointerX: 0,
  pointerY: 0,
  intervalId: null,
};

const searchUis = [
  {
    form: searchForm,
    input: addressInput,
    button: searchButton,
    meta: searchMeta,
    results: searchResults,
  },
  {
    form: mobileSearchForm,
    input: mobileAddressInput,
    button: mobileSearchButton,
    meta: mobileSearchMeta,
    results: mobileSearchResults,
  },
];

const favoritesUis = [
  { saveButton: saveFavoriteButton, list: favoritesList, empty: favoritesEmpty },
  { saveButton: mobileSaveFavoriteButton, list: mobileFavoritesList, empty: mobileFavoritesEmpty },
];

const compareToggleButton = document.getElementById("compareToggleButton");
const compareMeta = document.getElementById("compareMeta");
const mobileCompareToggleButton = document.getElementById("mobileCompareToggleButton");
const mobileCompareMeta = document.getElementById("mobileCompareMeta");

const compareUis = [
  { button: compareToggleButton, meta: compareMeta },
  { button: mobileCompareToggleButton, meta: mobileCompareMeta },
];

shareXIcon.src = new URL("./x.png", import.meta.url).toString();
shareFacebookIcon.src = new URL("./Facebook.png", import.meta.url).toString();
shareInstagramIcon.src = new URL("./Instagram.png", import.meta.url).toString();
shareLinkedInIcon.src = new URL("./LinkedIn.png", import.meta.url).toString();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function metersPerMinuteToMph(value) {
  return value / METERS_PER_MINUTE_PER_MPH;
}

function mphToMetersPerMinute(value) {
  return value * METERS_PER_MINUTE_PER_MPH;
}

function roundToStep(value, step) {
  return Math.round(value / step) * step;
}

function getTravelSettingsDefaults() {
  const meta = state.data?.meta ?? {};
  return {
    walkingSpeed: meta.walkMetersPerMinute ?? 80,
    swimSpeed: DEFAULT_SWIM_METERS_PER_MINUTE,
    transitTime: meta.defaultBoardWait ?? DEFAULT_TRANSIT_TIME_MINUTES,
    transferTime: meta.transferPenalty ?? 4,
    maxTransitTime: DEFAULT_MAX_TIME_MINUTES,
    useFlatWait: false,
  };
}

function sanitizeTravelSettings(rawSettings, defaults = state.travelSettingsDefaults || getTravelSettingsDefaults()) {
  const raw = rawSettings ?? {};
  return {
    walkingSpeed: clamp(
      Number.isFinite(raw.walkingSpeed) ? raw.walkingSpeed : defaults.walkingSpeed,
      mphToMetersPerMinute(2),
      mphToMetersPerMinute(5),
    ),
    swimSpeed: clamp(
      Number.isFinite(raw.swimSpeed) ? raw.swimSpeed : defaults.swimSpeed,
      0,
      mphToMetersPerMinute(2.5),
    ),
    transitTime: clamp(
      Number.isFinite(raw.transitTime) ? raw.transitTime : defaults.transitTime,
      1,
      12,
    ),
    transferTime: clamp(
      Number.isFinite(raw.transferTime) ? raw.transferTime : defaults.transferTime,
      1,
      15,
    ),
    maxTransitTime: clamp(
      Number.isFinite(raw.maxTransitTime) ? raw.maxTransitTime : defaults.maxTransitTime,
      15,
      120,
    ),
    useFlatWait: Boolean(raw.useFlatWait ?? defaults.useFlatWait),
  };
}

function currentTravelSettings() {
  return state.travelSettings || state.travelSettingsDefaults || getTravelSettingsDefaults();
}

function isOriginDragActive() {
  return (
    state.mobilePointerId !== null &&
    (state.mobileDragTarget === "origin" || state.mobileDragTarget === "new-origin")
  );
}

function currentWarpQuality() {
  return isOriginDragActive() ? "live" : "full";
}

function warpOptionsForQuality(quality = "full") {
  return WARP_QUALITY_OPTIONS[quality] || WARP_QUALITY_OPTIONS.full;
}

function cancelFullWarpSettleFrame() {
  if (state.fullWarpSettleFrame !== null) {
    window.cancelAnimationFrame(state.fullWarpSettleFrame);
    state.fullWarpSettleFrame = null;
  }
}

function scheduleFullWarpAfterInteraction() {
  if (!state.originPoint || !state.ready) return;
  cancelFullWarpSettleFrame();
  state.liveWarpCache = null;
  state.heatmapCache = null;
  state.fullWarpSettleFrame = window.requestAnimationFrame(() => {
    state.fullWarpSettleFrame = null;
    state.dirty = true;
    requestDraw();
  });
}

function sanitizeTravelModes(rawModes = DEFAULT_TRAVEL_MODES) {
  const nextModes = {};
  for (const mode of TRAVEL_MODE_KEYS) {
    nextModes[mode] = Boolean(rawModes?.[mode]);
  }
  return nextModes;
}

function activeModeSignature(modes = state.activeModes) {
  return TRAVEL_MODE_KEYS.filter((mode) => modes[mode]).join(",");
}

function layerVisible(layerKey) {
  return state.layerVisibility[layerKey] !== false;
}

function syncDebugLayerToggles() {
  for (const toggle of debugLayerToggles) {
    const layerKey = toggle.dataset.layerToggle;
    toggle.checked = layerVisible(layerKey);
  }
}

function syncDebugLayerAvailability() {
  const streetsToggle = debugLayerToggles.find((toggle) => toggle.dataset.layerToggle === "streets");
  if (!streetsToggle) return;
  const hasStreetData = Boolean(streetGeometries().length);
  const isFallback = !state.data?.streets?.length && Boolean(state.data?.busRoutes?.length);
  streetsToggle.disabled = !hasStreetData;
  streetsToggle.checked = hasStreetData && layerVisible("streets");
  streetsToggle.closest("label")?.classList.toggle("is-disabled", !hasStreetData);
  streetsToggle.closest("label")?.setAttribute(
    "title",
    hasStreetData
      ? isFallback
        ? "Toggle surface-corridor fallback streets derived from bus route geometry."
        : "Toggle street geometry."
      : "No street geometry exists in the current data bundle.",
  );
  if (!hasStreetData) {
    state.layerVisibility = {
      ...state.layerVisibility,
      streets: false,
    };
  }
}

function setLayerVisibility(layerKey, isVisible) {
  if (!(layerKey in DEFAULT_LAYER_VISIBILITY)) return;
  state.layerVisibility = {
    ...state.layerVisibility,
    [layerKey]: isVisible,
  };
  state.heatmapCache = null;
  state.dirty = true;
  requestDraw();
}

function hasActiveTransitMode() {
  return Boolean(state.activeModes.subway || state.activeModes.metra || state.activeModes.bus);
}

function routeStyle(routeId) {
  return state.data?.routeStyles?.[routeId] ?? null;
}

function isRouteModeEnabled(routeId) {
  const style = routeStyle(routeId);
  if (!style) return true;
  if (style.mode === "rail") {
    return style.agency === "CTA" ? state.activeModes.subway : state.activeModes.metra;
  }
  if (style.mode === "commuter_rail") return state.activeModes.metra;
  if (style.mode === "bus") return state.activeModes.bus;
  return true;
}

function isRouteStateEnabled(routeStateIndex) {
  if (!state.data?.routeStates) return false;
  const signature = activeModeSignature();
  if (state.routeStateEnabledCache?.signature !== signature) {
    state.routeStateEnabledCache = {
      signature,
      enabled: state.data.routeStates.map((routeState) => isRouteModeEnabled(routeState.routeId)),
    };
  }
  return Boolean(state.routeStateEnabledCache.enabled[routeStateIndex]);
}

function stationHasEnabledRoute(stationIndex) {
  return (state.data?.stationStates?.[stationIndex] || []).some((routeStateIndex) =>
    isRouteStateEnabled(routeStateIndex),
  );
}

function activeTransitStationIndices() {
  if (!hasActiveTransitMode()) return [];
  const signature = activeModeSignature();
  if (state.activeTransitStationCache?.signature === signature) {
    return state.activeTransitStationCache.indices;
  }
  const indices = [];
  for (let index = 0; index < state.data.stations.length; index += 1) {
    if (stationHasEnabledRoute(index)) {
      indices.push(index);
    }
  }
  state.activeTransitStationCache = { signature, indices };
  return indices;
}

function activeTransitStationEntries() {
  const signature = activeModeSignature();
  if (state.activeTransitStationEntryCache?.signature === signature) {
    return state.activeTransitStationEntryCache.entries;
  }
  const entries = hasActiveTransitMode()
    ? activeTransitStationIndices().map((index) => ({ station: state.data.stations[index], index }))
    : state.data.stations.map((station, index) => ({ station, index }));
  state.activeTransitStationEntryCache = { signature, entries };
  return entries;
}

function insertNearestStationCandidate(nearest, candidate, limit) {
  let insertAt = nearest.length;
  while (insertAt > 0 && candidate.distanceMeters < nearest[insertAt - 1].distanceMeters) {
    insertAt -= 1;
  }
  if (insertAt >= limit) return;
  nearest.splice(insertAt, 0, candidate);
  if (nearest.length > limit) nearest.length = limit;
}

// Coarse grid used to avoid O(cells * activeStations) / O(activeStations) brute-force
// distance scans. Chicago's multimodal graph (CTA rail + CTA bus + Metra + Pace) has
// tens of thousands of stations once bus/Pace is enabled, unlike the subway-only
// networks this rendering approach was originally built for.
//
// Bin size is adaptive: it's derived from station count vs. map area so each bin
// holds roughly one station on average. A fixed bin size tuned for the dense
// bus/Pace case (thousands of stops) made ring search over the sparse subway-only
// case (~145 stations across the full regional bbox) expand dozens of rings per
// grid cell -- an 8s+ stall building the cell-access cache before warp ever draws.
const MIN_STATION_BIN_SIZE = 150;
const MAX_STATION_BIN_SIZE = 4000;
const stationSpatialIndexByList = new WeakMap();

function spatialBinKey(x, y, cellSize) {
  return `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
}

function adaptiveStationBinSize(count) {
  const [minX, minY, maxX, maxY] = state.data.meta.bounds;
  const area = Math.max(1, (maxX - minX) * (maxY - minY));
  const spacing = Math.sqrt(area / Math.max(1, count));
  return Math.min(MAX_STATION_BIN_SIZE, Math.max(MIN_STATION_BIN_SIZE, spacing));
}

function buildStationSpatialIndex(indices, cellSize) {
  const bins = new Map();
  for (const index of indices) {
    const point = state.data.stations[index].point;
    const key = spatialBinKey(point[0], point[1], cellSize);
    let bucket = bins.get(key);
    if (!bucket) {
      bucket = [];
      bins.set(key, bucket);
    }
    bucket.push(index);
  }
  return { bins, cellSize };
}

function spatialIndexForStationList(indices) {
  let cached = stationSpatialIndexByList.get(indices);
  if (!cached) {
    cached = buildStationSpatialIndex(indices, adaptiveStationBinSize(indices.length));
    stationSpatialIndexByList.set(indices, cached);
  }
  return cached;
}

// Doubles the search radius (in bins) each time there aren't enough candidates yet,
// instead of expanding one bin-ring at a time. With an adaptive bin size this
// usually resolves in 1-2 iterations; doubling keeps genuinely sparse areas (a
// grid cell far from any station of the active mode) bounded to a handful of
// iterations instead of dozens. Only the resulting candidates get an exact
// distance/sort pass, not every active station.
function stationsNearPoint(spatialIndex, point, minCount) {
  const { bins, cellSize } = spatialIndex;
  const cx = Math.floor(point[0] / cellSize);
  const cy = Math.floor(point[1] / cellSize);
  let radius = 1;
  let found = [];
  while (radius <= 128) {
    found = [];
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        const bucket = bins.get(`${cx + dx}:${cy + dy}`);
        if (bucket) found.push(...bucket);
      }
    }
    if (found.length >= minCount) break;
    radius *= 2;
  }
  return found;
}

function buildCellAccessForActiveTransit() {
  const activeIndices = activeTransitStationIndices();
  const spatialIndex = spatialIndexForStationList(activeIndices);
  const accessByCellIndex = new Array(state.data.cells.length);
  const nearestCount = state.data.meta.cellNearestStations;

  for (let cellIndex = 0; cellIndex < state.data.cells.length; cellIndex += 1) {
    const cell = state.data.cells[cellIndex];
    const candidates = stationsNearPoint(spatialIndex, cell.point, nearestCount);
    const nearest = [];
    for (const stationIndex of candidates) {
      insertNearestStationCandidate(
        nearest,
        {
          stationIndex,
          distanceMeters: distance(cell.point, state.data.stations[stationIndex].point),
        },
        nearestCount,
      );
    }
    accessByCellIndex[cellIndex] = nearest.map(({ stationIndex }) => [stationIndex]);
  }

  return accessByCellIndex;
}

function cellTransitAccess(cell, cellIndex) {
  if (!hasActiveTransitMode()) return [];

  const signature = activeModeSignature();
  if (state.cellAccessCache?.signature !== signature) {
    state.cellAccessCache = {
      signature,
      accessByCellIndex: buildCellAccessForActiveTransit(),
    };
  }
  return state.cellAccessCache.accessByCellIndex[cellIndex] || [];
}

function syncTravelModeToggles() {
  for (const toggle of travelModeToggles) {
    const mode = toggle.dataset.modeToggle;
    toggle.checked = Boolean(state.activeModes[mode]);
  }
}

function setTravelMode(mode, enabled) {
  if (!TRAVEL_MODE_KEYS.includes(mode)) return;
  state.activeModes = {
    ...state.activeModes,
    [mode]: enabled,
  };
  state.warpCache = null;
  state.liveWarpCache = null;
  state.baseMapCache = null;
  state.heatmapCache = null;
  state.cellAccessCache = null;
  state.compareDijkstraCache = null;
  state.routeStateEnabledCache = null;
  state.activeTransitStationCache = null;
  state.activeTransitStationEntryCache = null;
  syncTravelModeToggles();
  syncBrowserUrl();
  state.dirty = true;
  requestDraw();
}

function cityAreas() {
  return state.data?.neighborhoods ?? state.data?.boroughs ?? [];
}

function loadStoredTravelSettings() {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(error);
    return null;
  }
}

function persistTravelSettings() {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentTravelSettings()));
  } catch (error) {
    console.error(error);
  }
}

function settingToInputValue(key, value) {
  if (key === "walkingSpeed" || key === "swimSpeed") {
    return String(roundToStep(metersPerMinuteToMph(value), 0.1).toFixed(1));
  }
  const step = key === "maxTransitTime" ? 5 : 0.5;
  const digits = step < 1 ? 1 : 0;
  return String(roundToStep(value, step).toFixed(digits));
}

function formatSettingLabel(key, value) {
  if (key === "walkingSpeed" || key === "swimSpeed") {
    return `${Number(value).toFixed(1)} mph`;
  }
  return `${Number(value) % 1 === 0 ? Number(value).toFixed(0) : Number(value).toFixed(1)} min`;
}

function syncTravelSettingsInputs() {
  const settings = currentTravelSettings();
  for (const input of settingsInputs) {
    const key = input.dataset.settingKey;
    if (!key || !(key in settings)) continue;
    input.value = settingToInputValue(key, settings[key]);
  }
  for (const label of settingsValueLabels) {
    const key = label.dataset.settingValue;
    if (!key || !(key in settings)) continue;
    label.textContent = formatSettingLabel(key, Number(settingToInputValue(key, settings[key])));
  }
  for (const button of timeBudgetPresetButtons) {
    button.classList.toggle("is-active", Number(button.dataset.presetMinutes) === Math.round(settings.maxTransitTime));
  }
  for (const toggle of flatWaitToggles) {
    toggle.checked = Boolean(settings.useFlatWait);
  }
}

function applyTravelSettings(nextSettings, { persist = true } = {}) {
  state.travelSettings = sanitizeTravelSettings(nextSettings);
  state.warpCache = null;
  state.liveWarpCache = null;
  state.heatmapCache = null;
  state.compareDijkstraCache = null;
  syncTravelSettingsInputs();
  syncHeatmapLegend();
  if (persist) persistTravelSettings();
  state.dirty = true;
  requestDraw();
}

function canShowEmojiBursts() {
  if (!emojiBurstState.mediaQuery) {
    emojiBurstState.mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)");
  }
  return emojiBurstState.mediaQuery.matches;
}

function ensureEmojiBurstLayer() {
  if (emojiBurstState.layer) return emojiBurstState.layer;
  const layer = document.createElement("div");
  layer.className = "emoji-burst-layer";
  document.body.appendChild(layer);
  emojiBurstState.layer = layer;
  return layer;
}

function stopEmojiBurstLoop() {
  if (emojiBurstState.intervalId !== null) {
    window.clearInterval(emojiBurstState.intervalId);
    emojiBurstState.intervalId = null;
  }
  emojiBurstState.activeLink = null;
}

function emitEmojiBurst(link, originX, originY) {
  const theme = link.dataset.emojiBurst;
  const emojis = EMOJI_BURST_SETS[theme];
  if (!emojis?.length) return;

  const layer = ensureEmojiBurstLayer();
  const originJitter = 10;

  for (let index = 0; index < EMOJI_BURST_PER_TICK; index += 1) {
    const particle = document.createElement("span");
    particle.className = "emoji-burst";
    particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const burstX = originX + (Math.random() - 0.5) * originJitter * 2;
    const burstY = originY + (Math.random() - 0.5) * originJitter * 2;
    const burstDx = (Math.random() - 0.5) * 54;
    const burstDy = -36 - Math.random() * 72;
    const rotation = `${(Math.random() - 0.5) * 44}deg`;
    const size = `${0.9 + Math.random() * 0.5}rem`;

    particle.style.setProperty("--burst-x", `${Math.round(burstX)}px`);
    particle.style.setProperty("--burst-y", `${Math.round(burstY)}px`);
    particle.style.setProperty("--burst-dx", `${Math.round(burstDx)}px`);
    particle.style.setProperty("--burst-dy", `${Math.round(burstDy)}px`);
    particle.style.setProperty("--burst-rotate", rotation);
    particle.style.fontSize = size;

    layer.appendChild(particle);
    window.setTimeout(() => {
      particle.remove();
    }, EMOJI_BURST_LIFETIME_MS);
  }
}

function updateEmojiBurstPointer(event, link) {
  emojiBurstState.pointerX = event.clientX;
  emojiBurstState.pointerY = event.clientY;

  if (!canShowEmojiBursts()) {
    stopEmojiBurstLoop();
    return;
  }

  emojiBurstState.activeLink = link;
}

function startEmojiBurstLoop(link, event) {
  if (!canShowEmojiBursts()) return;

  updateEmojiBurstPointer(event, link);
  emitEmojiBurst(link, emojiBurstState.pointerX, emojiBurstState.pointerY);
  stopEmojiBurstLoop();
  emojiBurstState.activeLink = link;
  emojiBurstState.intervalId = window.setInterval(() => {
    if (!emojiBurstState.activeLink || !canShowEmojiBursts()) {
      stopEmojiBurstLoop();
      return;
    }
    emitEmojiBurst(
      emojiBurstState.activeLink,
      emojiBurstState.pointerX,
      emojiBurstState.pointerY,
    );
  }, EMOJI_BURST_INTERVAL_MS);
}

function setupFooterEmojiBursts() {
  if (!footerEmojiLinks.length) return;

  for (const link of footerEmojiLinks) {
    link.addEventListener("pointerenter", (event) => {
      if (!(event.pointerType === "mouse" || event.pointerType === "")) return;
      startEmojiBurstLoop(link, event);
    });

    link.addEventListener("pointermove", (event) => {
      if (emojiBurstState.activeLink !== link) return;
      updateEmojiBurstPointer(event, link);
    });

    link.addEventListener("pointerleave", () => {
      if (emojiBurstState.activeLink === link) {
        stopEmojiBurstLoop();
      }
    });

    link.addEventListener("blur", () => {
      if (emojiBurstState.activeLink === link) {
        stopEmojiBurstLoop();
      }
    });
  }

  if (!emojiBurstState.mediaQuery) {
    emojiBurstState.mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 641px)");
  }
  emojiBurstState.mediaQuery.addEventListener("change", () => {
    if (!emojiBurstState.mediaQuery.matches) {
      stopEmojiBurstLoop();
    }
  });
}

function clampToRange(value, min, max) {
  if (min > max) {
    return (min + max) / 2;
  }
  return clamp(value, min, max);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / ((edge1 - edge0) || 1), 0, 1);
  return t * t * (3 - 2 * t);
}

function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = (yi > y) !== (yj > y);
    if (intersects) {
      const xHit = ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi;
      if (x < xHit) inside = !inside;
    }
    j = i;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!polygon.length || !pointInRing(point, polygon[0])) return false;
  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(point, polygon[index])) return false;
  }
  return true;
}

function pointToSegmentProjection(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return { point: start.slice(), distance: distance(point, start) };
  }
  const t = clamp(((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / lengthSquared, 0, 1);
  const projectedPoint = [start[0] + dx * t, start[1] + dy * t];
  return { point: projectedPoint, distance: distance(point, projectedPoint) };
}

function locateNearestLandBorder(point) {
  let best = { point: point.slice(), distance: Infinity };
  for (const polygon of landMaskPolygons()) {
    for (const ring of polygon) {
      for (let index = 0; index < ring.length - 1; index += 1) {
        const candidate = pointToSegmentProjection(point, ring[index], ring[index + 1]);
        if (candidate.distance < best.distance) best = candidate;
      }
    }
  }
  return best;
}

function pointInBoroughs(point) {
  for (const neighborhood of cityAreas()) {
    for (const polygon of neighborhood.polygons) {
      if (pointInPolygon(point, polygon)) return true;
    }
  }
  return false;
}

function pointInExternalLand(point) {
  for (const polygon of state.data.externalLand || []) {
    if (pointInPolygon(point, polygon)) return true;
  }
  return false;
}

function classifySurface(point) {
  if (pointInBoroughs(point)) return "neighborhood";
  return pointInExternalLand(point) ? "land" : "water";
}

function normalizeTravelPoint(point) {
  const surface = classifySurface(point);
  if (surface !== "water") {
    return {
      surface,
      point,
      swimMinutes: 0,
      swimDistance: 0,
    };
  }
  const border = locateNearestLandBorder(point);
  return {
    surface,
    point: border.point,
    swimMinutes: 0,
    swimDistance: border.distance,
  };
}

// Grid cell points never change once loaded, so classifySurface's unindexed
// point-in-polygon scan (over every neighborhood boundary ring) only ever
// needs to run once per cell instead of once per cell per warp computation.
// This was the dominant per-frame cost while dragging the origin: every
// pointer move recomputes the warp for a fresh origin, and without this
// cache each of those recomputes re-ran the full polygon scan for every
// sampled grid cell.
const cellNormalizedPointCache = new Map();
function normalizedCellPoint(cellIndex) {
  let cached = cellNormalizedPointCache.get(cellIndex);
  if (!cached) {
    cached = normalizeTravelPoint(state.data.cells[cellIndex].point);
    cellNormalizedPointCache.set(cellIndex, cached);
  }
  return cached;
}

// Same fix as normalizedCellPoint, for station points: summarizeReachability()
// calls this once per active station (up to ~25k with bus/Pace on) on every
// "full" quality warp -- including the settle pass right after every drag --
// so leaving it unindexed made releasing the origin pin freeze for seconds
// whenever bus or Metra was enabled.
const stationNormalizedPointCache = new Map();
function normalizedStationPoint(stationIndex) {
  let cached = stationNormalizedPointCache.get(stationIndex);
  if (!cached) {
    cached = normalizeTravelPoint(state.data.stations[stationIndex].point);
    stationNormalizedPointCache.set(stationIndex, cached);
  }
  return cached;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function bilerpPoint(p00, p10, p01, p11, tx, ty) {
  return [
    lerp(lerp(p00[0], p10[0], tx), lerp(p01[0], p11[0], tx), ty),
    lerp(lerp(p00[1], p10[1], tx), lerp(p01[1], p11[1], tx), ty),
  ];
}

function triangleArea(a, b, c) {
  return Math.abs((a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) / 2);
}

function quadArea(p00, p10, p11, p01) {
  return triangleArea(p00, p10, p11) + triangleArea(p00, p11, p01);
}

function barycentricWeights(point, a, b, c) {
  const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(denominator) < 1e-9) return null;
  const w1 = ((b[1] - c[1]) * (point[0] - c[0]) + (c[0] - b[0]) * (point[1] - c[1])) / denominator;
  const w2 = ((c[1] - a[1]) * (point[0] - c[0]) + (a[0] - c[0]) * (point[1] - c[1])) / denominator;
  const w3 = 1 - w1 - w2;
  const epsilon = 1e-5;
  if (w1 < -epsilon || w2 < -epsilon || w3 < -epsilon) return null;
  return [w1, w2, w3];
}

function interpolateTriangle(weights, a, b, c) {
  return [
    weights[0] * a[0] + weights[1] * b[0] + weights[2] * c[0],
    weights[0] * a[1] + weights[1] * b[1] + weights[2] * c[1],
  ];
}

function formatMinutes(minutes) {
  if (!Number.isFinite(minutes)) return "unreachable";
  if (minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

function formatTravelBreakdown(baseMinutes, swimMinutes) {
  if (!Number.isFinite(baseMinutes)) return "unreachable";
  if (swimMinutes < 0.5) return formatMinutes(baseMinutes);
  return `${Math.round(baseMinutes)} min + ${Math.round(swimMinutes)} min swim 🌊`;
}

function formatDistanceLabel(baseMinutes, swimMinutes) {
  const label = formatTravelBreakdown(baseMinutes, swimMinutes);
  return label === "unreachable" ? label : `${label} away`;
}

function formatShareTime(date = new Date()) {
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 640px)").matches;
}

function setDrawerCollapsed(collapsed) {
  state.drawerCollapsed = collapsed;
  if (!mobileSheet || !mobileSheetToggle || !mobileSheetBody) return;
  state.mobileDrawerOffset = 0;
  mobileSheet.style.removeProperty("--mobile-sheet-offset");
  mobileSheet.classList.remove("is-dragging");
  mobileSheet.classList.toggle("is-collapsed", collapsed);
  mobileSheet.setAttribute("aria-expanded", String(!collapsed));
  mobileSheetToggle.setAttribute("aria-expanded", String(!collapsed));
  mobileSheetBody.hidden = collapsed;
}

function beginMobileDrawerGesture(event) {
  if (!state.isMobile || !mobileSheet) return;
  if (event.pointerType === "mouse") return;
  state.mobileDrawerPointerId = event.pointerId;
  state.mobileDrawerStartY = event.clientY;
  state.mobileDrawerOffset = 0;
  state.mobileDrawerDidSwipe = false;
  mobileSheet.classList.add("is-dragging");
  mobileSheet.style.setProperty("--mobile-sheet-offset", "0px");
  mobileSheetToggle?.setPointerCapture?.(event.pointerId);
}

function updateMobileDrawerGesture(event) {
  if (!mobileSheet || state.mobileDrawerPointerId !== event.pointerId) return;
  const deltaY = event.clientY - state.mobileDrawerStartY;
  const offset = state.drawerCollapsed ? Math.min(0, deltaY) : Math.max(0, deltaY);
  state.mobileDrawerOffset = offset;
  mobileSheet.style.setProperty("--mobile-sheet-offset", `${offset}px`);
}

function endMobileDrawerGesture(event) {
  if (state.mobileDrawerPointerId !== event.pointerId) return;
  const offset = state.mobileDrawerOffset;
  state.mobileDrawerDidSwipe = Math.abs(offset) >= 4;
  state.mobileDrawerPointerId = null;
  state.mobileDrawerStartY = 0;
  state.mobileDrawerOffset = 0;
  mobileSheet?.classList.remove("is-dragging");
  mobileSheet?.style.removeProperty("--mobile-sheet-offset");
  mobileSheetToggle?.releasePointerCapture?.(event.pointerId);

  if (state.drawerCollapsed) {
    if (offset <= -MOBILE_DRAWER_SWIPE_THRESHOLD_PX) {
      setDrawerCollapsed(false);
    }
    return;
  }

  if (offset >= MOBILE_DRAWER_SWIPE_THRESHOLD_PX) {
    setDrawerCollapsed(true);
  }
}

function cancelMobileDrawerGesture(event) {
  if (!mobileSheet || state.mobileDrawerPointerId !== event.pointerId) return;
  state.mobileDrawerPointerId = null;
  state.mobileDrawerStartY = 0;
  state.mobileDrawerOffset = 0;
  state.mobileDrawerDidSwipe = false;
  mobileSheet.classList.remove("is-dragging");
  mobileSheet.style.removeProperty("--mobile-sheet-offset");
  mobileSheetToggle?.releasePointerCapture?.(event.pointerId);
}

function syncMobileHelp() {
  if (!mobileMapHelp || !mobileMapInstructions || !mobileHelpBubble) return;
  const collapsed = state.mobileHelpCollapsed;
  mobileMapHelp.classList.toggle("is-collapsed", collapsed);
  mobileMapInstructions.setAttribute("aria-hidden", String(collapsed));
  mobileHelpBubble.hidden = !collapsed;
  mobileHelpBubble.setAttribute("aria-expanded", String(!collapsed));
}

function collapseMobileHelp() {
  if (state.mobileHelpCollapsed) return;
  state.mobileHelpCollapsed = true;
  syncMobileHelp();
}

function expandMobileHelp() {
  state.mobileHelpCollapsed = false;
  syncMobileHelp();
}

function worldToLonLat(point) {
  const metersPerDegLat = 111_320.0;
  const metersPerDegLon = metersPerDegLat * Math.cos((state.data.meta.lat0 * Math.PI) / 180);
  return {
    lon: point[0] / metersPerDegLon,
    lat: point[1] / metersPerDegLat,
  };
}

function formatCoordinate(value) {
  return Number(value).toFixed(SHARE_COORDINATE_DECIMALS);
}

function formatCoordinatePair(point) {
  const { lat, lon } = worldToLonLat(point);
  return `${formatCoordinate(lat)},${formatCoordinate(lon)}`;
}

function originPathForPoint(point) {
  return `@${formatCoordinatePair(point)}`;
}

function originQueryForPoint(point) {
  return `?origin=${formatCoordinatePair(point)}`;
}

function parseCoordinatePair(value) {
  if (!value) return null;
  const match = value.match(/^@?(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function parseOriginPath(pathname = window.location.pathname) {
  const match = pathname.match(/\/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\/?$/);
  return match ? parseCoordinatePair(`${match[1]},${match[2]}`) : null;
}

function getBasePath() {
  return window.__ASSET_BASE__ || "/";
}

function isLocalStaticDev() {
  return (
    ["localhost", "127.0.0.1"].includes(window.location.hostname) &&
    getBasePath().startsWith("/site/")
  );
}

function getCoordinateUrlFragment(point) {
  return isLocalStaticDev() ? originQueryForPoint(point) : originPathForPoint(point);
}

function buildViewUrlFragment(
  originPoint = state.pinnedPoint || state.originPoint,
  probePoint = state.probePoint,
  zoomLevel = state.viewportScale,
) {
  const params = new URLSearchParams();
  if (isLocalStaticDev() && originPoint) {
    params.set("origin", formatCoordinatePair(originPoint));
  }
  if (probePoint) {
    params.set("distance", formatCoordinatePair(probePoint));
  }
  if (zoomLevel > MIN_VIEWPORT_SCALE) {
    params.set("zoom", zoomLevel.toFixed(2));
  }
  if (!state.showWarp) {
    params.set("warp", "0");
  }
  if (!state.showHeatmap) {
    params.set("heatmap", "0");
  }
  if (state.showReachOutline) {
    params.set("outline", "1");
  }
  const modes = activeModeSignature();
  if (modes !== activeModeSignature(DEFAULT_TRAVEL_MODES)) {
    params.set("modes", modes);
  }

  const query = params.toString();
  if (isLocalStaticDev()) {
    return query ? `?${query}` : "";
  }

  const path = originPoint ? originPathForPoint(originPoint) : "";
  return query ? `${path}?${query}` : path;
}

function parseSharedView() {
  const searchParams = new URLSearchParams(window.location.search);
  const origin =
    parseOriginPath() ||
    parseCoordinatePair(searchParams.get("origin")) ||
    parseCoordinatePair(window.location.hash.replace(/^#/, ""));
  const probe = parseCoordinatePair(searchParams.get("distance"));
  const zoomRaw = Number(searchParams.get("zoom"));
  const zoom = Number.isFinite(zoomRaw) ? clamp(zoomRaw, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE) : null;
  const warp = searchParams.has("warp") ? searchParams.get("warp") !== "0" : null;
  const heatmap = searchParams.has("heatmap") ? searchParams.get("heatmap") !== "0" : null;
  const outline = searchParams.has("outline") ? searchParams.get("outline") !== "0" : null;
  const modesRaw = searchParams.has("modes") ? searchParams.get("modes") : null;
  const modes = modesRaw !== null
    ? sanitizeTravelModes(
        modesRaw.split(",").reduce((memo, mode) => {
          if (TRAVEL_MODE_KEYS.includes(mode)) memo[mode] = true;
          return memo;
        }, {}),
      )
    : null;
  return { origin, probe, zoom, warp, heatmap, outline, modes };
}

function replaceBrowserUrl(pathOrQuery = "") {
  const nextUrl = new URL(pathOrQuery, window.location.origin + getBasePath());
  window.history.replaceState(null, "", nextUrl);
}

function syncBrowserUrl() {
  replaceBrowserUrl(buildViewUrlFragment());
}

function getShareUrl() {
  const pathOrQuery = buildViewUrlFragment();
  return new URL(pathOrQuery, window.location.origin + getBasePath()).toString();
}

function getShareText() {
  return "Explore Chicago by regional transit commute time with this interactive transit cartogram.";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function shortOriginLabel(label) {
  if (!label) return "";
  if (label === "My location") return label;
  const primary = label.split(",")[0].trim();
  if (/^\d/.test(primary)) return primary;
  return primary.toLowerCase().startsWith("near ") ? primary : `Near ${primary}`;
}

function heatmapColor(minutes, alpha = 0.56) {
  const t = clamp(minutes / currentTravelSettings().maxTransitTime, 0, 1);
  const stops = [
    { t: 0, color: [220, 69, 37] },
    { t: 0.2, color: [244, 127, 46] },
    { t: 0.4, color: [255, 196, 79] },
    { t: 0.62, color: [248, 232, 156] },
    { t: 0.8, color: [149, 188, 211] },
    { t: 1, color: [74, 103, 141] },
  ];
  let left = stops[0];
  let right = stops[stops.length - 1];
  for (let index = 0; index < stops.length - 1; index += 1) {
    if (t >= stops[index].t && t <= stops[index + 1].t) {
      left = stops[index];
      right = stops[index + 1];
      break;
    }
  }
  const mix = (t - left.t) / ((right.t - left.t) || 1);
  const rgb = left.color.map((value, index) => Math.round(value + (right.color[index] - value) * mix));
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function minuteToAreaWeight(minutes) {
  const t = clamp(minutes / currentTravelSettings().maxTransitTime, 0, 1);
  return MIN_AREA_WEIGHT + (1 - t) * (MAX_AREA_WEIGHT - MIN_AREA_WEIGHT);
}

function defaultMapCenter(bounds = state.data?.meta?.bounds) {
  if (!bounds) return [0, 0];
  const [minX, minY, maxX, maxY] = bounds;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function pinMidpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function currentZoomFocusPoint() {
  if (state.viewportCenter) return state.viewportCenter.slice();
  if (state.originPoint) return state.originPoint.slice();
  return defaultMapCenter();
}

function activeViewportCenter() {
  if (state.viewportScale <= MIN_VIEWPORT_SCALE) return null;
  return currentZoomFocusPoint();
}

function buildTransform(bounds, width, height, padding = PANEL_PADDING, zoom = 1, centerPoint = null) {
  const [minX, minY, maxX, maxY] = bounds;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const baseScale = Math.min((width - padding * 2) / spanX, (height - padding * 2) / spanY);
  const scale = baseScale * zoom;
  const [rawCenterX, rawCenterY] = centerPoint || defaultMapCenter(bounds);
  const centerX = clamp(rawCenterX, minX, maxX);
  const centerY = clamp(rawCenterY, minY, maxY);
  const offsetX = width / 2;
  const offsetY = height / 2;

  return {
    scale,
    baseScale,
    center: [centerX, centerY],
    cacheKey: `${width}:${height}:${scale}:${centerX}:${centerY}`,
    toScreen(point) {
      const [x, y] = point;
      return [offsetX + (x - centerX) * scale, offsetY - (y - centerY) * scale];
    },
    toWorld(x, y) {
      return [centerX + (x - offsetX) / scale, centerY - (y - offsetY) / scale];
    },
  };
}

function offsetTransform(baseTransform, dx, dy) {
  const roundedDx = Math.round(dx * 100) / 100;
  const roundedDy = Math.round(dy * 100) / 100;
  return {
    scale: baseTransform.scale,
    cacheKey: `${baseTransform.cacheKey}:${roundedDx}:${roundedDy}`,
    toScreen(point) {
      const [sx, sy] = baseTransform.toScreen(point);
      return [sx + dx, sy + dy];
    },
    toWorld(x, y) {
      return baseTransform.toWorld(x - dx, y - dy);
    },
  };
}

function pannedTransform(baseTransform) {
  const [dx, dy] = state.mapPanOffset || [0, 0];
  return offsetTransform(baseTransform, dx, dy);
}

function createCanvasBacking(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: rect.width, height: rect.height };
}

function createCanvasSurface(width, height) {
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas, context, width, height };
}

function expandTriangle(points, amount) {
  if (!amount) return points.map((point) => point.slice());
  const centroid = [
    (points[0][0] + points[1][0] + points[2][0]) / 3,
    (points[0][1] + points[1][1] + points[2][1]) / 3,
  ];
  return points.map((point) => {
    const dx = point[0] - centroid[0];
    const dy = point[1] - centroid[1];
    const length = Math.hypot(dx, dy) || 1;
    return [point[0] + (dx / length) * amount, point[1] + (dy / length) * amount];
  });
}

function trianglePath(drawCtx, a, b, c) {
  drawCtx.beginPath();
  drawCtx.moveTo(a[0], a[1]);
  drawCtx.lineTo(b[0], b[1]);
  drawCtx.lineTo(c[0], c[1]);
  drawCtx.closePath();
}

function affineTransformBetweenTriangles(srcA, srcB, srcC, dstA, dstB, dstC) {
  const srcUx = srcB[0] - srcA[0];
  const srcUy = srcB[1] - srcA[1];
  const srcVx = srcC[0] - srcA[0];
  const srcVy = srcC[1] - srcA[1];
  const determinant = srcUx * srcVy - srcVx * srcUy;
  if (Math.abs(determinant) < 1e-9) return null;

  const inv00 = srcVy / determinant;
  const inv01 = -srcVx / determinant;
  const inv10 = -srcUy / determinant;
  const inv11 = srcUx / determinant;

  const dstUx = dstB[0] - dstA[0];
  const dstUy = dstB[1] - dstA[1];
  const dstVx = dstC[0] - dstA[0];
  const dstVy = dstC[1] - dstA[1];

  const a = dstUx * inv00 + dstVx * inv10;
  const c = dstUx * inv01 + dstVx * inv11;
  const b = dstUy * inv00 + dstVy * inv10;
  const d = dstUy * inv01 + dstVy * inv11;
  const e = dstA[0] - a * srcA[0] - c * srcA[1];
  const f = dstA[1] - b * srcA[0] - d * srcA[1];

  return [a, b, c, d, e, f];
}

function drawWarpedTriangle(drawCtx, sourceCanvas, sourceWidth, sourceHeight, srcA, srcB, srcC, dstA, dstB, dstC) {
  const matrix = affineTransformBetweenTriangles(srcA, srcB, srcC, dstA, dstB, dstC);
  if (!matrix) return;
  const [a, b, c, d, e, f] = matrix;
  const [clipA, clipB, clipC] = expandTriangle([dstA, dstB, dstC], IMAGE_WARP_OVERDRAW_PX);
  drawCtx.save();
  trianglePath(drawCtx, clipA, clipB, clipC);
  drawCtx.clip();
  drawCtx.transform(a, b, c, d, e, f);
  drawCtx.drawImage(sourceCanvas, 0, 0, sourceWidth, sourceHeight);
  drawCtx.restore();
}

function drawPanelBackground(drawCtx, width, height) {
  drawCtx.clearRect(0, 0, width, height);
  if (!layerVisible("panelBackground")) return;
  const bg = drawCtx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "rgba(255,255,255,0.72)");
  bg.addColorStop(1, "rgba(241,232,217,0.84)");
  drawCtx.fillStyle = bg;
  drawCtx.fillRect(0, 0, width, height);

  drawCtx.strokeStyle = "rgba(23, 48, 77, 0.08)";
  drawCtx.lineWidth = 1;
  for (let x = 18; x < width; x += 38) {
    drawCtx.beginPath();
    drawCtx.moveTo(x, 0);
    drawCtx.lineTo(x, height);
    drawCtx.stroke();
  }
}

function tracePolygonPath(drawCtx, polygon, projectPoint) {
  for (const ring of polygon) {
    ring.forEach((point, index) => {
      const [sx, sy] = projectPoint(point);
      if (index === 0) drawCtx.moveTo(sx, sy);
      else drawCtx.lineTo(sx, sy);
    });
    drawCtx.closePath();
  }
}

function drawPolygonPath(drawCtx, polygon, projectPoint) {
  drawCtx.beginPath();
  tracePolygonPath(drawCtx, polygon, projectPoint);
}

function landMaskPolygons() {
  if (state.data.landMask?.length) return state.data.landMask;
  return cityAreas().flatMap((neighborhood) => neighborhood.polygons);
}

function traceBoroughMaskPath(drawCtx, projectPoint) {
  drawCtx.beginPath();
  for (const neighborhood of cityAreas()) {
    for (const polygon of neighborhood.polygons) {
      tracePolygonPath(drawCtx, polygon, projectPoint);
    }
  }
}

function traceLandMaskPath(drawCtx, projectPoint) {
  drawCtx.beginPath();
  for (const polygon of landMaskPolygons()) {
    tracePolygonPath(drawCtx, polygon, projectPoint);
  }
}

function fillLandMask(drawCtx, projectPoint) {
  traceLandMaskPath(drawCtx, projectPoint);
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.fill("evenodd");
}

function drawExternalLand(drawCtx, projectPoint) {
  if (!layerVisible("externalLand")) return;
  const polygons = state.data.externalLand || [];
  if (!polygons.length) return;
  drawCtx.save();
  drawCtx.globalAlpha = 0.3;
  drawCtx.fillStyle = "#f3f6fa";
  drawCtx.strokeStyle = "rgba(79, 105, 135, 0.42)";
  drawCtx.lineWidth = 0.75;
  drawCtx.lineJoin = "round";
  for (const polygon of polygons) {
    drawPolygonPath(drawCtx, polygon, projectPoint);
    drawCtx.fill();
    drawCtx.stroke();
  }
  drawCtx.restore();
}

function drawLake(drawCtx, projectPoint, width, height) {
  if (!layerVisible("lake")) return;
  drawCtx.save();
  drawCtx.beginPath();
  drawCtx.rect(0, 0, width, height);
  for (const polygon of landMaskPolygons()) {
    tracePolygonPath(drawCtx, polygon, projectPoint);
  }
  const gradient = drawCtx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "rgba(169, 204, 224, 0.42)");
  gradient.addColorStop(1, "rgba(98, 151, 185, 0.5)");
  drawCtx.fillStyle = gradient;
  drawCtx.fill("evenodd");
  drawCtx.restore();
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function distanceToChord(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return distance(point, start);
  return Math.abs(dx * (start[1] - point[1]) - (start[0] - point[0]) * dy) / length;
}

function traceAdaptiveSegment(drawCtx, start, end, startScreen, endScreen, projectPoint, tolerance, depth) {
  if (depth <= 0) {
    drawCtx.lineTo(endScreen[0], endScreen[1]);
    return;
  }
  const worldMid = midpoint(start, end);
  const screenMid = projectPoint(worldMid);
  const deviation = distanceToChord(screenMid, startScreen, endScreen);
  if (deviation <= tolerance) {
    drawCtx.lineTo(endScreen[0], endScreen[1]);
    return;
  }
  traceAdaptiveSegment(drawCtx, start, worldMid, startScreen, screenMid, projectPoint, tolerance, depth - 1);
  traceAdaptiveSegment(drawCtx, worldMid, end, screenMid, endScreen, projectPoint, tolerance, depth - 1);
}

function drawPolyline(drawCtx, points, projectPoint, { tolerance = 0, maxDepth = 0 } = {}) {
  if (!points.length) return;
  drawCtx.beginPath();
  let previousPoint = points[0];
  let previousScreen = projectPoint(previousPoint);
  drawCtx.moveTo(previousScreen[0], previousScreen[1]);
  for (let index = 1; index < points.length; index += 1) {
    const nextPoint = points[index];
    const nextScreen = projectPoint(nextPoint);
    if (tolerance > 0 && maxDepth > 0) {
      traceAdaptiveSegment(
        drawCtx,
        previousPoint,
        nextPoint,
        previousScreen,
        nextScreen,
        projectPoint,
        tolerance,
        maxDepth,
      );
    } else {
      drawCtx.lineTo(nextScreen[0], nextScreen[1]);
    }
    previousPoint = nextPoint;
    previousScreen = nextScreen;
  }
  drawCtx.stroke();
}

function drawCityBasemap(
  drawCtx,
  projectPoint,
  {
    includeBoroughBorders = true,
    streetCurveTolerance = 0,
    routeCurveTolerance = 0,
    curveMaxDepth = 0,
  } = {},
) {
  if (layerVisible("parks")) {
    for (const polygon of state.data.parks) {
      drawPolygonPath(drawCtx, polygon, projectPoint);
      drawCtx.fillStyle = "#dbeacd";
      drawCtx.strokeStyle = "#a7c39b";
      drawCtx.lineWidth = 0.45;
      drawCtx.fill();
      drawCtx.stroke();
    }
  }

  drawStreets(drawCtx, projectPoint, { streetCurveTolerance, curveMaxDepth });

  if (layerVisible("transitRoutes") && state.activeModes.bus) {
    for (const route of state.data.busRoutes || []) {
      drawCtx.strokeStyle = "rgba(88, 103, 121, 0.22)";
      drawCtx.lineWidth = 0.55;
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawPolyline(drawCtx, route.points, projectPoint, {
        tolerance: routeCurveTolerance,
        maxDepth: curveMaxDepth,
      });
    }
  }

  if (layerVisible("transitRoutes")) {
    for (const route of state.data.routes) {
      if (!isRouteModeEnabled(route.routeId)) continue;
      drawCtx.strokeStyle = route.color;
      drawCtx.lineWidth = ROUTE_LINE_WIDTH;
      drawCtx.lineCap = "round";
      drawCtx.lineJoin = "round";
      drawPolyline(drawCtx, route.points, projectPoint, {
        tolerance: routeCurveTolerance,
        maxDepth: curveMaxDepth,
      });
    }
  }

  if (includeBoroughBorders) {
    for (const neighborhood of cityAreas()) {
      for (const polygon of neighborhood.polygons) {
        drawPolygonPath(drawCtx, polygon, projectPoint);
        drawCtx.strokeStyle = "#4f6987";
        drawCtx.lineWidth = 1.05;
        drawCtx.stroke();
      }
    }
  }
}

function drawStations(drawCtx, projectPoint) {
  if (!layerVisible("stations")) return;
  if (!hasActiveTransitMode()) return;
  for (const index of activeTransitStationIndices()) {
    const station = state.data.stations[index];
    const [sx, sy] = projectPoint(station.point);
    drawCtx.beginPath();
    drawCtx.arc(sx, sy, 1.35, 0, Math.PI * 2);
    drawCtx.fillStyle = "#ffffff";
    drawCtx.fill();
    drawCtx.lineWidth = 0.55;
    drawCtx.strokeStyle = "#5a6e84";
    drawCtx.stroke();
  }
}

function drawBoroughLabels(drawCtx, projectPoint) {
  if (!layerVisible("neighborhoodLabels")) return;
  drawCtx.font = '700 9px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";
  drawCtx.fillStyle = "#17304d";
  drawCtx.strokeStyle = "rgba(255,252,247,0.95)";
  drawCtx.lineWidth = 3;
  drawCtx.lineJoin = "round";
  const placedLabels = [];
  for (const neighborhood of cityAreas()) {
    const [lx, ly] = projectPoint(neighborhood.label);
    const width = drawCtx.measureText(neighborhood.name).width;
    const box = {
      left: lx - width / 2 - 4,
      right: lx + width / 2 + 4,
      top: ly - 6,
      bottom: ly + 6,
    };
    const overlaps = placedLabels.some(
      (placed) =>
        box.left < placed.right &&
        box.right > placed.left &&
        box.top < placed.bottom &&
        box.bottom > placed.top,
    );
    if (overlaps) continue;
    placedLabels.push(box);
    drawCtx.strokeText(neighborhood.name, lx, ly);
    drawCtx.fillText(neighborhood.name, lx, ly);
  }
}

function streetWidth(kind) {
  if (kind === "motorway") return 1.8;
  if (kind === "trunk") return 1.5;
  return 1.1;
}

function streetGeometries() {
  if (state.data.streets?.length) {
    return state.data.streets;
  }
  return (state.data.busRoutes || []).map((route) => ({
    kind: route.agency === "Pace" ? "primary" : "trunk",
    name: `${route.agency || "Transit"} ${route.label || "surface corridor"}`,
    points: route.points,
  }));
}

function drawStreets(drawCtx, projectPoint, { streetCurveTolerance = 0, curveMaxDepth = 0 } = {}) {
  if (!layerVisible("streets")) return;
  for (const street of streetGeometries()) {
    drawCtx.strokeStyle = "rgba(193, 202, 212, 0.72)";
    drawCtx.lineWidth = streetWidth(street.kind);
    drawCtx.lineCap = "round";
    drawCtx.lineJoin = "round";
    drawPolyline(drawCtx, street.points, projectPoint, {
      tolerance: streetCurveTolerance,
      maxDepth: curveMaxDepth,
    });
  }
}

function buildBaseMapCache(width, height, sourceTransform) {
  const surface = createCanvasSurface(width, height);
  surface.context.clearRect(0, 0, width, height);
  drawCityBasemap(surface.context, (point) => sourceTransform.toScreen(point), { includeBoroughBorders: false });
  surface.cacheKey = `${sourceTransform.cacheKey}|${activeModeSignature()}`;
  return surface;
}

function getBaseMapCache(width, height, sourceTransform) {
  const cache = state.baseMapCache;
  const cacheKey = `${sourceTransform.cacheKey}|${activeModeSignature()}`;
  if (cache && cache.width === width && cache.height === height && cache.cacheKey === cacheKey) {
    return cache;
  }
  const nextCache = buildBaseMapCache(width, height, sourceTransform);
  state.baseMapCache = nextCache;
  return nextCache;
}

function drawWarpedBaseMap(drawCtx, width, height, warp, sourceTransform, destinationTransform) {
  const surface = getBaseMapCache(width, height, sourceTransform);
  const { gridCols, gridRows, bounds } = state.data.meta;
  const [minX, minY, maxX, maxY] = bounds;
  const cellW = (maxX - minX) / gridCols;
  const cellH = (maxY - minY) / gridRows;

  drawCtx.save();
  drawCtx.imageSmoothingEnabled = true;
  for (let row = 0; row < gridRows; row += IMAGE_WARP_BLOCK_CELLS) {
    const rowEnd = Math.min(gridRows, row + IMAGE_WARP_BLOCK_CELLS);
    for (let col = 0; col < gridCols; col += IMAGE_WARP_BLOCK_CELLS) {
      const colEnd = Math.min(gridCols, col + IMAGE_WARP_BLOCK_CELLS);
      const worldP00 = [minX + col * cellW, minY + row * cellH];
      const worldP10 = [minX + colEnd * cellW, minY + row * cellH];
      const worldP11 = [minX + colEnd * cellW, minY + rowEnd * cellH];
      const worldP01 = [minX + col * cellW, minY + rowEnd * cellH];

      const srcP00 = sourceTransform.toScreen(worldP00);
      const srcP10 = sourceTransform.toScreen(worldP10);
      const srcP11 = sourceTransform.toScreen(worldP11);
      const srcP01 = sourceTransform.toScreen(worldP01);
      const dstP00 = destinationTransform.toScreen(warp.warpNodes[row][col]);
      const dstP10 = destinationTransform.toScreen(warp.warpNodes[row][colEnd]);
      const dstP11 = destinationTransform.toScreen(warp.warpNodes[rowEnd][colEnd]);
      const dstP01 = destinationTransform.toScreen(warp.warpNodes[rowEnd][col]);

      drawWarpedTriangle(drawCtx, surface.canvas, width, height, srcP00, srcP10, srcP11, dstP00, dstP10, dstP11);
      drawWarpedTriangle(drawCtx, surface.canvas, width, height, srcP00, srcP11, srcP01, dstP00, dstP11, dstP01);
    }
  }
  drawCtx.restore();
}

function buildDynamicAdjacencyEntry(fromIndex) {
  const defaults = state.travelSettingsDefaults || getTravelSettingsDefaults();
  const routeStates = state.data.routeStates;
  const stations = state.data.stations;
  const edges = state.data.adjacency[fromIndex] || [];
  const fromState = routeStates[fromIndex];

  return edges.map(([toIndex, weight]) => {
    const toState = routeStates[toIndex];
    const boardingDelta =
      (state.data.routeWaits?.[toState.routeId] ?? defaults.transitTime) - defaults.transitTime;
    if (fromState.routeId === toState.routeId) {
      return { toIndex, kind: "ride", rideMinutes: weight };
    }

    if (fromState.stationIndex === toState.stationIndex) {
      return { toIndex, kind: "transfer", boardingDelta };
    }

    const fromPoint = stations[fromState.stationIndex].point;
    const toPoint = stations[toState.stationIndex].point;
    const walkDistance = distance(fromPoint, toPoint);
    const walkPenalty = Math.max(
      0,
      weight -
        walkDistance / defaults.walkingSpeed -
        boardingDelta -
        defaults.transitTime -
        (state.data.meta.interComplexTransferPenalty ?? defaults.transferTime),
    );

    return {
      toIndex,
      kind: "interchange",
      boardingDelta,
      walkDistance,
      walkPenalty,
    };
  });
}

function dynamicEdgesForState(fromIndex) {
  if (!state.dynamicAdjacencyCache) {
    state.dynamicAdjacencyCache = new Array(state.data.routeStates.length);
  }
  if (!state.dynamicAdjacencyCache[fromIndex]) {
    state.dynamicAdjacencyCache[fromIndex] = buildDynamicAdjacencyEntry(fromIndex);
  }
  return state.dynamicAdjacencyCache[fromIndex];
}

function nearestStations(point, count, candidateIndices = null) {
  const settings = currentTravelSettings();
  const indices = candidateIndices
    ? stationsNearPoint(spatialIndexForStationList(candidateIndices), point, count)
    : state.data.stations.map((_, index) => index);
  return indices
    .map((index) => {
      const station = state.data.stations[index];
      return {
        index,
        name: station.name,
        walkMinutes:
          distance(point, station.point) / settings.walkingSpeed +
          state.data.meta.stationAccessPenalty,
      };
    })
    .sort((a, b) => a.walkMinutes - b.walkMinutes)
    .slice(0, count);
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const top = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this.bubbleDown(0);
    }
    return top;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].distance <= this.items[index].distance) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  bubbleDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.items[left].distance < this.items[smallest].distance) {
        smallest = left;
      }
      if (right < this.items.length && this.items[right].distance < this.items[smallest].distance) {
        smallest = right;
      }
      if (smallest === index) break;
      [this.items[smallest], this.items[index]] = [this.items[index], this.items[smallest]];
      index = smallest;
    }
  }
}

function runDijkstra(origin) {
  const settings = currentTravelSettings();
  const stateCount = state.data.routeStates.length;
  const distances = new Array(stateCount).fill(Infinity);
  const visited = new Array(stateCount).fill(false);
  const seeds = hasActiveTransitMode()
    ? nearestStations(origin.point, state.data.meta.originStationCount, activeTransitStationIndices())
    : [];
  const queue = new MinHeap();

  for (const seed of seeds) {
    for (const routeStateIndex of state.data.stationStates[seed.index] || []) {
      if (!isRouteStateEnabled(routeStateIndex)) continue;
      const routeId = state.data.routeStates[routeStateIndex].routeId;
      const boardingDelta = settings.useFlatWait
        ? 0
        : (state.data.routeWaits?.[routeId] ?? state.travelSettingsDefaults.transitTime) -
          state.travelSettingsDefaults.transitTime;
      const candidate = origin.swimMinutes + seed.walkMinutes + settings.transitTime + boardingDelta;
      if (candidate < distances[routeStateIndex]) {
        distances[routeStateIndex] = candidate;
        queue.push({ index: routeStateIndex, distance: candidate });
      }
    }
  }

  while (queue.items.length) {
    const next = queue.pop();
    const current = next.index;
    if (visited[current] || next.distance !== distances[current]) continue;
    visited[current] = true;
    for (const edge of dynamicEdgesForState(current)) {
      if (!isRouteStateEnabled(edge.toIndex)) continue;
      const boardingDelta = settings.useFlatWait ? 0 : edge.boardingDelta;
      const weight =
        edge.kind === "ride"
          ? edge.rideMinutes
          : edge.kind === "transfer"
            ? settings.transferTime + settings.transitTime + boardingDelta
            : edge.walkDistance / settings.walkingSpeed +
              edge.walkPenalty +
              settings.transferTime +
              settings.transitTime +
              boardingDelta;
      const nextIndex = edge.toIndex;
      const candidate = distances[current] + weight;
      if (candidate < distances[nextIndex]) {
        distances[nextIndex] = candidate;
        queue.push({ index: nextIndex, distance: candidate });
      }
    }
  }

  return { distances, seeds };
}

function directTravelMinutes(origin, destination) {
  const settings = currentTravelSettings();
  const directDistance = distance(origin.point, destination.point);
  const swimMinutes = origin.swimMinutes + destination.swimMinutes;
  let bestMinutes = Infinity;

  if (state.activeModes.drive) {
    bestMinutes = Math.min(
      bestMinutes,
      (directDistance * DIRECT_MODE_DISTANCE_MULTIPLIERS.drive) / DIRECT_MODE_SPEEDS.drive +
        DRIVE_ACCESS_PENALTY_MINUTES +
        swimMinutes,
    );
  }
  if (state.activeModes.bike) {
    bestMinutes = Math.min(
      bestMinutes,
      (directDistance * DIRECT_MODE_DISTANCE_MULTIPLIERS.bike) / DIRECT_MODE_SPEEDS.bike + swimMinutes,
    );
  }
  if (state.activeModes.walk) {
    bestMinutes = Math.min(
      bestMinutes,
      (directDistance * DIRECT_MODE_DISTANCE_MULTIPLIERS.walk) / settings.walkingSpeed + swimMinutes,
    );
  }

  return bestMinutes;
}

function estimateTravel(origin, originDistances, destinationPoint) {
  const destination = normalizeTravelPoint(destinationPoint);
  const swimMinutes = origin.swimMinutes + destination.swimMinutes;
  let bestMinutes = directTravelMinutes(origin, destination);
  const nearby = hasActiveTransitMode()
    ? nearestStations(destination.point, state.data.meta.cellNearestStations, activeTransitStationIndices())
    : [];
  for (const station of nearby) {
    for (const routeStateIndex of state.data.stationStates[station.index] || []) {
      if (!isRouteStateEnabled(routeStateIndex)) continue;
      bestMinutes = Math.min(
        bestMinutes,
        originDistances[routeStateIndex] + station.walkMinutes + destination.swimMinutes,
      );
    }
  }
  return {
    minutes: bestMinutes,
    baseMinutes: bestMinutes - swimMinutes,
    swimMinutes,
    destination,
  };
}

function roadRouteCacheKey(originPoint, destPoint) {
  const origin = worldToLonLat(originPoint);
  const dest = worldToLonLat(destPoint);
  return [origin.lon, origin.lat, dest.lon, dest.lat].map((v) => v.toFixed(5)).join(",");
}

async function fetchRoadRoute(originLonLat, destLonLat, mode) {
  if (!ROAD_ROUTING_PROXY_URL) return null;
  const profile = ROAD_ROUTING_PROFILES[mode];
  if (!profile) return null;
  const params = new URLSearchParams({
    profile,
    start: `${originLonLat.lon},${originLonLat.lat}`,
    end: `${destLonLat.lon},${destLonLat.lat}`,
  });
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ROAD_ROUTING_TIMEOUT_MS);
  try {
    const response = await fetch(`${ROAD_ROUTING_PROXY_URL}/route?${params}`, { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Number.isFinite(data.minutes)) return null;
    return { minutes: data.minutes, meters: data.meters };
  } catch (error) {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

function requestRoadRoutesForProbe() {
  if (!ROAD_ROUTING_PROXY_URL || !state.probePoint || !state.originPoint) return;
  const key = roadRouteCacheKey(state.originPoint, state.probePoint);
  if (state.roadRouteCache?.key === key) return;

  const cache = { key, results: {} };
  state.roadRouteCache = cache;

  const originLonLat = worldToLonLat(state.originPoint);
  const destLonLat = worldToLonLat(state.probePoint);

  for (const mode of ["walk", "bike", "drive"]) {
    if (!state.activeModes[mode]) continue;
    fetchRoadRoute(originLonLat, destLonLat, mode).then((result) => {
      if (state.roadRouteCache !== cache) return;
      cache.results[mode] = result;
      state.dirty = true;
      requestDraw();
    });
  }
}

function formatRoadRouteLines(results) {
  const labels = { walk: "Walk", bike: "Bike", drive: "Drive" };
  const lines = [];
  for (const mode of ["walk", "bike", "drive"]) {
    if (!state.activeModes[mode] || !(mode in results)) continue;
    const result = results[mode];
    lines.push(result ? `${labels[mode]} ${Math.round(result.minutes)} min by road` : `${labels[mode]}: road route unavailable`);
  }
  return lines;
}

function summarizeReachability(origin, originDistances) {
  const stationEntries = activeTransitStationEntries();
  const totalStations = stationEntries.length;
  const threshold = currentTravelSettings().maxTransitTime;
  let reachableStations = 0;

  for (const { index } of stationEntries) {
    const destination = normalizedStationPoint(index);
    let bestMinutes = directTravelMinutes(origin, destination);
    for (const routeStateIndex of state.data.stationStates[index] || []) {
      if (!isRouteStateEnabled(routeStateIndex)) continue;
      bestMinutes = Math.min(
        bestMinutes,
        originDistances[routeStateIndex] + state.data.meta.stationAccessPenalty + destination.swimMinutes,
      );
    }
    if (bestMinutes <= threshold) {
      reachableStations += 1;
    }
  }

  return {
    reachableStations,
    totalStations,
    threshold,
    ratio: totalStations ? reachableStations / totalStations : 0,
  };
}

function reachableStationIndexSet(origin, originDistances, threshold) {
  const indices = new Set();
  for (const { index } of activeTransitStationEntries()) {
    const destination = normalizedStationPoint(index);
    let bestMinutes = directTravelMinutes(origin, destination);
    for (const routeStateIndex of state.data.stationStates[index] || []) {
      if (!isRouteStateEnabled(routeStateIndex)) continue;
      bestMinutes = Math.min(
        bestMinutes,
        originDistances[routeStateIndex] + state.data.meta.stationAccessPenalty + destination.swimMinutes,
      );
    }
    if (bestMinutes <= threshold) indices.add(index);
  }
  return indices;
}

function updateCompareStats(mainWarp) {
  if (!state.compareOrigin || !state.originPoint || !mainWarp?.distances) {
    state.compareStats = null;
    syncCompareUi();
    return;
  }
  const threshold = currentTravelSettings().maxTransitTime;
  const normalizedOrigin = normalizeTravelPoint(state.originPoint);
  const mainSet = reachableStationIndexSet(normalizedOrigin, mainWarp.distances, threshold);

  const normalizedCompareOrigin = normalizeTravelPoint(state.compareOrigin.point);
  if (!state.compareDijkstraCache) {
    state.compareDijkstraCache = runDijkstra(normalizedCompareOrigin);
  }
  const compareSet = reachableStationIndexSet(normalizedCompareOrigin, state.compareDijkstraCache.distances, threshold);

  let overlap = 0;
  for (const index of mainSet) {
    if (compareSet.has(index)) overlap += 1;
  }

  state.compareStats = {
    mainCount: mainSet.size,
    compareCount: compareSet.size,
    overlap,
  };
  syncCompareUi();
}

function syncCompareUi() {
  for (const ui of compareUis) {
    if (!ui.button || !ui.meta) continue;
    ui.button.disabled = !state.originPoint && !state.compareOrigin && !state.compareModeActive;
    if (state.compareModeActive) {
      ui.button.textContent = "Cancel";
      ui.button.classList.add("is-active");
      ui.meta.textContent = "Tap or click anywhere on the map to drop the second origin.";
    } else if (state.compareOrigin) {
      ui.button.textContent = "Clear origin B";
      ui.button.classList.remove("is-active");
      if (state.compareStats) {
        const { mainCount, compareCount, overlap } = state.compareStats;
        ui.meta.textContent = `${overlap} stations reachable from both origins (${mainCount - overlap} only from A, ${compareCount - overlap} only from B).`;
      } else {
        ui.meta.textContent = "Pin a main origin to compare reach with origin B.";
      }
    } else {
      ui.button.textContent = "+ Add second origin";
      ui.button.classList.remove("is-active");
      ui.meta.textContent = state.originPoint
        ? "Add a second origin to see where their reach overlaps."
        : "Pin a main origin first, then add a second to see where their reach overlaps.";
    }
  }
}

function handleCompareToggleClick() {
  if (state.compareModeActive) {
    state.compareModeActive = false;
  } else if (state.compareOrigin) {
    state.compareOrigin = null;
    state.compareDijkstraCache = null;
    state.compareStats = null;
  } else if (state.originPoint) {
    state.compareModeActive = true;
  } else {
    return;
  }
  syncCompareUi();
  state.dirty = true;
  requestDraw();
}

function syncReachabilityScore(summary = null) {
  const minutes = Math.round(currentTravelSettings().maxTransitTime);
  const label = `${minutes}-Minute Reach`;
  for (const el of reachScoreLabels) el.textContent = label;

  if (!summary) {
    reachScoreCard.hidden = true;
    reachScoreValue.textContent = "-- / --";
    reachScoreMeta.textContent = `Choose an origin to see how much of the regional transit stops you can reach in ${minutes} minutes.`;
    if (mobileReachValue && mobileReachMeta) {
      mobileReachValue.textContent = "-- / --";
      mobileReachMeta.textContent = `Choose an origin to see how much of the regional transit stops you can reach in ${minutes} minutes.`;
    }
    return;
  }

  reachScoreCard.hidden = false;
  const percent = Math.round(summary.ratio * 100);
  const summaryMinutes = Math.round(summary.threshold ?? minutes);
  reachScoreValue.textContent = `${summary.reachableStations} / ${summary.totalStations}`;
  reachScoreMeta.textContent = `${percent}% of stations are reachable within ${summaryMinutes} minutes.`;
  if (mobileReachValue && mobileReachMeta) {
    mobileReachValue.textContent = `${summary.reachableStations} / ${summary.totalStations}`;
    mobileReachMeta.textContent = `${percent}% of stations are reachable within ${summaryMinutes} minutes.`;
  }
}

// Surfaces *why* a transit-mode reach number looks the way it does: sparse
// lines (Metra especially) spend most of a rider's time budget waiting for
// the next departure, not riding. Picks the most frequent currently-enabled
// route serving the nearest seed station, since that's the realistic "best
// bet" a rider would actually take from here.
function describeStationFrequency(stationIndex) {
  if (stationIndex == null || !state.data) return null;
  const routeStateIndexes = state.data.stationStates?.[stationIndex] || [];
  let best = null;
  for (const routeStateIndex of routeStateIndexes) {
    if (!isRouteStateEnabled(routeStateIndex)) continue;
    const routeId = state.data.routeStates[routeStateIndex].routeId;
    const wait = state.data.routeWaits?.[routeId];
    if (wait == null) continue;
    if (!best || wait < best.wait) {
      const style = state.data.routeStyles?.[routeId];
      best = { wait, label: style?.label || routeId, agency: style?.agency || "" };
    }
  }
  if (!best) return null;
  const headwayMinutes = Math.round(best.wait * 2);
  const agencyPart = best.agency ? `${best.agency} ` : "";
  return `${agencyPart}${best.label} · every ~${headwayMinutes} min`;
}

function syncOriginFrequencyNote(stationIndex) {
  const text =
    hasActiveTransitMode() && !currentTravelSettings().useFlatWait ? describeStationFrequency(stationIndex) : null;
  for (const el of [originFrequencyNote, mobileOriginFrequencyNote]) {
    if (!el) continue;
    if (text) {
      el.textContent = text;
      el.hidden = false;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }
}

function computeWarp(origin, options = WARP_QUALITY_OPTIONS.full) {
  const {
    quality = "full",
    sampleStep = WARP_GRID_SAMPLE_STEP,
    smoothingPasses = WARP_NODE_SMOOTHING_PASSES,
    includeReachability = true,
  } = options;
  const { distances, seeds } = runDijkstra(origin);
  const settings = currentTravelSettings();
  const { gridCols, gridRows, bounds } = state.data.meta;
  const [minX, minY, maxX, maxY] = bounds;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const cellW = spanX / gridCols;
  const cellH = spanY / gridRows;
  const minuteGrid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(Infinity));
  const validMask = Array.from({ length: gridRows }, () => new Array(gridCols).fill(false));
  const assignMinuteBlock = (startRow, startCol, minutes) => {
    for (let row = startRow; row < Math.min(gridRows, startRow + sampleStep); row += 1) {
      for (let col = startCol; col < Math.min(gridCols, startCol + sampleStep); col += 1) {
        const maskCellIndex = state.data.mask[row * gridCols + col];
        if (maskCellIndex === -1 || maskCellIndex === undefined) continue;
        minuteGrid[row][col] = minutes;
        validMask[row][col] = true;
      }
    }
  };

  // Tracks whether *anything* on the map is reachable within the current max
  // transit time. When an origin is far from any station of the active
  // mode(s) -- e.g. dropped between two Metra stops in the exurbs, where
  // walking to the nearest one alone can take well over an hour -- every
  // cell's bestMinutes stays at/above maxTransitTime, so minuteToAreaWeight()
  // returns the neutral weight everywhere and the warp has nothing to
  // displace. That's mathematically correct, but left unindicated it reads
  // as "the warp is broken" instead of "nothing is reachable from here."
  let anyReachable = false;
  for (let maskIndex = 0; maskIndex < state.data.mask.length; maskIndex += 1) {
    const cellIndex = state.data.mask[maskIndex];
    if (cellIndex === -1) continue;
    const cell = state.data.cells[cellIndex];
    if (cell.row % sampleStep !== 0 || cell.col % sampleStep !== 0) continue;
    const destination = normalizedCellPoint(cellIndex);
    let bestMinutes = directTravelMinutes(origin, destination);
    for (const [stationIndex] of cellTransitAccess(cell, cellIndex)) {
      if (!stationHasEnabledRoute(stationIndex)) continue;
      const egressMinutes =
        distance(cell.point, state.data.stations[stationIndex].point) / settings.walkingSpeed +
        state.data.meta.stationAccessPenalty;
      for (const routeStateIndex of state.data.stationStates[stationIndex] || []) {
        if (!isRouteStateEnabled(routeStateIndex)) continue;
        bestMinutes = Math.min(bestMinutes, distances[routeStateIndex] + egressMinutes);
      }
    }
    if (bestMinutes < settings.maxTransitTime) anyReachable = true;
    assignMinuteBlock(cell.row, cell.col, bestMinutes);
  }

  let smoothedMinutes = minuteGrid.map((row) => row.slice());
  for (let pass = 0; pass < WEIGHT_BLUR_PASSES; pass += 1) {
    const nextMinutes = Array.from({ length: gridRows }, () => new Array(gridCols).fill(Infinity));
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        if (!validMask[row][col]) continue;
        let totalMinutes = 0;
        let count = 0;
        for (let y = Math.max(0, row - WEIGHT_BLUR_RADIUS); y <= Math.min(gridRows - 1, row + WEIGHT_BLUR_RADIUS); y += 1) {
          for (let x = Math.max(0, col - WEIGHT_BLUR_RADIUS); x <= Math.min(gridCols - 1, col + WEIGHT_BLUR_RADIUS); x += 1) {
            if (!validMask[y][x]) continue;
            totalMinutes += smoothedMinutes[y][x];
            count += 1;
          }
        }
        nextMinutes[row][col] = count ? totalMinutes / count : smoothedMinutes[row][col];
      }
    }
    smoothedMinutes = nextMinutes;
  }

  const areaWeights = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));
  const anomalyGrid = Array.from({ length: gridRows }, () => new Array(gridCols).fill(0));

  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      if (!validMask[row][col]) continue;
      const areaWeight = minuteToAreaWeight(smoothedMinutes[row][col]);
      areaWeights[row][col] = areaWeight;
      anomalyGrid[row][col] = areaWeight - 1;
    }
  }

  const reachability = includeReachability ? summarizeReachability(origin, distances) : null;

  const warpNodes = Array.from({ length: gridRows + 1 }, () => new Array(gridCols + 1).fill(null));
  const sigmaSq = WARP_SIGMA_CELLS * WARP_SIGMA_CELLS;
  const maxShiftX = cellW * WARP_MAX_SHIFT_CELLS;
  const maxShiftY = cellH * WARP_MAX_SHIFT_CELLS;

  for (let nodeRow = 0; nodeRow <= gridRows; nodeRow += 1) {
    for (let nodeCol = 0; nodeCol <= gridCols; nodeCol += 1) {
      const baseX = minX + nodeCol * cellW;
      const baseY = minY + nodeRow * cellH;
      let offsetX = 0;
      let offsetY = 0;

      const rowStart = Math.max(0, nodeRow - WARP_INFLUENCE_RADIUS);
      const rowEnd = Math.min(gridRows - 1, nodeRow + WARP_INFLUENCE_RADIUS - 1);
      const colStart = Math.max(0, nodeCol - WARP_INFLUENCE_RADIUS);
      const colEnd = Math.min(gridCols - 1, nodeCol + WARP_INFLUENCE_RADIUS - 1);

      for (let row = rowStart; row <= rowEnd; row += 1) {
        for (let col = colStart; col <= colEnd; col += 1) {
          if (!validMask[row][col]) continue;
          const anomaly = anomalyGrid[row][col];
          if (Math.abs(anomaly) < 1e-6) continue;
          const centerX = minX + (col + 0.5) * cellW;
          const centerY = minY + (row + 0.5) * cellH;
          const dxCells = (baseX - centerX) / cellW;
          const dyCells = (baseY - centerY) / cellH;
          const distSqCells = dxCells * dxCells + dyCells * dyCells;
          const distCells = Math.sqrt(distSqCells + 1e-9);
          const gaussian = Math.exp(-distSqCells / (2 * sigmaSq));
          const strength = anomaly * gaussian * WARP_DISPLACEMENT_SCALE;
          offsetX += (dxCells / distCells) * strength * cellW;
          offsetY += (dyCells / distCells) * strength * cellH;
        }
      }

      offsetX = clamp(offsetX, -maxShiftX, maxShiftX);
      offsetY = clamp(offsetY, -maxShiftY, maxShiftY);

      const edgeDistance = Math.min(nodeCol, gridCols - nodeCol, nodeRow, gridRows - nodeRow);
      const edgeFade = smoothstep(0, WARP_EDGE_FADE_CELLS, edgeDistance);
      warpNodes[nodeRow][nodeCol] = [baseX + offsetX * edgeFade, baseY + offsetY * edgeFade];
    }
  }

  for (let pass = 0; pass < smoothingPasses; pass += 1) {
    const nextNodes = warpNodes.map((row) => row.map((point) => point.slice()));
    for (let nodeRow = 1; nodeRow < gridRows; nodeRow += 1) {
      for (let nodeCol = 1; nodeCol < gridCols; nodeCol += 1) {
        let totalX = 0;
        let totalY = 0;
        let count = 0;
        for (let y = nodeRow - 1; y <= nodeRow + 1; y += 1) {
          for (let x = nodeCol - 1; x <= nodeCol + 1; x += 1) {
            totalX += warpNodes[y][x][0];
            totalY += warpNodes[y][x][1];
            count += 1;
          }
        }
        const edgeDistance = Math.min(nodeCol, gridCols - nodeCol, nodeRow, gridRows - nodeRow);
        const edgeFade = smoothstep(0, WARP_EDGE_FADE_CELLS, edgeDistance);
        const smoothedX = totalX / count;
        const smoothedY = totalY / count;
        nextNodes[nodeRow][nodeCol] = [
          lerp(minX + nodeCol * cellW, smoothedX, 0.72 * edgeFade),
          lerp(minY + nodeRow * cellH, smoothedY, 0.72 * edgeFade),
        ];
      }
    }
    for (let nodeRow = 0; nodeRow <= gridRows; nodeRow += 1) {
      for (let nodeCol = 0; nodeCol <= gridCols; nodeCol += 1) {
        warpNodes[nodeRow][nodeCol] = nextNodes[nodeRow][nodeCol];
      }
    }
  }

  function warpPoint(point) {
    const clampedX = clamp(point[0], minX, maxX);
    const clampedY = clamp(point[1], minY, maxY);
    const rawCol = clamp((clampedX - minX) / cellW, 0, gridCols - 1e-9);
    const rawRow = clamp((clampedY - minY) / cellH, 0, gridRows - 1e-9);
    const col = clamp(Math.floor(rawCol), 0, gridCols - 1);
    const row = clamp(Math.floor(rawRow), 0, gridRows - 1);
    const tx = rawCol - col;
    const ty = rawRow - row;
    return bilerpPoint(
      warpNodes[row][col],
      warpNodes[row][col + 1],
      warpNodes[row + 1][col],
      warpNodes[row + 1][col + 1],
      tx,
      ty,
    );
  }

  function inverseWarpPoint(point) {
    const approximate = (() => {
      let guess = [point[0], point[1]];
      for (let iteration = 0; iteration < 6; iteration += 1) {
        const projected = warpPoint(guess);
        guess = [
          clamp(guess[0] + (point[0] - projected[0]), minX, maxX),
          clamp(guess[1] + (point[1] - projected[1]), minY, maxY),
        ];
      }
      return guess;
    })();

    const approxCol = clamp(Math.floor((approximate[0] - minX) / cellW), 0, gridCols - 1);
    const approxRow = clamp(Math.floor((approximate[1] - minY) / cellH), 0, gridRows - 1);

    function solveCell(row, col) {
      if (row < 0 || row >= gridRows || col < 0 || col >= gridCols) return null;
      const p00 = warpNodes[row][col];
      const p10 = warpNodes[row][col + 1];
      const p11 = warpNodes[row + 1][col + 1];
      const p01 = warpNodes[row + 1][col];

      const upperWeights = barycentricWeights(point, p00, p10, p11);
      if (upperWeights) {
        return interpolateTriangle(
          upperWeights,
          [minX + col * cellW, minY + row * cellH],
          [minX + (col + 1) * cellW, minY + row * cellH],
          [minX + (col + 1) * cellW, minY + (row + 1) * cellH],
        );
      }

      const lowerWeights = barycentricWeights(point, p00, p11, p01);
      if (lowerWeights) {
        return interpolateTriangle(
          lowerWeights,
          [minX + col * cellW, minY + row * cellH],
          [minX + (col + 1) * cellW, minY + (row + 1) * cellH],
          [minX + col * cellW, minY + (row + 1) * cellH],
        );
      }

      return null;
    }

    for (let radius = 0; radius <= 8; radius += 1) {
      for (let row = approxRow - radius; row <= approxRow + radius; row += 1) {
        for (let col = approxCol - radius; col <= approxCol + radius; col += 1) {
          if (radius > 0 && row > approxRow - radius && row < approxRow + radius && col > approxCol - radius && col < approxCol + radius) {
            continue;
          }
          const solved = solveCell(row, col);
          if (solved) return solved;
        }
      }
    }

    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        const solved = solveCell(row, col);
        if (solved) return solved;
      }
    }

    return approximate;
  }

  const allWarpedNodes = warpNodes.flat();
  const xs = allWarpedNodes.map((point) => point[0]);
  const ys = allWarpedNodes.map((point) => point[1]);
  const warpedBounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const expansion = includeReachability ? Array.from({ length: gridRows }, () => new Array(gridCols).fill(0)) : null;
  if (expansion) {
    for (let row = 0; row < gridRows; row += 1) {
      for (let col = 0; col < gridCols; col += 1) {
        if (!validMask[row][col]) continue;
        expansion[row][col] =
          quadArea(
            warpNodes[row][col],
            warpNodes[row][col + 1],
            warpNodes[row + 1][col + 1],
            warpNodes[row + 1][col],
          ) / (cellW * cellH);
      }
    }
  }

  return {
    quality,
    distances,
    seeds,
    reachability,
    warpPoint,
    inverseWarpPoint,
    warpedBounds,
    warpNodes,
    minutes: smoothedMinutes,
    expansion,
    areaWeights,
    validMask,
    anyReachable,
  };
}

function getWarpCacheKey(origin, options = WARP_QUALITY_OPTIONS.full) {
  const settings = currentTravelSettings();
  return JSON.stringify({
    quality: options.quality || "full",
    point: [Math.round(origin.point[0]), Math.round(origin.point[1])],
    swim: Math.round(origin.swimMinutes * 10) / 10,
    modes: activeModeSignature(),
    warp: {
      sampleStep: options.sampleStep,
      smoothingPasses: options.smoothingPasses,
      includeReachability: Boolean(options.includeReachability),
    },
    settings: {
      walkingSpeed: Math.round(settings.walkingSpeed * 10) / 10,
      transitTime: Math.round(settings.transitTime * 10) / 10,
      transferTime: Math.round(settings.transferTime * 10) / 10,
      maxTransitTime: Math.round(settings.maxTransitTime * 10) / 10,
    },
  });
}

function getComputedWarp(origin, quality = "full") {
  const options = warpOptionsForQuality(quality);
  const cacheKey = getWarpCacheKey(origin, options);
  const cache = quality === "live" ? state.liveWarpCache : state.warpCache;
  if (cache?.cacheKey === cacheKey) {
    return cache.warp;
  }
  const warp = computeWarp(origin, options);
  warp.cacheKey = cacheKey;
  if (quality === "live") {
    state.liveWarpCache = { cacheKey, warp };
  } else {
    state.warpCache = { cacheKey, warp };
  }
  return warp;
}

function drawHeatmap(drawCtx, warp, transform, useWarpGeometry = true, options = {}) {
  const {
    resolutionScale = HEATMAP_RESOLUTION_SCALE,
    blurPx = HEATMAP_BLUR_PX,
    cellStep = 1,
    cacheVariant = "full",
  } = options;
  const { gridCols, gridRows, bounds } = state.data.meta;
  const { width, height } = mapCanvas.getBoundingClientRect();
  const heatmapCacheKey = [
    warp.cacheKey || "uncached-warp",
    transform.cacheKey || "uncached-transform",
    useWarpGeometry ? "warped" : "flat",
    cacheVariant,
    resolutionScale,
    blurPx,
    cellStep,
    Math.round(width),
    Math.round(height),
  ].join("|");
  const cachedHeatmap = state.heatmapCache;
  if (
    cachedHeatmap &&
    cachedHeatmap.cacheKey === heatmapCacheKey &&
    cachedHeatmap.width === Math.round(width) &&
    cachedHeatmap.height === Math.round(height)
  ) {
    drawCtx.save();
    drawCtx.globalCompositeOperation = "multiply";
    drawCtx.globalAlpha = HEATMAP_ALPHA;
    drawCtx.imageSmoothingEnabled = true;
    drawCtx.drawImage(cachedHeatmap.canvas, 0, 0, width, height);
    drawCtx.restore();
    return;
  }

  const scale = resolutionScale;
  const rawCanvas = document.createElement("canvas");
  rawCanvas.width = Math.max(1, Math.round(width * scale));
  rawCanvas.height = Math.max(1, Math.round(height * scale));
  const rawCtx = rawCanvas.getContext("2d");
  rawCtx.setTransform(scale, 0, 0, scale, 0, 0);
  rawCtx.imageSmoothingEnabled = true;
  const [minX, minY, maxX, maxY] = bounds;
  const cellW = (maxX - minX) / gridCols;
  const cellH = (maxY - minY) / gridRows;

  for (let row = 0; row < gridRows; row += cellStep) {
    for (let col = 0; col < gridCols; col += cellStep) {
      if (!warp.validMask[row][col]) continue;
      rawCtx.fillStyle = heatmapColor(warp.minutes[row][col], 1);
      const nextRow = Math.min(gridRows, row + cellStep);
      const nextCol = Math.min(gridCols, col + cellStep);
      if (useWarpGeometry) {
        const p00 = transform.toScreen(warp.warpNodes[row][col]);
        const p10 = transform.toScreen(warp.warpNodes[row][nextCol]);
        const p11 = transform.toScreen(warp.warpNodes[nextRow][nextCol]);
        const p01 = transform.toScreen(warp.warpNodes[nextRow][col]);
        rawCtx.beginPath();
        rawCtx.moveTo(p00[0], p00[1]);
        rawCtx.lineTo(p10[0], p10[1]);
        rawCtx.lineTo(p11[0], p11[1]);
        rawCtx.lineTo(p01[0], p01[1]);
        rawCtx.closePath();
        rawCtx.fill();
      } else {
        const x0 = minX + col * cellW;
        const y0 = minY + row * cellH;
        const x1 = minX + nextCol * cellW;
        const y1 = minY + nextRow * cellH;
        const left = transform.toScreen([x0, y0])[0];
        const right = transform.toScreen([x1, y0])[0];
        const top = transform.toScreen([x0, y1])[1];
        const bottom = transform.toScreen([x0, y0])[1];
        rawCtx.fillRect(left, top, Math.max(1, right - left), Math.max(1, bottom - top));
      }
    }
  }

  const blurredCanvas = document.createElement("canvas");
  blurredCanvas.width = rawCanvas.width;
  blurredCanvas.height = rawCanvas.height;
  const blurredCtx = blurredCanvas.getContext("2d");
  blurredCtx.setTransform(scale, 0, 0, scale, 0, 0);
  blurredCtx.imageSmoothingEnabled = true;
  blurredCtx.filter = `blur(${blurPx}px)`;
  blurredCtx.drawImage(rawCanvas, 0, 0, width, height);
  blurredCtx.filter = "none";

  const maskedCanvas = document.createElement("canvas");
  maskedCanvas.width = rawCanvas.width;
  maskedCanvas.height = rawCanvas.height;
  const maskedCtx = maskedCanvas.getContext("2d");
  maskedCtx.setTransform(scale, 0, 0, scale, 0, 0);
  maskedCtx.imageSmoothingEnabled = true;
  maskedCtx.save();
  traceBoroughMaskPath(maskedCtx, (point) => transform.toScreen(useWarpGeometry ? warp.warpPoint(point) : point));
  maskedCtx.clip("evenodd");
  maskedCtx.drawImage(blurredCanvas, 0, 0, width, height);
  maskedCtx.restore();
  state.heatmapCache = {
    cacheKey: heatmapCacheKey,
    width: Math.round(width),
    height: Math.round(height),
    canvas: maskedCanvas,
  };

  drawCtx.save();
  drawCtx.globalCompositeOperation = "multiply";
  drawCtx.globalAlpha = HEATMAP_ALPHA;
  drawCtx.imageSmoothingEnabled = true;
  drawCtx.drawImage(maskedCanvas, 0, 0, width, height);
  drawCtx.restore();
}

function drawReachabilityOutline(drawCtx, warp, transform, useWarpGeometry = true) {
  const threshold = currentTravelSettings().maxTransitTime;
  const { gridCols, gridRows, bounds } = state.data.meta;
  const [minX, minY, maxX, maxY] = bounds;
  const cellW = (maxX - minX) / gridCols;
  const cellH = (maxY - minY) / gridRows;
  const isReachable = (row, col) =>
    row >= 0 &&
    row < gridRows &&
    col >= 0 &&
    col < gridCols &&
    warp.validMask[row][col] &&
    warp.minutes[row][col] <= threshold;

  const cellCorner = (row, col) => {
    if (useWarpGeometry) {
      return warp.warpNodes[row][col];
    }
    return [minX + col * cellW, minY + row * cellH];
  };

  const drawEdge = (start, end) => {
    const [sx, sy] = transform.toScreen(start);
    const [ex, ey] = transform.toScreen(end);
    drawCtx.moveTo(sx, sy);
    drawCtx.lineTo(ex, ey);
  };

  drawCtx.save();
  drawCtx.lineJoin = "round";
  drawCtx.lineCap = "round";

  drawCtx.beginPath();
  for (let row = 0; row < gridRows; row += 1) {
    for (let col = 0; col < gridCols; col += 1) {
      if (!isReachable(row, col)) continue;

      if (!isReachable(row - 1, col)) {
        drawEdge(cellCorner(row, col), cellCorner(row, col + 1));
      }
      if (!isReachable(row, col + 1)) {
        drawEdge(cellCorner(row, col + 1), cellCorner(row + 1, col + 1));
      }
      if (!isReachable(row + 1, col)) {
        drawEdge(cellCorner(row + 1, col + 1), cellCorner(row + 1, col));
      }
      if (!isReachable(row, col - 1)) {
        drawEdge(cellCorner(row + 1, col), cellCorner(row, col));
      }
    }
  }

  drawCtx.strokeStyle = "rgba(255, 248, 239, 0.95)";
  drawCtx.lineWidth = 5;
  drawCtx.stroke();

  drawCtx.strokeStyle = "rgba(215, 92, 46, 0.98)";
  drawCtx.lineWidth = 2.5;
  drawCtx.stroke();
  drawCtx.restore();
}

function drawGeographicMap(drawCtx, width, height, statusMessage = "Geographic map view") {
  drawPanelBackground(drawCtx, width, height);
  if (!state.transform) return;
  const renderTransform = pannedTransform(state.transform);
  const projectPoint = (point) => renderTransform.toScreen(point);
  drawLake(drawCtx, projectPoint, width, height);
  drawExternalLand(drawCtx, projectPoint);
  drawCityBasemap(drawCtx, projectPoint);
  drawStations(drawCtx, projectPoint);
  drawBoroughLabels(drawCtx, projectPoint);

  if (state.originPoint) {
    if (layerVisible("interactionMarkers")) {
      const originScreen = projectPoint(state.originPoint);
      drawMarker(drawCtx, originScreen, "#d75c2e", 24, 5.5);
      drawPinnedLabel(drawCtx, originScreen, currentOriginSummary("regional transit"));
    }
  } else if (state.cursorScreen) {
    if (layerVisible("interactionMarkers")) {
      drawMarker(drawCtx, state.cursorScreen, "#d75c2e", 24, 5.5);
    }
  }

  state.currentRender = {
    warp: {
      inverseWarpPoint: (point) => point,
      distances: null,
      reachability: null,
      seeds: [],
      origin: state.originPoint ? normalizeTravelPoint(state.originPoint) : null,
    },
    transform: renderTransform,
    anchorOffset: state.mapPanOffset.slice(),
    projectPoint,
  };
  statusText.textContent = statusMessage;
  syncReachabilityScore();
  syncMobileSheet();
}

function drawMap(drawCtx, width, height) {
  if (!state.transform) return;

  if (!state.originPoint) {
    drawPanelBackground(drawCtx, width, height);
    const renderTransform = pannedTransform(state.transform);
    const projectPoint = (point) => renderTransform.toScreen(point);
    drawLake(drawCtx, projectPoint, width, height);
    drawExternalLand(drawCtx, projectPoint);
    drawCityBasemap(drawCtx, projectPoint);
    drawStations(drawCtx, projectPoint);
    drawBoroughLabels(drawCtx, projectPoint);
    if (layerVisible("interactionMarkers") && state.cursorScreen) {
      drawMarker(drawCtx, state.cursorScreen, "#d75c2e", 24, 5.5);
    }

    statusText.textContent = state.cursorScreen
      ? "Release to pin the origin."
      : "Drag on the map to place an origin.";
    state.currentRender = {
      warp: {
        inverseWarpPoint: (point) => point,
        distances: null,
        reachability: null,
        seeds: [],
      },
      transform: renderTransform,
      anchorOffset: state.mapPanOffset.slice(),
      projectPoint,
    };
    syncReachabilityScore();
    syncOriginFrequencyNote(null);
    syncMobileSheet();
    return;
  }

  const normalizedOrigin = normalizeTravelPoint(state.originPoint);
  const warpQuality = currentWarpQuality();
  const isLiveWarp = warpQuality === "live";
  const warp = getComputedWarp(normalizedOrigin, warpQuality);
  const baseTransform = state.transform;
  const warpPoint = state.showWarp && warp ? warp.warpPoint : (point) => point;
  const inverseWarpPoint = warp ? warp.inverseWarpPoint : (point) => point;
  const warpedBounds = state.showWarp && warp ? warp.warpedBounds : state.data.meta.bounds;
  const zoomFocusPoint = state.viewportScale > MIN_VIEWPORT_SCALE ? currentZoomFocusPoint() : null;
  const anchorScreen = zoomFocusPoint
    ? [width / 2, height / 2]
    : state.showWarp && state.pinned && !state.isMobile
      ? state.pinnedScreen
      : null;
  const anchorWorldPoint = zoomFocusPoint || state.originPoint;
  const anchoredOrigin = baseTransform.toScreen(warpPoint(anchorWorldPoint));
  const [warpMinX, warpMinY, warpMaxX, warpMaxY] = warpedBounds;
  const topLeft = baseTransform.toScreen([warpMinX, warpMaxY]);
  const bottomRight = baseTransform.toScreen([warpMaxX, warpMinY]);
  const leftBound = topLeft[0];
  const topBound = topLeft[1];
  const rightBound = bottomRight[0];
  const bottomBound = bottomRight[1];
  const desiredDx = anchorScreen ? anchorScreen[0] - anchoredOrigin[0] : 0;
  const desiredDy = anchorScreen ? anchorScreen[1] - anchoredOrigin[1] : 0;
  const minDx = PANEL_PADDING - leftBound;
  const maxDx = width - PANEL_PADDING - rightBound;
  const minDy = PANEL_PADDING - topBound;
  const maxDy = height - PANEL_PADDING - bottomBound;
  const dx = zoomFocusPoint ? desiredDx : clampToRange(desiredDx, minDx, maxDx);
  const dy = zoomFocusPoint ? desiredDy : clampToRange(desiredDy, minDy, maxDy);
  const transform = offsetTransform(baseTransform, dx + state.mapPanOffset[0], dy + state.mapPanOffset[1]);
  const projectPoint = (point) => transform.toScreen(warpPoint(point));
  const externalLandProjectPoint = (point) => transform.toScreen(point);
  const lineCurveOptions = state.showWarp
    ? {
        streetCurveTolerance: isLiveWarp ? WARP_LINE_CURVE_TOLERANCE_PX * 2.5 : WARP_LINE_CURVE_TOLERANCE_PX,
        routeCurveTolerance: isLiveWarp ? WARP_LINE_CURVE_TOLERANCE_PX * 2.5 : WARP_LINE_CURVE_TOLERANCE_PX,
        curveMaxDepth: isLiveWarp ? Math.max(1, WARP_LINE_MAX_SUBDIVISION_DEPTH - 2) : WARP_LINE_MAX_SUBDIVISION_DEPTH,
      }
    : {};
  state.currentRender = {
    warp: {
      inverseWarpPoint: state.showWarp ? inverseWarpPoint : (point) => point,
      distances: warp?.distances ?? null,
      reachability: warp?.reachability ?? null,
      seeds: warp?.seeds ?? [],
      origin: normalizedOrigin,
    },
    transform,
    anchorOffset: [dx, dy],
    projectPoint,
  };
  syncReachabilityScore(warp?.reachability ?? null);
  updateCompareStats(warp);

  drawPanelBackground(drawCtx, width, height);
  drawLake(drawCtx, projectPoint, width, height);
  drawExternalLand(drawCtx, state.showWarp ? projectPoint : externalLandProjectPoint);
  drawCityBasemap(drawCtx, projectPoint, {
    includeBoroughBorders: !state.showWarp,
    ...lineCurveOptions,
  });

  if (layerVisible("heatmap") && state.showHeatmap && warp) {
    drawHeatmap(
      drawCtx,
      warp,
      transform,
      state.showWarp,
      isLiveWarp
        ? {
            resolutionScale: LIVE_HEATMAP_RESOLUTION_SCALE,
            blurPx: LIVE_HEATMAP_BLUR_PX,
            cellStep: LIVE_HEATMAP_CELL_STEP,
            cacheVariant: "live",
          }
        : undefined,
    );
  }

  if (!isLiveWarp && layerVisible("reachabilityOutline") && state.showReachOutline && warp) {
    drawReachabilityOutline(drawCtx, warp, transform, state.showWarp);
  }

  const nearest = warp?.seeds?.[0] ?? null;
  const station = nearest ? state.data.stations[nearest.index] : null;

  drawStations(drawCtx, projectPoint);
  drawBoroughLabels(drawCtx, projectPoint);

  if (layerVisible("interactionMarkers") && state.originPoint) {
    const originScreen = projectPoint(state.originPoint);
    drawMarker(drawCtx, originScreen, "#d75c2e", 24, 5.5);
    drawPinnedLabel(drawCtx, originScreen, currentOriginSummary(station?.name ?? "regional transit"));
  } else if (layerVisible("interactionMarkers") && state.cursorScreen) {
    drawMarker(drawCtx, state.cursorScreen, "#d75c2e", 24, 5.5);
  }

  if (layerVisible("interactionMarkers") && state.probePoint) {
    drawMarker(drawCtx, projectPoint(state.probePoint), "#17304d", 18, 4.3, 0.18);
  } else if (layerVisible("interactionMarkers") && state.pinned && state.cursorScreen) {
    drawMarker(drawCtx, state.cursorScreen, "#17304d", 18, 4.3, 0.18);
  }

  if (layerVisible("interactionMarkers") && state.compareOrigin) {
    const compareScreen = projectPoint(state.compareOrigin.point);
    drawMarker(drawCtx, compareScreen, "#2f8f6f", 22, 5, 0.42);
    drawPinnedLabel(drawCtx, compareScreen, "Origin B", { align: "right" });
  }

  const activeProbePoint = state.probePoint || (state.isMobile ? null : state.cursorPoint);
  const activeProbeScreen = state.probePoint
    ? projectPoint(state.probePoint)
    : state.isMobile
      ? null
      : state.cursorScreen;
  // warp.reachability (exact, per-station) and warp.anyReachable (coarse,
  // sampled grid cells used to drive the visual warp) can disagree: a small
  // reachable pocket can fall between grid samples and get missed by
  // anyReachable while summarizeReachability still finds it via the real
  // station points. Trust the exact station check whenever it ran (the
  // settled "full" pass); only fall back to the cell sample during a live
  // drag, where reachability is skipped for performance.
  const nothingReachable = warp
    ? warp.reachability
      ? warp.reachability.reachableStations === 0
      : warp.anyReachable === false
    : false;
  const unreachableNote = nothingReachable
    ? ` — nothing reachable within ${Math.round(currentTravelSettings().maxTransitTime)} min from here, so the map has nothing to warp. Try a point closer to a station, or raise "Maximum transit time" in Settings.`
    : "";
  if (state.originPoint && activeProbePoint) {
    const probe = measureProbeFromWarp(normalizedOrigin, warp, activeProbePoint);
    statusText.textContent = (station ? `Pinned near ${station.name}` : "Pinned origin") + unreachableNote;
    if (layerVisible("interactionMarkers") && probe && activeProbeScreen) {
      const roadLines =
        state.probePoint && state.roadRouteCache?.key === roadRouteCacheKey(state.originPoint, state.probePoint)
          ? formatRoadRouteLines(state.roadRouteCache.results)
          : [];
      drawHoverTooltip(drawCtx, activeProbeScreen, formatDistanceLabel(probe.baseMinutes, probe.swimMinutes), roadLines);
    }
  } else {
    statusText.textContent = nothingReachable
      ? `Pinned near ${station?.name ?? "your origin"}${unreachableNote}`
      : station
        ? `${state.showWarp ? "Warped" : "Shown"} from near ${station.name}`
        : state.showWarp
          ? "Warped commute-time view"
          : "Geographic commute-time view";
  }
  syncOriginFrequencyNote(nearest?.index ?? null);
  syncMobileSheet();
}

function drawMarker(drawCtx, screenPoint, color, glowRadius, radius, glowAlpha = 0.5) {
  const [sx, sy] = screenPoint;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const halo = drawCtx.createRadialGradient(sx, sy, 2, sx, sy, glowRadius);
  halo.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${glowAlpha})`);
  halo.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  drawCtx.fillStyle = halo;
  drawCtx.beginPath();
  drawCtx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
  drawCtx.fill();

  drawCtx.beginPath();
  drawCtx.arc(sx, sy, radius, 0, Math.PI * 2);
  drawCtx.fillStyle = "#fff7ef";
  drawCtx.fill();
  drawCtx.lineWidth = 2;
  drawCtx.strokeStyle = color;
  drawCtx.stroke();
}

function drawHoverTooltip(drawCtx, screenPoint, label, extraLines = []) {
  const [sx, sy] = screenPoint;
  drawCtx.save();
  drawCtx.textAlign = "center";
  drawCtx.textBaseline = "middle";

  const mainFont = '700 13px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  const extraFont = '600 11px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';

  drawCtx.font = mainFont;
  const mainWidth = drawCtx.measureText(label).width;
  drawCtx.font = extraFont;
  const extraWidth = extraLines.reduce((max, line) => Math.max(max, drawCtx.measureText(line).width), 0);

  const paddingX = 10;
  const paddingY = 4;
  const mainRowHeight = 20;
  const extraRowHeight = 15;
  const boxWidth = Math.max(mainWidth, extraWidth) + paddingX * 2;
  const boxHeight = paddingY * 2 + mainRowHeight + extraLines.length * extraRowHeight;
  const boxX = clamp(sx - boxWidth / 2, 12, drawCtx.canvas.clientWidth - boxWidth - 12);
  const boxY = clamp(sy + 16, 12, drawCtx.canvas.clientHeight - boxHeight - 12);

  drawCtx.fillStyle = "rgba(23, 48, 77, 0.92)";
  drawCtx.beginPath();
  drawCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
  drawCtx.fill();

  const centerX = boxX + boxWidth / 2;
  let rowTop = boxY + paddingY;

  drawCtx.font = mainFont;
  drawCtx.fillStyle = "#fff8ef";
  drawCtx.fillText(label, centerX, rowTop + mainRowHeight / 2 + 0.5);
  rowTop += mainRowHeight;

  drawCtx.font = extraFont;
  drawCtx.fillStyle = "rgba(255, 248, 239, 0.78)";
  for (const line of extraLines) {
    drawCtx.fillText(line, centerX, rowTop + extraRowHeight / 2 + 0.5);
    rowTop += extraRowHeight;
  }

  drawCtx.restore();
}

function drawPinnedLabel(drawCtx, screenPoint, label, options = {}) {
  const {
    offsetX = 18,
    offsetY = -20,
    align = "left",
  } = options;
  const [sx, sy] = screenPoint;
  drawCtx.save();
  drawCtx.font = '700 13px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  drawCtx.textAlign = "left";
  drawCtx.textBaseline = "middle";

  const metrics = drawCtx.measureText(label);
  const paddingX = 10;
  const boxWidth = metrics.width + paddingX * 2;
  const boxHeight = 28;
  const desiredX = align === "right" ? sx - offsetX - boxWidth : sx + offsetX;
  const boxX = clamp(desiredX, 12, drawCtx.canvas.clientWidth - boxWidth - 12);
  const boxY = clamp(sy + offsetY, 12, drawCtx.canvas.clientHeight - boxHeight - 12);

  drawCtx.fillStyle = "rgba(255, 248, 239, 0.96)";
  drawCtx.beginPath();
  drawCtx.roundRect(boxX, boxY, boxWidth, boxHeight, 10);
  drawCtx.fill();
  drawCtx.strokeStyle = "rgba(23, 48, 77, 0.14)";
  drawCtx.lineWidth = 1;
  drawCtx.stroke();

  drawCtx.fillStyle = "#17304d";
  drawCtx.fillText(label, boxX + paddingX, boxY + boxHeight / 2 + 0.5);
  drawCtx.restore();
}

function measureProbeFromWarp(normalizedOrigin, warp, probePoint) {
  if (!normalizedOrigin || !probePoint) return null;
  if (warp?.distances) {
    return estimateTravel(normalizedOrigin, warp.distances, probePoint);
  }
  const destination = normalizeTravelPoint(probePoint);
  const swimMinutes = normalizedOrigin.swimMinutes + destination.swimMinutes;
  const minutes = directTravelMinutes(normalizedOrigin, destination);
  return {
    minutes,
    baseMinutes: minutes - swimMinutes,
    swimMinutes,
    destination,
  };
}

function roundRectPath(drawCtx, x, y, width, height, radius) {
  drawCtx.beginPath();
  drawCtx.roundRect(x, y, width, height, radius);
}

function currentOriginSummary(fallbackStationName = "regional transit") {
  if (state.originLabel) return shortOriginLabel(state.originLabel);
  return `Near ${fallbackStationName}`;
}

function exportShareImage() {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1080;
  exportCanvas.height = 1240;
  const exportCtx = exportCanvas.getContext("2d");

  const bg = exportCtx.createLinearGradient(0, 0, 0, exportCanvas.height);
  bg.addColorStop(0, "#fbf5ea");
  bg.addColorStop(1, "#f2eadb");
  exportCtx.fillStyle = bg;
  exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  exportCtx.fillStyle = "rgba(215, 92, 46, 0.1)";
  exportCtx.beginPath();
  exportCtx.arc(180, 150, 180, 0, Math.PI * 2);
  exportCtx.fill();
  exportCtx.fillStyle = "rgba(40, 112, 129, 0.08)";
  exportCtx.beginPath();
  exportCtx.arc(930, 190, 210, 0, Math.PI * 2);
  exportCtx.fill();

  exportCtx.fillStyle = "#d75c2e";
  exportCtx.font = '700 28px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("TRANSIT TIME CARTOGRAM", 72, 86);

  exportCtx.fillStyle = "#17304d";
  exportCtx.font = '700 58px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("Chicago", 72, 146);

  const nearestSeed = state.currentRender?.warp?.seeds?.[0];
  const nearestStationName = nearestSeed ? state.data.stations[nearestSeed.index].name : "regional transit";
  const normalizedOrigin = state.originPoint ? normalizeTravelPoint(state.originPoint) : null;
  const probeMeasurement = state.probePoint
    ? measureProbeFromWarp(normalizedOrigin, state.currentRender?.warp ?? null, state.probePoint)
    : null;

  const cardX = 50;
  const cardY = 198;
  const cardSize = 980;
  roundRectPath(exportCtx, cardX, cardY, cardSize, cardSize, 38);
  exportCtx.fillStyle = "rgba(255, 252, 247, 0.92)";
  exportCtx.fill();
  exportCtx.strokeStyle = "rgba(23, 48, 77, 0.1)";
  exportCtx.lineWidth = 2;
  exportCtx.stroke();

  const inset = 28;
  const mapX = cardX + inset;
  const mapY = cardY + inset;
  const mapSize = cardSize - inset * 2;
  const sourceWidthCss = mapCanvas.clientWidth;
  const sourceHeightCss = mapCanvas.clientHeight;
  const sourceSquareCss = Math.min(sourceWidthCss, sourceHeightCss);
  const sourceXCss = (sourceWidthCss - sourceSquareCss) / 2;
  const sourceYCss = (sourceHeightCss - sourceSquareCss) / 2;
  const sourceScaleX = mapCanvas.width / Math.max(sourceWidthCss, 1);
  const sourceScaleY = mapCanvas.height / Math.max(sourceHeightCss, 1);
  roundRectPath(exportCtx, mapX, mapY, mapSize, mapSize, 28);
  exportCtx.save();
  exportCtx.clip();
  exportCtx.drawImage(
    mapCanvas,
    sourceXCss * sourceScaleX,
    sourceYCss * sourceScaleY,
    sourceSquareCss * sourceScaleX,
    sourceSquareCss * sourceScaleY,
    mapX,
    mapY,
    mapSize,
    mapSize,
  );
  if (state.originPoint && state.currentRender?.projectPoint) {
    const originScreen = state.currentRender.projectPoint(state.originPoint);
    drawPinnedLabel(
      exportCtx,
      [
        mapX + ((originScreen[0] - sourceXCss) / sourceSquareCss) * mapSize,
        mapY + ((originScreen[1] - sourceYCss) / sourceSquareCss) * mapSize,
      ],
      currentOriginSummary(nearestStationName),
    );
  }
  if (probeMeasurement && state.currentRender?.projectPoint && state.probePoint) {
    const probeScreen = state.currentRender.projectPoint(state.probePoint);
    drawHoverTooltip(
      exportCtx,
      [
        mapX + ((probeScreen[0] - sourceXCss) / sourceSquareCss) * mapSize,
        mapY + ((probeScreen[1] - sourceYCss) / sourceSquareCss) * mapSize,
      ],
      formatDistanceLabel(probeMeasurement.baseMinutes, probeMeasurement.swimMinutes),
    );
  }

  const reachability = state.currentRender?.warp?.reachability ?? null;
  if (reachability) {
    const badgeX = mapX + 26;
    const badgeY = mapY + 24;
    const badgeWidth = 310;
    const badgeHeight = 110;
    const percent = Math.round(reachability.ratio * 100);

    exportCtx.fillStyle = "rgba(255, 252, 247, 0.9)";
    exportCtx.beginPath();
    exportCtx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 22);
    exportCtx.fill();

    exportCtx.strokeStyle = "rgba(23, 48, 77, 0.12)";
    exportCtx.lineWidth = 1.5;
    exportCtx.stroke();

    const badgeMinutes = Math.round(reachability.threshold ?? currentTravelSettings().maxTransitTime);
    exportCtx.fillStyle = "#5f6f7f";
    exportCtx.font = '700 17px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
    exportCtx.fillText(`${badgeMinutes}-MINUTE REACH`, badgeX + 20, badgeY + 26);

    exportCtx.fillStyle = "#17304d";
    exportCtx.font = '700 42px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
    exportCtx.fillText(
      `${reachability.reachableStations} / ${reachability.totalStations}`,
      badgeX + 20,
      badgeY + 68,
    );

    exportCtx.fillStyle = "#5f6f7f";
    exportCtx.font = '500 18px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
    exportCtx.fillText(`${percent}% of stations within 60 min`, badgeX + 20, badgeY + 94);
  }
  exportCtx.restore();

  if (state.showHeatmap) {
    const maxTransitTime = currentTravelSettings().maxTransitTime;
    const legendWidth = 360;
    const leftLabelWidth = 50;
    const rightLabelWidth = 80;
    const legendX = cardX + cardSize - inset - legendWidth - 10;
    const legendY = cardY + cardSize - inset - 30;
    const legendLineX = legendX + leftLabelWidth;
    const legendLineY = legendY;
    const legendLineWidth = legendWidth - leftLabelWidth - rightLabelWidth;

    exportCtx.font = '600 23px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
    exportCtx.textBaseline = "middle";
    exportCtx.fillStyle = "#17304d";
    exportCtx.fillText("0m", legendX, legendY);

    const legendGradient = exportCtx.createLinearGradient(legendLineX, legendLineY, legendLineX + legendLineWidth, legendLineY);
    legendGradient.addColorStop(0, "#dc4525");
    legendGradient.addColorStop(0.18, "#f47f2e");
    legendGradient.addColorStop(0.36, "#ffc44f");
    legendGradient.addColorStop(0.58, "#f8e89c");
    legendGradient.addColorStop(0.78, "#95bcd3");
    legendGradient.addColorStop(1, "#4a678d");
    exportCtx.strokeStyle = legendGradient;
    exportCtx.lineWidth = 16;
    exportCtx.lineCap = "round";
    exportCtx.beginPath();
    exportCtx.moveTo(legendLineX, legendLineY);
    exportCtx.lineTo(legendLineX + legendLineWidth, legendLineY);
    exportCtx.stroke();

    exportCtx.textAlign = "right";
    exportCtx.fillText(`${Math.round(maxTransitTime)}m`, legendX + legendWidth, legendY);
    exportCtx.textAlign = "left";
  }

  exportCtx.fillStyle = "#17304d";
  exportCtx.font = '700 24px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("Chicago local preview", 72, 1202);

  exportCtx.textAlign = "right";
  exportCtx.fillStyle = "#5f6f7f";
  exportCtx.font = '500 12px "Avenir Next", "Helvetica Neue", Helvetica, sans-serif';
  exportCtx.fillText("Data: CTA, Metra, Pace GTFS; Chicago Data Portal; OpenStreetMap", 1008, 1202);
  exportCtx.textAlign = "left";

  return exportCanvas;
}

async function downloadShareImage() {
  shareButton.disabled = true;
  try {
    requestDraw();
    await new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    const exportCanvas = exportShareImage();
    const blob = await new Promise((resolve) => exportCanvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Failed to create share image.");
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chicago-commute-cartogram-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    shareButton.disabled = false;
  }
}

function closeSharePanel() {
  sharePanel.hidden = true;
  shareButton.setAttribute("aria-expanded", "false");
}

function setSearchMetaText(text) {
  for (const ui of searchUis) {
    ui.meta.textContent = text;
  }
}

function setSearchBusy(isBusy) {
  for (const ui of searchUis) {
    ui.button.disabled = isBusy;
    ui.button.textContent = isBusy ? "Searching" : "Search";
  }
}

function setAddressInputs(value) {
  for (const ui of searchUis) {
    ui.input.value = value;
  }
}

function closeSettingsMenus(exceptMenu = null) {
  for (const menu of settingsMenus) {
    if (menu === exceptMenu) continue;
    menu.open = false;
  }
}

function openSharePanel() {
  const shareUrl = getShareUrl();
  const shareTitle = document.title;
  const shareText = getShareText();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${shareTitle} — ${shareText}`);

  shareXAction.href = `https://x.com/intent/post?url=${encodedUrl}&text=${encodedText}`;
  shareFacebookAction.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  shareLinkedInAction.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  shareNativeRow.hidden = !navigator.share;
  sharePanel.hidden = false;
  shareButton.setAttribute("aria-expanded", "true");
}

function toggleSharePanel() {
  if (sharePanel.hidden) {
    openSharePanel();
    return;
  }
  closeSharePanel();
}

function requestDraw() {
  if (!state.ready || state.drawFrameRequested || !state.dirty) return;
  state.drawFrameRequested = true;
  window.requestAnimationFrame(() => {
    state.drawFrameRequested = false;
    if (!state.dirty) return;
    state.dirty = false;
    const { width, height } = mapCanvas.getBoundingClientRect();
    try {
      drawMap(ctx, width, height);
    } catch (error) {
      console.error(error);
      state.showWarp = false;
      state.showHeatmap = false;
      if (warpToggle) warpToggle.checked = false;
      if (mobileWarpToggle) mobileWarpToggle.checked = false;
      if (heatmapToggle) heatmapToggle.checked = false;
      if (mobileHeatmapToggle) mobileHeatmapToggle.checked = false;
      syncHeatmapLegend();
      drawGeographicMap(ctx, width, height, "Recovered geographic view. Try another point or mode.");
    }
  });
}

function syncZoomControls() {
  if (!zoomInButton || !zoomOutButton) return;
  zoomInButton.disabled = state.viewportScale >= MAX_VIEWPORT_SCALE;
  zoomOutButton.disabled = state.viewportScale <= MIN_VIEWPORT_SCALE;
}

function updateViewportTransform() {
  if (!state.data) return;
  const size = createCanvasBacking(mapCanvas);
  state.transform = buildTransform(
    state.data.meta.bounds,
    size.width,
    size.height,
    PANEL_PADDING,
    state.viewportScale,
    activeViewportCenter(),
  );
  state.baseMapCache = null;
  state.heatmapCache = null;
  state.dirty = true;
  syncZoomControls();
  syncMobileSheet();
  syncMobileHelp();
  requestDraw();
}

function setViewportScale(nextScale) {
  const clampedScale = clamp(nextScale, MIN_VIEWPORT_SCALE, MAX_VIEWPORT_SCALE);
  state.viewportScale = clampedScale;
  state.viewportCenter = clampedScale > MIN_VIEWPORT_SCALE ? currentZoomFocusPoint() : null;
  state.pinnedScreen = null;
  syncBrowserUrl();
  updateViewportTransform();
}

function resize() {
  state.isMobile = isMobileLayout();
  updateViewportTransform();
}

function pointerToWorld(event) {
  const rect = mapCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const screenPoint = [x, y];
  if (!state.currentRender) {
    return { screenPoint, worldPoint: state.transform.toWorld(x, y) };
  }
  // Screen space is fixed, but the visible geography is warped. To recover the
  // geographic point under the cursor, invert the warp currently on screen.
  const warpedWorld = state.currentRender.transform.toWorld(x, y);
  const worldPoint = state.currentRender.warp.inverseWarpPoint(warpedWorld);
  return { screenPoint, worldPoint };
}

function screenDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function currentProjectedPinPositions() {
  if (!state.currentRender?.projectPoint) {
    return { originScreen: null, probeScreen: null };
  }
  const originScreen = state.originPoint ? state.currentRender.projectPoint(state.originPoint) : null;
  const probeScreen = state.probePoint ? state.currentRender.projectPoint(state.probePoint) : null;
  return { originScreen, probeScreen };
}

function hitPinTarget(screenPoint, hitRadius = MOBILE_PIN_HIT_RADIUS) {
  const { originScreen, probeScreen } = currentProjectedPinPositions();
  if (probeScreen && screenDistance(screenPoint, probeScreen) <= hitRadius) {
    return "probe";
  }
  if (originScreen && screenDistance(screenPoint, originScreen) <= hitRadius) {
    return "origin";
  }
  return null;
}

function setProbePoint(worldPoint) {
  state.probePoint = worldPoint;
  state.probePinned = Boolean(worldPoint);
}

function clearProbePoint() {
  state.probePoint = null;
  state.probePinned = false;
  state.roadRouteCache = null;
  syncBrowserUrl();
}

function beginPinGesture(pointerId, screenPoint, worldPoint, hitRadius) {
  state.mobilePointerId = pointerId;
  state.mobileGestureStartScreen = screenPoint;
  state.mobileGestureMoved = false;

  if (state.compareModeActive) {
    state.mobileDragTarget = "compare";
    state.compareOrigin = { point: worldPoint };
    state.compareStats = null;
    state.cursorScreen = screenPoint;
    state.cursorPoint = worldPoint;
    state.showPinHint = false;
    state.dirty = true;
    return;
  }

  const hitTarget = hitPinTarget(screenPoint, hitRadius);
  state.mobileDragTarget = hitTarget || (!state.originPoint ? "new-origin" : "pan");
  state.panGestureStartScreen = null;
  state.panGestureStartOffset = state.mapPanOffset.slice();
  state.panGestureStartWorld = null;

  if (state.mobileDragTarget === "origin" || state.mobileDragTarget === "new-origin") {
    cancelFullWarpSettleFrame();
    state.originLabel = null;
    state.originPoint = worldPoint;
    state.pinned = state.mobileDragTarget === "origin" ? true : false;
    if (state.mobileDragTarget === "new-origin") {
      clearProbePoint();
    }
  } else if (state.mobileDragTarget === "probe") {
    setProbePoint(worldPoint);
  } else if (state.mobileDragTarget === "pan") {
    state.panGestureStartScreen = screenPoint.slice();
    state.panGestureStartOffset = state.mapPanOffset.slice();
    state.panGestureStartWorld = worldPoint.slice();
  }

  state.cursorScreen = screenPoint;
  state.cursorPoint = worldPoint;
  state.showPinHint = false;
  state.dirty = true;
}

function updatePinGesture(screenPoint, worldPoint, tapSlop) {
  state.mobileGestureMoved =
    state.mobileGestureMoved ||
    screenDistance(state.mobileGestureStartScreen || screenPoint, screenPoint) > tapSlop;
  state.cursorScreen = screenPoint;
  state.cursorPoint = worldPoint;

  if (state.mobileDragTarget === "pan") {
    const startScreen = state.panGestureStartScreen || screenPoint;
    state.mapPanOffset = [
      state.panGestureStartOffset[0] + screenPoint[0] - startScreen[0],
      state.panGestureStartOffset[1] + screenPoint[1] - startScreen[1],
    ];
  } else if (state.mobileDragTarget === "origin" || state.mobileDragTarget === "new-origin") {
    state.originLabel = null;
    state.originPoint = worldPoint;
  } else if (state.mobileDragTarget === "probe") {
    setProbePoint(worldPoint);
  } else if (state.mobileDragTarget === "compare") {
    state.compareOrigin = { point: worldPoint };
  }

  state.dirty = true;
  requestDraw();
}

function handleMobilePointerDown(event) {
  if (!state.isMobile) return;
  closeSharePanel();
  closeSettingsMenus();
  collapseMobileHelp();
  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (!withinBounds(worldPoint)) return;
  beginPinGesture(event.pointerId, screenPoint, worldPoint, MOBILE_PIN_HIT_RADIUS);
  mapCanvas.setPointerCapture(event.pointerId);
  requestDraw();
}

function handleMobilePointerMove(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;
  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (state.mobileDragTarget !== "pan" && !withinBounds(worldPoint)) return;
  updatePinGesture(screenPoint, worldPoint, MOBILE_PIN_TAP_SLOP);
}

function resetMobileGestureState() {
  state.mobilePointerId = null;
  state.mobileDragTarget = null;
  state.mobileGestureStartScreen = null;
  state.mobileGestureMoved = false;
  state.panGestureStartScreen = null;
  state.panGestureStartOffset = state.mapPanOffset.slice();
  state.panGestureStartWorld = null;
}

function handleMobilePointerUp(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;

  const dragTarget = state.mobileDragTarget;
  const moved = state.mobileGestureMoved;
  const shouldSettleFullWarp = moved && (dragTarget === "origin" || dragTarget === "new-origin");

  if (dragTarget === "pan" && !moved) {
    setProbePoint(state.panGestureStartWorld);
    requestRoadRoutesForProbe();
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "pan") {
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "origin" && !moved) {
    clearPinnedOrigin();
  } else if (dragTarget === "probe" && !moved) {
    clearProbePoint();
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "compare") {
    state.compareModeActive = false;
    state.compareDijkstraCache = null;
    state.dirty = true;
    syncCompareUi();
    requestDraw();
  } else {
    if (dragTarget === "origin" || dragTarget === "new-origin") {
      state.pinned = true;
      state.pinnedPoint = state.originPoint ? state.originPoint.slice() : null;
      state.pinnedScreen = state.cursorScreen ? state.cursorScreen.slice() : null;
      syncBrowserUrl();
    } else if (dragTarget === "probe") {
      state.probePinned = true;
      requestRoadRoutesForProbe();
      syncBrowserUrl();
    }
    state.dirty = true;
    syncMobileSheet();
    syncFavoritesUi();
    requestDraw();
  }

  state.cursorScreen = null;
  state.cursorPoint = null;
  try {
    mapCanvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.error(error);
  }
  resetMobileGestureState();
  if (shouldSettleFullWarp) {
    scheduleFullWarpAfterInteraction();
  }
}

function handleMobilePointerCancel(event) {
  if (!state.isMobile || state.mobilePointerId !== event.pointerId) return;
  state.cursorScreen = null;
  state.cursorPoint = null;
  resetMobileGestureState();
  state.dirty = true;
  requestDraw();
}

function handleDesktopPointerDown(event) {
  if (state.isMobile) return;
  closeSharePanel();
  closeSettingsMenus();
  collapseMobileHelp();
  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (!withinBounds(worldPoint)) return;
  beginPinGesture(event.pointerId, screenPoint, worldPoint, DESKTOP_PIN_HIT_RADIUS);
  mapCanvas.setPointerCapture(event.pointerId);
  requestDraw();
}

function handleDesktopPointerMove(event) {
  if (state.isMobile) return;
  if (state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;
  const { screenPoint, worldPoint } = pointerToWorld(event);
  if (state.mobileDragTarget !== "pan" && !withinBounds(worldPoint)) return;
  updatePinGesture(screenPoint, worldPoint, DESKTOP_PIN_TAP_SLOP);
}

function handleDesktopPointerUp(event) {
  if (state.isMobile || state.mobilePointerId !== event.pointerId || !state.mobileDragTarget) return;

  const dragTarget = state.mobileDragTarget;
  const moved = state.mobileGestureMoved;
  const shouldSettleFullWarp = moved && (dragTarget === "origin" || dragTarget === "new-origin");

  if (dragTarget === "pan" && !moved) {
    setProbePoint(state.panGestureStartWorld);
    requestRoadRoutesForProbe();
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "pan") {
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "origin" && !moved) {
    clearPinnedOrigin();
  } else if (dragTarget === "probe" && !moved) {
    clearProbePoint();
    state.dirty = true;
    requestDraw();
  } else if (dragTarget === "compare") {
    state.compareModeActive = false;
    state.compareDijkstraCache = null;
    state.dirty = true;
    syncCompareUi();
    requestDraw();
  } else {
    if (dragTarget === "origin" || dragTarget === "new-origin") {
      state.pinned = true;
      state.pinnedPoint = state.originPoint ? state.originPoint.slice() : null;
      state.pinnedScreen = null;
      syncBrowserUrl();
    } else if (dragTarget === "probe") {
      state.probePinned = true;
      requestRoadRoutesForProbe();
      syncBrowserUrl();
    }
    state.dirty = true;
    syncMobileSheet();
    syncFavoritesUi();
    requestDraw();
  }

  state.cursorScreen = null;
  state.cursorPoint = null;
  try {
    mapCanvas.releasePointerCapture(event.pointerId);
  } catch (error) {
    console.error(error);
  }
  resetMobileGestureState();
  if (shouldSettleFullWarp) {
    scheduleFullWarpAfterInteraction();
  }
}

function handleDesktopPointerCancel(event) {
  if (state.isMobile || state.mobilePointerId !== event.pointerId) return;
  state.cursorScreen = null;
  state.cursorPoint = null;
  resetMobileGestureState();
  state.dirty = true;
  requestDraw();
}

function withinBounds(point) {
  const [minX, minY, maxX, maxY] = state.data.meta.bounds;
  return point[0] >= minX && point[0] <= maxX && point[1] >= minY && point[1] <= maxY;
}

function syncHeatmapLegend() {
  const maxTransitTime = currentTravelSettings().maxTransitTime;
  heatmapLegend.hidden = !state.showHeatmap;
  heatmapLegendMin.textContent = "0m";
  heatmapLegendMax.textContent = `${Math.round(maxTransitTime)}m`;
}

function syncFullscreenButton() {
  const isFullscreen = document.fullscreenElement === panelCard;
  panelCard.classList.toggle("is-immersive", isFullscreen);
  const label = isFullscreen ? "Exit full screen" : "Enter full screen";
  fullscreenButton.setAttribute("aria-label", label);
  fullscreenButton.setAttribute("title", label);
}

function clearSearchResults() {
  for (const ui of searchUis) {
    ui.results.innerHTML = "";
  }
}

function setPinnedOrigin(worldPoint) {
  state.originPoint = worldPoint;
  state.pinnedPoint = worldPoint;
  state.pinnedScreen = null;
  state.pinned = true;
  state.cursorPoint = worldPoint;
  syncBrowserUrl();
  state.dirty = true;
  syncMobileSheet();
  syncFavoritesUi();
  syncCompareUi();
  requestDraw();
}

function clearPinnedOrigin() {
  state.pinned = false;
  state.pinnedPoint = null;
  state.pinnedScreen = null;
  clearProbePoint();
  state.cursorScreen = null;
  state.cursorPoint = null;
  state.originPoint = null;
  state.originLabel = null;
  syncBrowserUrl();
  state.dirty = true;
  syncMobileSheet();
  syncFavoritesUi();
  syncCompareUi();
  requestDraw();
}

function loadFavorites() {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.id === "string" &&
        typeof entry.label === "string" &&
        Number.isFinite(entry.lon) &&
        Number.isFinite(entry.lat),
    );
  } catch (error) {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (error) {
    // localStorage unavailable (private browsing, quota) -- favorites just won't persist.
  }
}

function addFavorite(label, lon, lat) {
  const favorites = loadFavorites();
  const entry = { id: `fav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label, lon, lat };
  favorites.unshift(entry);
  saveFavorites(favorites.slice(0, MAX_FAVORITES));
  syncFavoritesUi();
}

function removeFavorite(id) {
  const favorites = loadFavorites().filter((entry) => entry.id !== id);
  saveFavorites(favorites);
  syncFavoritesUi();
}

function currentOriginLabelForFavorite() {
  if (state.originLabel) return state.originLabel;
  const nearestSeed = state.currentRender?.warp?.seeds?.[0] ?? null;
  const nearestStation = nearestSeed ? state.data?.stations?.[nearestSeed.index] : null;
  if (nearestStation) return `Near ${nearestStation.name}`;
  return "Pinned origin";
}

function syncFavoritesUi() {
  const favorites = loadFavorites();
  for (const ui of favoritesUis) {
    if (!ui.saveButton || !ui.list) continue;
    ui.saveButton.disabled = !state.pinned || !state.originPoint;
    ui.list.innerHTML = "";
    if (ui.empty) {
      ui.empty.hidden = favorites.length > 0;
      ui.list.appendChild(ui.empty);
    }
    for (const favorite of favorites) {
      const chip = document.createElement("span");
      chip.className = "favorite-chip";

      const nameButton = document.createElement("button");
      nameButton.type = "button";
      nameButton.className = "favorite-chip-name";
      nameButton.textContent = favorite.label;
      nameButton.title = `Pin origin to ${favorite.label}`;
      nameButton.addEventListener("click", () => {
        const worldPoint = lonLatToWorld(favorite.lon, favorite.lat);
        if (!withinBounds(worldPoint)) return;
        state.originLabel = favorite.label;
        setAddressInputs(favorite.label);
        setPinnedOrigin(worldPoint);
      });

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "favorite-chip-remove";
      removeButton.textContent = "×";
      removeButton.setAttribute("aria-label", `Remove favorite ${favorite.label}`);
      removeButton.addEventListener("click", () => removeFavorite(favorite.id));

      chip.appendChild(nameButton);
      chip.appendChild(removeButton);
      ui.list.appendChild(chip);
    }
  }
}

function handleSaveFavoriteClick() {
  if (!state.pinned || !state.originPoint) return;
  const suggested = currentOriginLabelForFavorite();
  const label = window.prompt("Name this favorite:", suggested);
  if (!label) return;
  const { lon, lat } = worldToLonLat(state.originPoint);
  addFavorite(label.trim().slice(0, 60) || suggested, lon, lat);
}

function syncMobileSheet() {
  if (!mobileOriginTitle || !mobileStatusText || !mobileClearButton) return;

  const nearestSeed = state.currentRender?.warp?.seeds?.[0] ?? null;
  const nearestStation = nearestSeed ? state.data?.stations?.[nearestSeed.index] : null;

  if (!state.pinned || !state.originPoint) {
    mobileOriginTitle.textContent = state.cursorScreen ? "Release to pin the origin" : "Drag to preview an origin";
    mobileStatusText.textContent =
      "Touch and drag on the map to preview your starting point. Release to pin it, then drag again to measure commute times elsewhere.";
    mobileClearButton.hidden = true;
    return;
  }

  mobileOriginTitle.textContent = state.originLabel || (nearestStation ? `Pinned near ${nearestStation.name}` : "Pinned origin");
  mobileStatusText.textContent = state.probePoint
    ? "Drag either pin to reposition it. Tap a pin without dragging to remove it."
    : nearestStation
      ? `Commute times are anchored near ${nearestStation.name}. Drag on the map to place a "distance to here" pin.`
      : 'Commute times are anchored to this origin. Drag on the map to place a "distance to here" pin.';
  mobileClearButton.hidden = false;
}

function renderSearchResults(results) {
  clearSearchResults();
  if (!results.length) {
    setSearchMetaText("No Chicago-area address matches found.");
    return;
  }
  setSearchMetaText("Choose a result to pin the origin there.");
  const markup = results
    .map(
      (result, index) => `
        <button class="search-result" type="button" data-result-index="${index}">
          <strong>${escapeHtml(result.title)}</strong>
          <span>${escapeHtml(result.subtitle)}</span>
        </button>
      `,
    )
    .join("");

  for (const ui of searchUis) {
    ui.results.innerHTML = markup;
    for (const button of ui.results.querySelectorAll(".search-result")) {
      button.addEventListener("click", () => {
        const result = results[Number(button.dataset.resultIndex)];
        const worldPoint = lonLatToWorld(result.lon, result.lat);
        if (!withinBounds(worldPoint)) {
          setSearchMetaText("That result fell outside the current Chicago map bounds.");
          return;
        }
        setAddressInputs(result.title);
        setSearchMetaText(`Pinned origin to ${result.title}.`);
        clearSearchResults();
        state.originLabel = shortOriginLabel(result.title);
        setPinnedOrigin(worldPoint);
      });
    }
  }
}

function lonLatToWorld(lon, lat) {
  const metersPerDegLat = 111_320.0;
  const metersPerDegLon = metersPerDegLat * Math.cos((state.data.meta.lat0 * Math.PI) / 180);
  return [lon * metersPerDegLon, lat * metersPerDegLat];
}

async function searchAddress(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "us",
    limit: "5",
    bounded: "1",
    // Matches the actual modeled region (state.data.meta.bounds converted back
    // to lon/lat), not just Chicago proper -- the old box (roughly the city
    // limits) silently dropped results for anywhere the transit network
    // actually reaches: Evanston and points further up the North Shore, the
    // far west suburbs, the far south suburbs. Also, the query text used to
    // have ", Chicago, IL" appended unconditionally, which broke suburb
    // searches outright (e.g. "..., Evanston, IL, Chicago, IL" matches
    // nothing) -- the viewbox alone is enough to keep results regional.
    viewbox: "-88.70,42.65,-87.45,41.35",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }
  const payload = await response.json();
  return payload.map((item) => ({
    title: item.display_name.split(",").slice(0, 2).join(",").trim(),
    subtitle: item.display_name,
    lat: Number(item.lat),
    lon: Number(item.lon),
  }));
}

function setLocateButtonsBusy(isBusy) {
  const label = isBusy ? "Locating…" : "Use My Location";
  for (const button of [mobileLocateButton, mobileInstructionsLocateButton]) {
    if (!button) continue;
    button.disabled = isBusy;
    button.textContent = label;
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setSearchMetaText("Location access is not available on this device.");
    return;
  }

  setLocateButtonsBusy(true);
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocateButtonsBusy(false);
      const worldPoint = lonLatToWorld(position.coords.longitude, position.coords.latitude);
      if (!withinBounds(worldPoint)) {
        setSearchMetaText("That location falls outside the current Chicago map bounds.");
        return;
      }
      state.originLabel = "My location";
      setPinnedOrigin(worldPoint);
      setSearchMetaText("Pinned origin to your current location.");
    },
    (error) => {
      console.error(error);
      setLocateButtonsBusy(false);
      setSearchMetaText("Could not access your location. Check permissions and try again.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  );
}

async function init() {
  // Layer-visibility debug panel is a dev tool, not something regular
  // visitors need -- and on narrow screens it overlapped the "How It Works"
  // card. Keep it available for development via ?debug=1, hidden otherwise.
  if (debugLayerPanel && !new URLSearchParams(window.location.search).has("debug")) {
    debugLayerPanel.hidden = true;
  }

  const response = await fetch(DATA_URL);
  state.data = await response.json();
  state.travelSettingsDefaults = getTravelSettingsDefaults();
  state.travelSettings = sanitizeTravelSettings(loadStoredTravelSettings(), state.travelSettingsDefaults);
  state.dynamicAdjacencyCache = new Array(state.data.routeStates.length);
  state.isMobile = isMobileLayout();
  state.baseMapCache = null;
  // Pre-warm the cell/station surface classification caches while the
  // "Loading transit network..." status is still showing. Both caches are
  // keyed by fixed geometry (grid cell / station points never change), so
  // this cost only needs to happen once, ever -- doing it here means it
  // lands during the expected load wait instead of surfacing later as an
  // unexplained freeze the first time reachability runs against a station
  // set it hasn't seen yet (e.g. right after switching on Bus/Pace).
  for (let cellIndex = 0; cellIndex < state.data.cells.length; cellIndex += 1) {
    normalizedCellPoint(cellIndex);
  }
  for (let stationIndex = 0; stationIndex < state.data.stations.length; stationIndex += 1) {
    normalizedStationPoint(stationIndex);
  }
  state.ready = true;

  state.cursorPoint = null;
  state.originPoint = null;

  const sharedView = parseSharedView();
  const hasSharedViewParams =
    Boolean(sharedView.origin) ||
    Boolean(sharedView.probe) ||
    sharedView.warp !== null ||
    sharedView.heatmap !== null ||
    sharedView.outline !== null ||
    sharedView.modes !== null;
  state.mobileHelpCollapsed = hasSharedViewParams;
  if (sharedView.zoom) {
    state.viewportScale = sharedView.zoom;
  }
  if (sharedView.warp !== null) {
    state.showWarp = sharedView.warp;
  }
  if (sharedView.heatmap !== null) {
    state.showHeatmap = sharedView.heatmap;
  }
  if (sharedView.outline !== null) {
    state.showReachOutline = sharedView.outline;
  }
  if (sharedView.modes !== null) {
    state.activeModes = sharedView.modes;
  }
  if (sharedView.origin) {
    const restoredPoint = lonLatToWorld(sharedView.origin.lon, sharedView.origin.lat);
    if (withinBounds(restoredPoint)) {
      state.originPoint = restoredPoint;
      state.pinnedPoint = restoredPoint;
      state.cursorPoint = restoredPoint;
      state.pinned = true;
      if (sharedView.probe) {
        const restoredProbe = lonLatToWorld(sharedView.probe.lon, sharedView.probe.lat);
        if (withinBounds(restoredProbe)) {
          state.probePoint = restoredProbe;
          state.probePinned = true;
          requestRoadRoutesForProbe();
        }
      }
    }
  }

  warpToggle.checked = state.showWarp;
  heatmapToggle.checked = state.showHeatmap;
  outlineToggle.checked = state.showReachOutline;
  syncTravelModeToggles();
  syncDebugLayerAvailability();
  syncDebugLayerToggles();
  syncTravelSettingsInputs();
  syncHeatmapLegend();
  syncZoomControls();

  resize();
  window.addEventListener("resize", resize);

  mobileWarpToggle.checked = state.showWarp;
  mobileHeatmapToggle.checked = state.showHeatmap;
  mobileOutlineToggle.checked = state.showReachOutline;
  syncTravelModeToggles();

  for (const menu of settingsMenus) {
    menu.addEventListener("toggle", () => {
      if (menu.open) {
        closeSharePanel();
        closeSettingsMenus(menu);
      }
    });
  }

  for (const input of settingsInputs) {
    input.addEventListener("input", () => {
      const key = input.dataset.settingKey;
      const unit = input.dataset.settingUnit;
      if (!key || !unit) return;
      const rawValue = Number(input.value);
      if (!Number.isFinite(rawValue)) {
        syncTravelSettingsInputs();
        return;
      }
      const current = currentTravelSettings();
      const nextSettings = {
        ...current,
        [key]: unit === "mph" ? mphToMetersPerMinute(rawValue) : rawValue,
      };
      applyTravelSettings(nextSettings);
    });
  }

  for (const button of settingsResetButtons) {
    button.addEventListener("click", () => {
      applyTravelSettings(state.travelSettingsDefaults);
    });
  }

  for (const button of timeBudgetPresetButtons) {
    button.addEventListener("click", () => {
      const minutes = Number(button.dataset.presetMinutes);
      if (!Number.isFinite(minutes)) return;
      applyTravelSettings({ ...currentTravelSettings(), maxTransitTime: minutes });
    });
  }

  for (const toggle of flatWaitToggles) {
    toggle.addEventListener("change", () => {
      applyTravelSettings({ ...currentTravelSettings(), useFlatWait: toggle.checked });
    });
  }

  for (const button of settingsSaveButtons) {
    button.addEventListener("click", () => {
      const menu = button.closest(".settings-menu");
      if (menu) {
        menu.open = false;
      }
    });
  }

  for (const toggle of travelModeToggles) {
    toggle.addEventListener("change", () => {
      closeSharePanel();
      setTravelMode(toggle.dataset.modeToggle, toggle.checked);
    });
  }

  for (const toggle of debugLayerToggles) {
    toggle.addEventListener("change", () => {
      setLayerVisibility(toggle.dataset.layerToggle, toggle.checked);
    });
  }

  mapCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (state.isMobile) {
      handleMobilePointerDown(event);
      return;
    }
    handleDesktopPointerDown(event);
  });

  mapCanvas.addEventListener("pointermove", (event) => {
    if (state.isMobile) {
      handleMobilePointerMove(event);
      return;
    }
    handleDesktopPointerMove(event);
  });

  mapCanvas.addEventListener("pointerup", (event) => {
    event.preventDefault();
    if (state.isMobile) {
      handleMobilePointerUp(event);
      return;
    }
    handleDesktopPointerUp(event);
  });

  mapCanvas.addEventListener("pointercancel", (event) => {
    if (state.isMobile) {
      handleMobilePointerCancel(event);
      return;
    }
    handleDesktopPointerCancel(event);
  });

  mapCanvas.addEventListener("pointerleave", () => {
    closeSharePanel();
    if (state.isMobile || state.mobileDragTarget) return;
    state.cursorScreen = null;
    state.cursorPoint = null;
    state.dirty = true;
    requestDraw();
  });

  heatmapToggle.addEventListener("change", () => {
    closeSharePanel();
    state.showHeatmap = heatmapToggle.checked;
    mobileHeatmapToggle.checked = state.showHeatmap;
    syncHeatmapLegend();
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  warpToggle.addEventListener("change", () => {
    closeSharePanel();
    state.showWarp = warpToggle.checked;
    mobileWarpToggle.checked = state.showWarp;
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  mobileHeatmapToggle.addEventListener("change", () => {
    state.showHeatmap = mobileHeatmapToggle.checked;
    heatmapToggle.checked = state.showHeatmap;
    syncHeatmapLegend();
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  mobileWarpToggle.addEventListener("change", () => {
    state.showWarp = mobileWarpToggle.checked;
    warpToggle.checked = state.showWarp;
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  outlineToggle.addEventListener("change", () => {
    closeSharePanel();
    state.showReachOutline = outlineToggle.checked;
    mobileOutlineToggle.checked = state.showReachOutline;
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  mobileOutlineToggle.addEventListener("change", () => {
    state.showReachOutline = mobileOutlineToggle.checked;
    outlineToggle.checked = state.showReachOutline;
    syncBrowserUrl();
    state.dirty = true;
    requestDraw();
  });

  zoomOutButton.addEventListener("click", () => {
    closeSharePanel();
    closeSettingsMenus();
    setViewportScale(state.viewportScale / VIEWPORT_ZOOM_STEP);
  });

  zoomInButton.addEventListener("click", () => {
    closeSharePanel();
    closeSettingsMenus();
    setViewportScale(state.viewportScale * VIEWPORT_ZOOM_STEP);
  });

  fullscreenButton.addEventListener("click", async () => {
    closeSharePanel();
    closeSettingsMenus();
    try {
      if (document.fullscreenElement === panelCard) {
        await document.exitFullscreen();
      } else {
        await panelCard.requestFullscreen();
      }
    } catch (error) {
      console.error(error);
    } finally {
      syncFullscreenButton();
      resize();
    }
  });

  document.addEventListener("fullscreenchange", () => {
    syncFullscreenButton();
    resize();
  });

  shareButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeSettingsMenus();
    toggleSharePanel();
  });

  nativeShareAction.addEventListener("click", async () => {
    try {
      await navigator.share({
        title: document.title,
        text: getShareText(),
        url: getShareUrl(),
      });
      closeSharePanel();
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error(error);
        setSearchMetaText("Could not open the share sheet. Try another option.");
      }
    }
  });

  downloadImageAction.addEventListener("click", () => {
    closeSharePanel();
    downloadShareImage().catch((error) => {
      console.error(error);
      setSearchMetaText("Could not save the image. Try again.");
      shareButton.disabled = false;
    });
  });

  shareInstagramAction.addEventListener("click", async () => {
    closeSharePanel();
    try {
      await navigator.clipboard.writeText(getShareUrl());
      await downloadShareImage();
      setSearchMetaText("Image downloaded and link copied for Instagram.");
    } catch (error) {
      console.error(error);
      setSearchMetaText("Could not prep the Instagram share. Try again.");
      shareButton.disabled = false;
    }
  });

  for (const link of [shareXAction, shareFacebookAction, shareLinkedInAction]) {
    link.addEventListener("click", () => {
      closeSharePanel();
    });
  }

  document.addEventListener("click", (event) => {
    const clickedInsideShare = sharePanel.contains(event.target) || shareButton.contains(event.target);
    if (!sharePanel.hidden && !clickedInsideShare) {
      closeSharePanel();
    }

    const clickedInsideSettings = settingsMenus.some(
      (menu) => menu.contains(event.target),
    );
    if (!clickedInsideSettings) {
      closeSettingsMenus();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !sharePanel.hidden) {
      closeSharePanel();
    }
    if (event.key === "Escape") {
      closeSettingsMenus();
    }
  });

  for (const ui of searchUis) {
    ui.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const query = ui.input.value.trim();
      if (!query) {
        setSearchMetaText("Enter a Chicago-area address to search.");
        clearSearchResults();
        return;
      }

      setSearchBusy(true);
      setSearchMetaText("Looking up Chicago-area address matches…");
      clearSearchResults();

      try {
        const results = await searchAddress(query);
        renderSearchResults(results);
      } catch (error) {
        console.error(error);
        setSearchMetaText("Address lookup failed. Try a more specific Chicago-area address.");
      } finally {
        setSearchBusy(false);
      }
    });
  }

  mobileClearButton.addEventListener("click", () => {
    clearPinnedOrigin();
    setSearchMetaText("Origin cleared. Tap the map or search for a new starting point.");
  });

  if (saveFavoriteButton) saveFavoriteButton.addEventListener("click", handleSaveFavoriteClick);
  if (mobileSaveFavoriteButton) mobileSaveFavoriteButton.addEventListener("click", handleSaveFavoriteClick);
  syncFavoritesUi();

  if (compareToggleButton) compareToggleButton.addEventListener("click", handleCompareToggleClick);
  if (mobileCompareToggleButton) mobileCompareToggleButton.addEventListener("click", handleCompareToggleClick);
  syncCompareUi();

  mobileLocateButton.addEventListener("click", () => {
    collapseMobileHelp();
    useCurrentLocation();
  });

  mobileShareButton.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: getShareText(),
          url: getShareUrl(),
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setSearchMetaText("Could not open the share sheet. Try the share icon instead.");
        }
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setSearchMetaText("Share link copied to your clipboard.");
    } catch (error) {
      console.error(error);
      setSearchMetaText("Could not copy the share link. Try again.");
    }
  });

  mobileSheetToggle.addEventListener("click", () => {
    if (state.mobileDrawerDidSwipe) {
      state.mobileDrawerDidSwipe = false;
      return;
    }
    setDrawerCollapsed(!state.drawerCollapsed);
  });

  mobileSheetToggle.addEventListener("pointerdown", (event) => {
    beginMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointermove", (event) => {
    updateMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointerup", (event) => {
    endMobileDrawerGesture(event);
  });

  mobileSheetToggle.addEventListener("pointercancel", (event) => {
    cancelMobileDrawerGesture(event);
  });

  mobileInstructionsLocateButton.addEventListener("click", () => {
    collapseMobileHelp();
    useCurrentLocation();
  });

  mobileMapInstructions.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("#mobileInstructionsLocateButton")) {
      return;
    }
    collapseMobileHelp();
  });

  mobileHelpBubble.addEventListener("click", () => {
    expandMobileHelp();
  });

  setupFooterEmojiBursts();
  syncFullscreenButton();
  syncMobileSheet();
  syncMobileHelp();
  setDrawerCollapsed(true);
}

init().catch((error) => {
  console.error(error);
  statusText.textContent = "Failed to load transit map data.";
});
