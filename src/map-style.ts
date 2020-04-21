// eslint-disable-next-line import/no-extraneous-dependencies
import { Expression } from "mapbox-gl";

export const routeLineLayer = {
  id: "route-line",
  type: "line",
  paint: {
    "line-opacity": ["coalesce", ["get", "opacity"], 0.5] as Expression,
    "line-width": 5,
    "line-color": ["get", "color"] as Expression,
  },
};

export const routePointLayer = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-opacity": ["coalesce", ["get", "opacity"], 1] as Expression,
    "circle-radius": 5,
    "circle-color": ["get", "color"] as Expression,
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const allEntrancesLayer = {
  id: "entrance-point",
  "source-layer": "osm",
  type: "circle",
  minzoom: 12,
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      12, // At zoom 12 or less,
      1, // circle radius is 1.
      14, // At zoom 14,
      3, // circle radius is 3.
      15, // At zoom 15 or more,
      5, // circle radius is 5.
    ] as Expression,
    "circle-color": "#64be14",
  },
  filter: ["has", "entrance"],
};

export const allEntrancesSymbolLayer = {
  id: "entrance-symbol",
  "source-layer": "osm",
  type: "symbol",
  minzoom: 15,
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": [
      "coalesce",
      ["get", "ref"],
      ["get", "addr:unit"],
    ] as Expression,
    "text-anchor": ("center" as unknown) as Expression,
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -0.05],
  },
  filter: ["has", "entrance"],
};

export const routePointSymbolLayer = {
  id: "route-point-symbol",
  type: "symbol",
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": ["get", "ref"] as Expression,
    "text-anchor": ("center" as unknown) as Expression,
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -0.05],
  },
  filter: ["==", "Point", ["geometry-type"]],
};
