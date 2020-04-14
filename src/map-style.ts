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
