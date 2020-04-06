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
    "circle-radius": 5,
    "circle-color": ["get", "color"] as Expression,
  },
  filter: ["==", "Point", ["geometry-type"]],
};
