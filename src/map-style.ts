// eslint-disable-next-line import/no-extraneous-dependencies
import { Expression } from "mapbox-gl";

export const routeLineLayer = {
  id: "route-line",
  type: "line",
  paint: {
    "line-opacity": 0.5,
    "line-width": 5
  }
};

export const routePointLayer = {
  id: "route-point",
  type: "circle",
  paint: {
    "circle-radius": 5,
    "circle-color": ["get", "color"] as Expression
  },
  filter: ["==", "Point", ["geometry-type"]]
};
