import type { LayerProps } from "react-map-gl";

export const routeLineLayer: LayerProps = {
  id: "route-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "opacity"], 0.8],
    "line-width": 2,
    "line-color": ["get", "color"],
  },
  filter: ["!", ["coalesce", ["get", "imaginary"], false]],
};

export const routeImaginaryLineLayer: LayerProps = {
  id: "route-imaginary-line",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-opacity": ["coalesce", ["get", "opacity"], 0.5],
    "line-width": 5,
    "line-color": ["get", "color"],
    "line-dasharray": [0, 2],
  },
  filter: ["coalesce", ["get", "imaginary"], false],
};

export const routePointLayer: LayerProps = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-opacity": ["coalesce", ["get", "opacity"], 1],
    "circle-radius": 5,
    "circle-color": ["get", "color"],
  },
  filter: ["==", "Point", ["geometry-type"]],
};

export const allEntrancesLayer: LayerProps = {
  id: "entrance-point",
  type: "circle",
  minzoom: 12,
  maxzoom: 15.99999,
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
    ],
    "circle-color": "#64be14",
  },
  filter: ["has", "entrance"],
};

export const allEntrancesSymbolLayer: LayerProps = {
  id: "entrance-symbol",
  type: "symbol",
  minzoom: 16,
  paint: {
    "text-color": "#fff",
    "text-halo-color": "#64be14",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": ["coalesce", ["get", "ref"], ["get", "addr:unit"]],
    "text-anchor": "center",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -1.3],
    "icon-image": "icon-pin-48-#64be14-#fff",
    "icon-anchor": "bottom",
    "icon-allow-overlap": true,
    "text-allow-overlap": true,
  },
  filter: ["has", "entrance"],
};

export const routePointSymbolLayer: LayerProps = {
  id: "route-point-symbol",
  type: "symbol",
  paint: {
    "text-color": "#000",
    "text-halo-color": "#fff",
    "text-halo-width": 3,
  },
  layout: {
    "text-field": ["get", "ref"],
    "text-anchor": "center",
    "text-font": ["Klokantech Noto Sans Regular"],
    "text-size": 24,
    "text-offset": [0, -0.05],
  },
  filter: ["==", "Point", ["geometry-type"]],
};
